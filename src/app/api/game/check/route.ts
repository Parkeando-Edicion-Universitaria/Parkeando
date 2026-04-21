import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * obtener /api/game/check
 * Lightweight endpoint to check si the actual game is still activo.
 * usados as a respaldo poll cuando tiempo real events might have been dropped.
 */
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getServiceSupabase();

    // Buscar la partida activa del usuario
    const { data: playerRow } = await db
      .from('game_players')
      .select('game_id, status')
      .eq('user_id', user.userId)
      .in('status', ['active', 'disconnected'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!playerRow) {
      return NextResponse.json({ active: false, reason: 'no_game' });
    }

    const { data: game } = await db
      .from('games')
      .select('id, status, winner, current_turn, turn_start_time')
      .eq('id', playerRow.game_id)
      .single();

    if (!game) {
      return NextResponse.json({ active: false, reason: 'game_not_found' });
    }

    if (game.status === 'finished') {
      // Obtener el evento de fin para contexto
      const { data: finishEvent } = await db
        .from('game_events')
        .select('event_data')
        .eq('game_id', game.id)
        .eq('event_type', 'game_finished')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const eventData = (finishEvent as any)?.event_data || {};

      return NextResponse.json({
        active: false,
        reason: 'finished',
        gameId: game.id,
        winner: game.winner,
        finishData: {
          winnerId: eventData.winnerId || eventData.winner || game.winner || null,
          winnerUsername: eventData.winnerUsername || null,
          reason: eventData.reason || 'unknown',
          countsAsWin: Boolean(eventData.countsAsWin ?? game.winner),
          message: eventData.message || null,
        },
      });
    }

    // El máximo de jugadores es pequeño (<= 6), así que traer filas acotadas es más barato que contar exacto.
    const { data: activePlayersRows } = await db
      .from('game_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('status', 'active')
      .limit(6);

    return NextResponse.json({
      active: true,
      gameId: game.id,
      status: game.status,
      currentTurn: game.current_turn,
      activePlayers: activePlayersRows?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
