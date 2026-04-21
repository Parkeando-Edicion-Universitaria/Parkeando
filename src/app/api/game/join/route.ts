import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-middleware';
import {
  getActiveGame,
  addSpectator,
  GAME_CONSTANTS,
  GameStatus,
} from '@/lib/game-manager';
import { PLAYER_ICONS } from '@/types/game';
import { sanitizeInput, checkRateLimit } from '@/lib/security';
import { getServiceSupabase } from '@/lib/supabase';

// Schema de validación
const joinSchema = z.object({
  username: z.string().min(3).max(50),
});

async function handler(req: NextRequest) {
  const initIp = req.headers.get('x-forwarded-for') || 'unknown';
  const ip = initIp.split(',')[0].trim();
  if (!(await checkRateLimit(`join_game_${ip}`, 10, 60000))) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  const supabase = getServiceSupabase();
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Ignorar si el body está vacío, z.object().parse fallará amigablemente o le inyectamos respaldo
    }

    const userId = (req as any).user.userId;
    // Si no enviaron username en el body, usamos el de su registro
    let reqUsername = body.username as string | undefined;
    if (!reqUsername || reqUsername.trim() === '') {
      const { data: ud } = await supabase.from('users').select('username').eq('id', userId).single();
      reqUsername = ud?.username || 'Invitado';
    }

    const validated = joinSchema.parse({ username: reqUsername });

    // Sanitizar username
    const username = sanitizeInput(validated.username);

    // --- LIMPIEZA DE JUGADORES INACTIVOS (PRESENCIA) ---
    // Ejecutar limpieza solo el 10% de las veces para no sobrecargar el DB en concurrencia
    if (Math.random() < 0.1) {
      const staleTime = new Date(Date.now() - 120000).toISOString(); // 2 minutos de gracia

      const { data: stalePlayers } = await supabase
        .from('game_players')
        .select('user_id, game_id')
        .in('status', ['active', 'disconnected'])
        .lt('last_action_at', staleTime)
        .order('last_action_at', { ascending: true })
        .limit(25);

      if (stalePlayers && stalePlayers.length > 0) {
        console.log(`[Join Cleanup] Limpiando ${stalePlayers.length} jugadores inactivos`);

        for (const p of stalePlayers) {
          await supabase.from('game_players').delete().eq('user_id', p.user_id).eq('game_id', p.game_id);

          const { data: g } = await supabase.from('games').select('queue').eq('id', p.game_id).single();
          if (g?.queue && g.queue[p.user_id]) {
            const newQueue = { ...g.queue };
            delete newQueue[p.user_id];
            delete newQueue._startCountdownAt;
            await supabase.from('games').update({ queue: newQueue }).eq('id', p.game_id);
          }
        }
      }
    }
    // --- FIN DE LIMPIEZA ---

    // Obtener partida activa
    let activeGame = await getActiveGame();

    // Si no hay partida activa, crear una nueva
    if (!activeGame) {
      const { data: newGame, error } = await supabase
        .from('games')
        .insert({
          status: GameStatus.WAITING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Race condition: Otro request creó la partida al mismo tiempo.
        // Intentar obtener la partida que ya existe en lugar de fallar.
        if ((error as any).code === '23505' || error.message?.includes('duplicate')) {
          activeGame = await getActiveGame();
          if (!activeGame) {
            return NextResponse.json({ error: 'Error al crear o encontrar partida' }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: 'Error al crear partida' }, { status: 500 });
        }
      }

      // Obtener equipo
      const { data: userProps } = await supabase.from('users').select('equipped').eq('id', userId).single();
      const equipped = userProps?.equipped || { avatar: 'car_1', border: null, title: null };

      // Agregar jugador a la nueva partida
      const { data: player, error: playerError } = await supabase
        .from('game_players')
        .insert({
          game_id: newGame.id,
          user_id: userId,
          username,
          position: 0,
          points: 0,
          status: 'active',
          joined_at: new Date().toISOString(),
          last_action_at: new Date().toISOString(),
          color: getPlayerColor(0),
          icon: JSON.stringify(equipped),
        })
        .select()
        .single();

      if (playerError || !player) {
        return NextResponse.json(
          { error: 'Error al unirse a la partida' },
          { status: 500 }
        );
      }

      // Establecer como turno inicial
      await supabase
        .from('games')
        .update({
          current_turn: player.user_id,
          turn_start_time: new Date().toISOString(),
        })
        .eq('id', newGame.id);

      return NextResponse.json({
        success: true,
        gameId: newGame.id,
        playerId: player.id,
        status: 'joined',
        message: 'Partida creada. Esperando más jugadores...',
        waitingForPlayers: true,
        currentPlayers: 1,
        maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
      });
    }

    // Hay una partida activa
    if (activeGame.status === GameStatus.IN_PROGRESS) {
      // Partida en curso - agregar como espectador
      await addSpectator(activeGame.id, userId);

      return NextResponse.json({
        success: true,
        gameId: activeGame.id,
        status: 'spectator',
        message: 'Hay una partida en curso. Puedes ver el progreso como espectador.',
        canJoin: false,
        currentPlayers: activeGame.players.length,
        spectators: activeGame.spectators.length + 1,
      });
    }

    // Partida en espera - verificar si puede unirse
    if (activeGame.players.length >= GAME_CONSTANTS.MAX_PLAYERS) {
      // Partida llena - agregar como espectador
      await addSpectator(activeGame.id, userId);

      return NextResponse.json({
        success: true,
        gameId: activeGame.id,
        status: 'spectator',
        message: 'La partida está llena. Puedes ver el progreso como espectador.',
        canJoin: false,
        currentPlayers: activeGame.players.length,
        maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
      });
    }

    // Verificar si el usuario ya está en la partida
    const existingPlayer = activeGame.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      return NextResponse.json({
        success: true,
        gameId: activeGame.id,
        playerId: existingPlayer.id,
        status: 'already_joined',
        message: 'Ya estás en esta partida',
        currentPlayers: activeGame.players.length,
        maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
      });
    }

    // Obtener equipo del jugador que se une a una partida existente
    const { data: joiningUserProps } = await supabase.from('users').select('equipped').eq('id', userId).single();
    const joiningEquipped = joiningUserProps?.equipped || { avatar: PLAYER_ICONS[activeGame.players.length % PLAYER_ICONS.length], border: null, title: null };

    // Unirse a la partida en espera
    const { data: player, error: playerError } = await supabase
      .from('game_players')
      .insert({
        game_id: activeGame.id,
        user_id: userId,
        username,
        position: 0,
        points: 0,
        status: 'active',
        joined_at: new Date().toISOString(),
        last_action_at: new Date().toISOString(),
        color: getPlayerColor(activeGame.players.length),
        icon: JSON.stringify(joiningEquipped),
      })
      .select()
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Error al unirse a la partida' },
        { status: 500 }
      );
    }

    // Blindaje anti-race: si múltiples usuarios entran al mismo tiempo,
    // validar el conteo real y mover a espectador al excedente.
    const { data: activePlayersNow } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', activeGame.id)
      .eq('status', 'active');

    const currentActiveCount = activePlayersNow?.length ?? 0;
    if (currentActiveCount > GAME_CONSTANTS.MAX_PLAYERS) {
      await supabase
        .from('game_players')
        .delete()
        .eq('id', player.id)
        .eq('user_id', userId);

      await addSpectator(activeGame.id, userId);

      return NextResponse.json({
        success: true,
        gameId: activeGame.id,
        status: 'spectator',
        message: 'La partida alcanzó su cupo máximo en este instante. Entraste como espectador.',
        canJoin: false,
        currentPlayers: GAME_CONSTANTS.MAX_PLAYERS,
        maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
      });
    }

    const newPlayerCount = activeGame.players.length + 1;

    // En lugar de autoiniciar, dependemos de que los jugadores se marquen como "Listos"
    return NextResponse.json({
      success: true,
      gameId: activeGame.id,
      playerId: player.id,
      status: 'joined',
      message: `Te uniste a la partida. Pulsa "Estoy Listo". (${newPlayerCount}/${GAME_CONSTANTS.MAX_PLAYERS})`,
      waitingForPlayers: true,
      currentPlayers: newPlayerCount,
      maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error en join:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Colores para los jugadores
function getPlayerColor(index: number): string {
  const colors = [
    '#DA291C', // Rojo Panamá
    '#0033A0', // Azul Panamá
    '#FFD100', // Amarillo Panamá
    '#00A651', // Verde Panamá
    '#FF6B35', // Naranja
    '#9B59B6', // Púrpura
  ];
  return colors[index % colors.length];
}

export const POST = withAuth(handler);
