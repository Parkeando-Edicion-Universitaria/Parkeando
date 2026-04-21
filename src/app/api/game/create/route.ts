import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { PLAYER_COLORS, PLAYER_ICONS } from '@/types/game';
import { checkRateLimit } from '@/lib/security';

export const POST = withAuth(async (req) => {
  const initIp = req.headers.get('x-forwarded-for') || 'unknown';
  const ip = initIp.split(',')[0].trim();
  if (!(await checkRateLimit(`create_game_${ip}`, 3, 60000))) {
    return NextResponse.json({ error: 'Espera un minuto para crear otra partida.' }, { status: 429 });
  }

  try {
    const user = req.user!;

    const db = getServiceSupabase();
    // Verificar si ya hay un juego activo
    const { data: activeGame } = await db
      .from('games')
      .select('id')
      .in('status', ['waiting', 'in_progress'])
      .single();

    if (activeGame) {
      return NextResponse.json(
        { error: 'Ya hay un juego activo. Únete a él o espera a que termine.' },
        { status: 409 }
      );
    }

    // Crear nuevo juego
    const { data: newGame, error: gameError } = await db
      .from('games')
      .insert({
        status: 'waiting',
        max_players: 6,
      })
      .select()
      .single();

    if (gameError || !newGame) {
      throw new Error('Error al crear juego');
    }

    // Obtener datos del usuario (username y equipo)
    const { data: userProps } = await db.from('users').select('username, equipped').eq('id', user.userId).single();
    const equipped = userProps?.equipped || { avatar: PLAYER_ICONS[0], border: null, title: null };
    const username = userProps?.username || user.email.split('@')[0];

    // Agregar al creador como primer jugador
    const { data: player, error: playerError } = await db
      .from('game_players')
      .insert({
        user_id: user.userId,
        game_id: newGame.id,
        username,
        color: PLAYER_COLORS[0],
        icon: JSON.stringify(equipped),
      })
      .select()
      .single();

    if (playerError) {
      throw new Error('Error al agregar jugador');
    }

    // Establecer como turno inicial al anfitrión
    await db
      .from('games')
      .update({
        current_turn: user.userId,
        turn_start_time: new Date().toISOString(),
      })
      .eq('id', newGame.id);

    return NextResponse.json({
      game: newGame,
      player,
    });
  } catch (error: any) {
    console.error('Error en create game:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});
