import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { getServiceSupabase } from "@/lib/supabase";
import { GAME_CARDS } from "@/data/game-cards";
import { getGameForUser, nextTurn, endGame, GAME_CONSTANTS } from "@/lib/game-manager";

export const POST = withAuth(async (req) => {
  try {
    const user = req.user!;
    const body = await req.json();
    const { card_id, answer, completed, question_id } = body;

    const supabase = getServiceSupabase();

    // Verificar turno y obtener primero la partida activa
    const game = await getGameForUser(user.userId);
    if (!game || game.currentTurn !== user.userId) {
      return NextResponse.json({ error: "No es tu turno" }, { status: 403 });
    }

    // Obtener el jugador actual explícitamente para esta partida
    const { data: player } = await supabase
      .from("game_players")
      .select("username, id, position, points, game_id, pending_card_id, skip_next_turn, skip_turns_remaining, penalty_shields")
      .eq("user_id", user.userId)
      .eq("game_id", game.id)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: "Jugador no encontrado en la partida activa" },
        { status: 404 },
      );
    }

    // Buscar la carta en nuestros datos. Usar pending_card_id de BD para evitar saltarse la lógica
    const cardId = card_id || question_id || player.pending_card_id;
    const card = GAME_CARDS.find((c) => c.id === cardId);

    let isCorrect = false;
    let pointsEarned = 0;
    let message = "";
    let newPosition: number | undefined;
    let grantExtraTurn = false;

    // Objeto para acumular actualizaciones del jugador y reducir roundtrips a la DB
    const playerUpdate: any = {
      pending_card_id: null, // Limpiar tarjeta al responder para liberar el dado
      failed_attempts: 0,
      updated_at: new Date().toISOString()
    };

    if (card) {
      // Manejar según tipo de carta
      switch (card.type) {
        case "pregunta": {
          isCorrect = Number(answer) === Number(card.correctAnswer);
          const effect = isCorrect ? card.onCorrect : card.onIncorrect;
          if (effect?.advanceCells) {
            newPosition = Math.max(0, Math.min(GAME_CONSTANTS.TOTAL_CELLS, player.position + effect.advanceCells));
            playerUpdate.position = newPosition;
          }
          if (effect?.goToPosition !== undefined) {
            newPosition = Math.max(0, Math.min(GAME_CONSTANTS.TOTAL_CELLS, effect.goToPosition));
            playerUpdate.position = newPosition;
          }
          if (effect?.goToFinish) {
            newPosition = GAME_CONSTANTS.WIN_POSITION;
            playerUpdate.position = GAME_CONSTANTS.WIN_POSITION;
          }
          if (effect?.skipTurns) {
            const baseSkips = player.skip_turns_remaining ?? (player.skip_next_turn ? 1 : 0);
            const nextSkips = Math.max(baseSkips, effect.skipTurns);
            playerUpdate.skip_turns_remaining = nextSkips;
            playerUpdate.skip_next_turn = nextSkips > 0;
          }
          if (effect?.rollDiceAndAdvance || effect?.extraDiceRoll) {
            grantExtraTurn = true;
          }
          pointsEarned = isCorrect ? 1 : 0;
          if (pointsEarned > 0) {
            playerUpdate.points = player.points + pointsEarned;
          }
          message = isCorrect
            ? `${player.username} respondió correctamente. ${effect?.advanceCells && effect.advanceCells > 0 ? `Avanza ${effect.advanceCells} casillas.` : ""}${effect?.rollDiceAndAdvance || effect?.extraDiceRoll ? " Tira el dado y avanza." : ""}`
            : `${player.username} falló. ${effect?.advanceCells && effect.advanceCells < 0 ? `Retrocede ${Math.abs(effect.advanceCells)} casillas.` : ""}`;
          break;
        }
        case "reto": {
          isCorrect = completed === true;
          const effect = isCorrect ? card.onComplete : card.onFail;
          if (effect?.advanceCells) {
            newPosition = Math.max(0, Math.min(GAME_CONSTANTS.TOTAL_CELLS, player.position + effect.advanceCells));
            playerUpdate.position = newPosition;
          }
          if (effect?.goToPosition !== undefined) {
            newPosition = Math.max(0, Math.min(GAME_CONSTANTS.TOTAL_CELLS, effect.goToPosition));
            playerUpdate.position = newPosition;
          }
          if (effect?.goToFinish) {
            newPosition = GAME_CONSTANTS.WIN_POSITION;
            playerUpdate.position = GAME_CONSTANTS.WIN_POSITION;
          }
          if (effect?.skipTurns || effect?.loseTurn) {
            const penaltySkips = effect?.skipTurns && effect.skipTurns > 0 ? effect.skipTurns : 1;
            const baseSkips = player.skip_turns_remaining ?? (player.skip_next_turn ? 1 : 0);
            const nextSkips = Math.max(baseSkips, penaltySkips);
            playerUpdate.skip_turns_remaining = nextSkips;
            playerUpdate.skip_next_turn = nextSkips > 0;
          }
          if (effect?.rollDiceAndAdvance || effect?.extraDiceRoll) {
            grantExtraTurn = true;
          }
          message = isCorrect
            ? `${player.username} completó el reto.`
            : `${player.username} no completó el reto.`;
          break;
        }
        case "premio": {
          isCorrect = true;
          const effect = card.onComplete || card.autoApply;
          const currentShields = Math.max(0, Number(player.penalty_shields ?? 0));
          if (effect?.advanceCells) {
            newPosition = Math.max(0, Math.min(GAME_CONSTANTS.TOTAL_CELLS, player.position + effect.advanceCells));
            playerUpdate.position = newPosition;
          }
          if (effect?.goToPosition !== undefined) {
            newPosition = effect.goToPosition;
            playerUpdate.position = newPosition;
          }
          if (effect?.goToFinish) {
            newPosition = GAME_CONSTANTS.WIN_POSITION;
            playerUpdate.position = GAME_CONSTANTS.WIN_POSITION;
          }
          if (effect?.protectFromPenalty) {
            playerUpdate.penalty_shields = currentShields + 1;
          }
          if (effect?.extraDiceRoll) {
            grantExtraTurn = true;
          }
          message = `${player.username} recibió un premio: ${card.title}${effect?.protectFromPenalty ? " (ganó 1 escudo contra penalización)" : ""}`;
          break;
        }
        case "penalizacion": {
          isCorrect = false;
          const effect = card.autoApply;
          const currentShields = Math.max(0, Number(player.penalty_shields ?? 0));
          const blocksPenaltyRetroceso = currentShields > 0 && Boolean(effect?.advanceCells && effect.advanceCells < 0);

          if (blocksPenaltyRetroceso) {
            playerUpdate.penalty_shields = currentShields - 1;
          } else if (effect?.advanceCells) {
            newPosition = Math.max(0, Math.min(GAME_CONSTANTS.TOTAL_CELLS, player.position + effect.advanceCells));
            playerUpdate.position = newPosition;
          }
          if (effect?.skipTurns || effect?.loseTurn) {
            const penaltySkips = effect?.skipTurns && effect.skipTurns > 0 ? effect.skipTurns : 1;
            const baseSkips = player.skip_turns_remaining ?? (player.skip_next_turn ? 1 : 0);
            const nextSkips = Math.max(baseSkips, penaltySkips);
            playerUpdate.skip_turns_remaining = nextSkips;
            playerUpdate.skip_next_turn = nextSkips > 0;
          }
          message = blocksPenaltyRetroceso
            ? `${player.username} activó un escudo y evitó retroceder por la penalización: ${card.title}`
            : `${player.username} recibió una penalización: ${card.title}`;
          break;
        }
      }

      // Aplicar todas las actualizaciones acumuladas en una sola llamada
      if (Object.keys(playerUpdate).length > 1) {
        await supabase
          .from("game_players")
          .update(playerUpdate)
          .eq("id", player.id);
      }
    } else {
      // Respaldo para preguntas de estilo antiguo desde BD
      message = "Tarjeta no encontrada";
    }

    // Verificar si el jugador ganó
    if (newPosition !== undefined && newPosition >= GAME_CONSTANTS.WIN_POSITION) {
      await endGame(game.id, { reason: "winner", winnerUserId: user.userId });
      return NextResponse.json({
        is_correct: isCorrect,
        success: true,
        points_earned: pointsEarned,
        new_position: GAME_CONSTANTS.WIN_POSITION,
        message: `🏆 ¡${player.username} ha ganado!`,
        isWinner: true,
      });
    }

    // Log event
    await supabase.from("game_events").insert({
      game_id: player.game_id,
      player_id: player.id,
      event_type: "question_answered",
      event_data: { is_correct: isCorrect, card_type: card?.type, message },
    });

    // Pasar turno si no se otorgó turno extra
    if (!grantExtraTurn) {
      await nextTurn(player.game_id);
    }

    return NextResponse.json({
      is_correct: isCorrect,
      success: true,
      points_earned: pointsEarned,
      penalty_message: !isCorrect ? message : undefined,
      new_position: newPosition,
      message,
      extraTurn: grantExtraTurn,
    });
  } catch (error: any) {
    console.error("Error in answer:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});
