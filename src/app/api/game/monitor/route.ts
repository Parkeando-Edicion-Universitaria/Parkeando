import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveGame,
  removeInactivePlayers,
  removeInactiveWaitingPlayers,
  isTurnExpired,
  nextTurn,
  GameStatus,
} from '@/lib/game-manager';
import { getServiceSupabase } from '@/lib/supabase';

const getCronAuthError = (req: NextRequest): NextResponse | null => {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado' },
      { status: 503 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  return null;
};

/**
 * API de monitoreo - Se ejecuta periódicamente para:
 * 1. Remover jugadores inactivos (tiempo agotado)
 * 2. Pasar turno si ha expirado
 * 3. Verificar estado del juego
 * 
 * Debe ser llamada por un cron job o desde el cliente cada X segundos
 */
export async function GET(req: NextRequest) {
  try {
    const db = getServiceSupabase();

    const authError = getCronAuthError(req);
    if (authError) {
      return authError;
    }

    const game = await getActiveGame();

    if (!game) {
      return NextResponse.json({
        message: 'No hay partida activa',
        action: 'none',
      });
    }

    const actions: string[] = [];

    // Sala de espera: expulsar jugadores AFK sin necesitar la página abierta
    if (game.status === GameStatus.WAITING) {
      const inactiveWaiting = await removeInactiveWaitingPlayers(game.id);
      if (inactiveWaiting.length > 0) {
        actions.push(`Removidos ${inactiveWaiting.length} jugadores inactivos de sala de espera`);
      }
      return NextResponse.json({
        message: 'Monitoreo completado',
        gameId: game.id,
        status: game.status,
        actions,
        timestamp: new Date().toISOString(),
      });
    }

    // Solo continuar con lógica de turnos para partidas en progreso
    if (game.status !== GameStatus.IN_PROGRESS) {
      return NextResponse.json({
        message: 'Partida no está en progreso',
        gameId: game.id,
        status: game.status,
        action: 'none',
      });
    }

    // 1. Remover jugadores inactivos
    const inactivePlayers = await removeInactivePlayers(game.id);
    if (inactivePlayers.length > 0) {
      actions.push(`Removidos ${inactivePlayers.length} jugadores inactivos`);
    }

    const refreshedGame = await getActiveGame();

    // 2. Verificar si el turno ha expirado con estado fresco
    if (refreshedGame && refreshedGame.status === GameStatus.IN_PROGRESS && isTurnExpired(refreshedGame)) {
      const currentTurnPlayer = refreshedGame.players.find(
        (player) => player.status === 'active' && player.userId === refreshedGame.currentTurn
      );

      const scheduledSkips = Math.max(
        currentTurnPlayer?.skip_turns_remaining ?? 0,
        currentTurnPlayer?.skip_next_turn ? 1 : 0
      );

      if (currentTurnPlayer && scheduledSkips > 0) {
        const remainingSkips = Math.max(0, scheduledSkips - 1);

        await db
          .from('game_players')
          .update({
            skip_turns_remaining: remainingSkips,
            skip_next_turn: remainingSkips > 0,
            failed_attempts: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentTurnPlayer.id);

        await db
          .from('game_events')
          .insert({
            game_id: refreshedGame.id,
            player_id: currentTurnPlayer.id,
            event_type: 'turn_ended',
            event_data: {
              reason: 'scheduled_skip_penalty',
              userId: currentTurnPlayer.userId,
              username: currentTurnPlayer.username,
              remainingSkips,
              message: `${currentTurnPlayer.username} pierde turno por penalización pendiente.`,
            },
          });

        const nextPlayerId = await nextTurn(refreshedGame.id, {
          expectedCurrentTurn: refreshedGame.currentTurn,
        });

        if (nextPlayerId) {
          actions.push(`Turno penalizado consumido. Pasado a jugador ${nextPlayerId}`);
        }
      } else {
        const nextPlayerId = await nextTurn(refreshedGame.id, {
          expectedCurrentTurn: refreshedGame.currentTurn,
        });

        if (nextPlayerId) {
          actions.push(`Turno expirado. Pasado a jugador ${nextPlayerId}`);
        } else {
          actions.push('Turno expirado pero no hay jugadores activos');
        }
      }
    }

    return NextResponse.json({
      message: 'Monitoreo completado',
      gameId: game.id,
      actions,
      timestamp: new Date().toISOString(),
      activePlayers: game.players.filter((p) => p.status === 'active').length,
      currentTurn: game.currentTurn,
    });
  } catch (error) {
    console.error('Error en monitor:', error);
    return NextResponse.json(
      { error: 'Error en monitoreo' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para que el cliente verifique el estado
 */
export async function POST(req: NextRequest) {
  try {
    const authError = getCronAuthError(req);
    if (authError) {
      return authError;
    }

    const game = await getActiveGame();

    if (!game) {
      return NextResponse.json({
        hasActiveGame: false,
      });
    }

    return NextResponse.json({
      hasActiveGame: true,
      gameId: game.id,
      status: game.status,
      players: game.players.map((p) => ({
        id: p.id,
        username: p.username,
        position: p.position,
        points: p.points,
        status: p.status,
        isCurrentTurn: p.id === game.currentTurn,
      })),
      spectators: game.spectators.length,
      currentTurn: game.currentTurn,
      turnStartTime: game.turnStartTime,
    });
  } catch (error) {
    console.error('Error en status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
