import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { nextTurn, GameStatus, GAME_CONSTANTS, getGameForUser } from '@/lib/game-manager';

export const POST = withAuth(async (req) => {
  try {
    const user = req.user!;
    const db = getServiceSupabase();

    // Obtener la partida activa del jugador
    const game = await getGameForUser(user.userId);

    if (!game || game.status !== GameStatus.IN_PROGRESS) {
      return NextResponse.json({ error: 'No hay partida activa' }, { status: 404 });
    }

    // Safety check: Prevent double tira si a posición is already pending or a carta is waiting
    const player = game.players.find(p => p.userId === user.userId);
    if (player?.pending_position !== null) {
      return NextResponse.json({ error: 'Ya lanzaste el dado, debes escanear la casilla primero.' }, { status: 400 });
    }
    if (player?.pending_card_id !== null) {
      return NextResponse.json({ error: 'Debes resolver tu reto/pregunta actual primero.' }, { status: 400 });
    }
    if (game.currentTurn !== user.userId) {
      return NextResponse.json({ error: 'No es tu turno' }, { status: 403 });
    }

    // --- NUEVO: Usar RPC consolidada para mayor rendimiento ---
    // Esto reduce de 6 llamadas a la DB a solo 1 llamada atómica.
    const { data: rollResult, error: rollError } = await db.rpc('handle_dice_roll', {
      p_user_id: user.userId,
      p_game_id: game.id,
      p_win_position: GAME_CONSTANTS.WIN_POSITION
    });

    if (rollError) {
      console.error('Error in handle_dice_roll RPC:', rollError);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }

    if (rollResult.error) {
      return NextResponse.json({ error: rollResult.error }, { status: 400 });
    }

    const actionTimestamp = new Date().toISOString();
    const previousConsecutiveDoubles = player?.consecutive_doubles ?? 0;
    const rolledDice: number[] = Array.isArray(rollResult.diceDetails)
      ? rollResult.diceDetails
      : (Array.isArray(rollResult.dice) ? rollResult.dice : []);
    const rolledDouble = rolledDice.length === 2 && rolledDice[0] === rolledDice[1];

    let consecutiveDoubles = 0;
    let tripleDoublesPenalty = false;

    // Los dobles consecutivos solo cuentan en tiradas normales (no turno saltado ni cárcel).
    if (!rollResult.skipped && !rollResult.stayedInJail && rolledDouble) {
      consecutiveDoubles = previousConsecutiveDoubles + 1;
      if (consecutiveDoubles >= 3) {
        tripleDoublesPenalty = true;
        consecutiveDoubles = 0;
      }
    }

    const playerUpdatePayload: Record<string, any> = {
      consecutive_doubles: consecutiveDoubles,
      last_action_at: actionTimestamp,
      updated_at: actionTimestamp,
    };

    // Solo limpiar failed_attempts cuando la acción del turno queda cerrada en este endpoint.
    // En una tirada normal aún falta escanear/resolver, por lo que no se debe resetear aquí.
    if (rollResult.skipped || rollResult.stayedInJail) {
      playerUpdatePayload.failed_attempts = 0;
    }

    if (tripleDoublesPenalty) {
      const baseSkips = player?.skip_turns_remaining ?? (player?.skip_next_turn ? 1 : 0);
      const nextSkips = Math.max(baseSkips, 1);
      playerUpdatePayload.skip_turns_remaining = nextSkips;
      playerUpdatePayload.skip_next_turn = true;
    }

    const { error: playerUpdateError } = await db
      .from('game_players')
      .update(playerUpdatePayload)
      .eq('game_id', game.id)
      .eq('user_id', user.userId);

    if (playerUpdateError) {
      console.warn('[Roll] No se pudo actualizar estado del jugador tras tirada:', playerUpdateError.message);
    }

    if (tripleDoublesPenalty && player) {
      await db.from('game_events').insert({
        game_id: game.id,
        player_id: player.id,
        event_type: 'position_changed',
        event_data: {
          type: 'triple_doubles_penalty',
          username: player.username,
          message: `${player.username} sacó dobles tres veces consecutivas y perderá su próximo turno.`,
        },
      });
    }

    if (rollResult.skipped) {
      const nextPlayerId = await nextTurn(game.id);
      return NextResponse.json({
        skippedTurn: true,
        message: rollResult.message,
        nextTurn: nextPlayerId,
      });
    }

    if (rollResult.stayedInJail) {
      const nextPlayerId = await nextTurn(game.id);
      return NextResponse.json({
        dice: rollResult.dice?.[0] + rollResult.dice?.[1],
        diceDetails: rollResult.dice,
        stayedInJail: true,
        message: `Sacaste ${rollResult.dice?.[0]} y ${rollResult.dice?.[1]}. Necesitabas 3 y 5 para salir de la cárcel. ¡Pierdes tu turno!`,
        consecutiveDoubles: 0,
        tripleDoublesPenalty: false,
        nextTurn: nextPlayerId,
      });
    }

    return NextResponse.json({
      dice: rollResult.dice,
      diceDetails: rollResult.diceDetails,
      rawPosition: rollResult.newPosition,
      finalPosition: rollResult.newPosition,
      consecutiveDoubles,
      tripleDoublesPenalty,
      tripleDoublesMessage: tripleDoublesPenalty
        ? 'Sacaste dobles 3 veces consecutivas. Perderás tu próximo turno.'
        : null,
      isWinner: false,
      nextTurn: null,
    });
  } catch (error: any) {
    console.error('Error en roll:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});
