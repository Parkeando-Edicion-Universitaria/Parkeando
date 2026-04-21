import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-middleware';
import {
  parseQRCode,
  validateQRCode,
  sanitizeQRInput,
  logScanAttempt,
  detectSuspiciousActivity,
} from '@/lib/qr-validator';
import {
  getActiveGame,
  updatePlayerAction,
  movePlayer,
  updatePlayerPoints,
  nextTurn,
  checkWinner,
  endGame,
  getGameForUser,
  GAME_CONSTANTS,
} from '@/lib/game-manager';
import { applyMoveEffects } from '@/lib/special-cells';
import { getServiceSupabase } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/security';
import { getRandomCardForCell } from '@/data/game-cards';

// Schema de validación
const scanSchema = z.object({
  qr_data: z.string().min(1).max(200),
  expected_position: z.number().int().min(1).max(120),
});

async function handler(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    // Parse y validar body
    const body = await req.json();
    const validated = scanSchema.parse(body);

    // Sanitizar entrada del QR
    const sanitizedQR = sanitizeQRInput(validated.qr_data);

    // Obtener usuario del token
    const userId = (req as any).user.userId;

    // Detectar actividad sospechosa (>10 intentos/min o 5 fallos consecutivos)
    const suspicious = detectSuspiciousActivity(userId);
    if (suspicious.suspicious) {
      logScanAttempt({
        userId,
        qrCode: sanitizedQR,
        timestamp: new Date(),
        success: false,
        error: suspicious.reason,
      });

      return NextResponse.json(
        {
          error: 'Actividad sospechosa detectada',
          message: suspicious.reason,
        },
        { status: 429 }
      );
    }

    // Obtener partida activa
    const game = await getGameForUser(userId);
    if (!game || game.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'No hay partida activa' },
        { status: 404 }
      );
    }

    // Verificar que el jugador está en la partida
    const player = game.players.find((p) => p.userId === userId);
    if (!player) {
      return NextResponse.json(
        { error: 'Jugador no encontrado en la partida' },
        { status: 404 }
      );
    }

    // Verificar que es el turno del jugador
    if (game.currentTurn !== userId) {
      return NextResponse.json(
        { error: 'No es tu turno' },
        { status: 403 }
      );
    }

    // Verificar que el jugador está activo
    if (player.status !== 'active') {
      return NextResponse.json(
        { error: 'Jugador no activo' },
        { status: 403 }
      );
    }

    // NOTA: El cooldown canScanQR fue eliminado porque last_action_at se actualiza
    // en cada heartbeat y tirada de dado, bloqueando el primer escaneo legítimo (429 falso).
    // Protecciones activas:
    //  • pending_position: solo se puede escanear 1 vez por turno/tirada (se borra al escanear)
    //  • detectSuspiciousActivity: bloquea >10 intentos/min o 5 fallos consecutivos

    // Verificar que el jugador tiene una posición pendiente y coincide con lo esperado
    // Usamos el dato ya disponible del jugador obtenido en getGameForUser (sin 2da query)
    const pendingPos = (player as any).pending_position;

    if (pendingPos == null || pendingPos !== validated.expected_position) {
      return NextResponse.json(
        { error: 'Inconsistencia de posición', message: 'Tira el dado primero' },
        { status: 400 }
      );
    }

    // depuración: log entrante QR para lado servidor inspección
    console.log('[QR Debug] Raw input:', validated.qr_data);
    console.log('[QR Debug] Sanitized:', sanitizedQR);
    console.log('[QR Debug] Expected pos (from DB):', pendingPos);

    // --- NUEVA LÓGICA: Comparar celda del QR contra pending_position de la DB ---
    // La DB es la fuente de verdad: el servidor fijó pending_position al lanzar el dado.
    // Esto hace los QRs funcionar aunque cambies el secreto HMAC.
    const parsedQR = parseQRCode(sanitizedQR);

    if (!parsedQR) {
      logScanAttempt({ userId, qrCode: sanitizedQR, timestamp: new Date(), success: false, error: 'Formato QR inválido' });
      return NextResponse.json(
        { error: 'QR inválido', message: 'El formato del código QR es incorrecto. Debe empezar con PARKEANDO:' },
        { status: 400 }
      );
    }

    // Verificar HMAC: bloquear si falla para evitar manipulación del payload
    const qrValidated = validateQRCode(sanitizedQR);
    if (!qrValidated?.isValid) {
      logScanAttempt({
        userId,
        qrCode: sanitizedQR,
        timestamp: new Date(),
        success: false,
        error: `HMAC inválido en casilla ${parsedQR.cellNumber}`,
      });
      return NextResponse.json(
        {
          error: 'QR no auténtico',
          message: 'El código QR no pasó la validación de seguridad.',
        },
        { status: 400 }
      );
    }

    // La verificación real: el QR del número de casilla debe coincidir con pending_position
    if (parsedQR.cellNumber !== pendingPos) {
      logScanAttempt({ userId, qrCode: sanitizedQR, timestamp: new Date(), success: false, error: `Casilla ${parsedQR.cellNumber} ≠ esperada ${pendingPos}` });
      return NextResponse.json(
        {
          error: 'QR de casilla incorrecta',
          message: `Este QR es de la casilla ${parsedQR.cellNumber}, pero debes estar en la casilla ${pendingPos}`,
          currentPosition: player.position,
        },
        { status: 400 }
      );
    }

    logScanAttempt({ userId, qrCode: sanitizedQR, timestamp: new Date(), success: true });

    // QR válido - actualizar posición base del jugador
    const cellNumber = parsedQR.cellNumber;
    await supabase
      .from('game_players')
      .update({
        position: cellNumber,
        pending_position: null,
        pending_dice: null,
        failed_attempts: 0,
        last_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', player.id);

    // --- APLICAR EFECTOS DE CASILLA (Teleports, Batallas, Puntos, Cárcel) ---
    const { effect, battle, finalPosition } = await applyMoveEffects(
      game.id,
      player.id,
      cellNumber
    );

    // Registrar evento de escaneo final
    await supabase.from('game_events').insert({
      game_id: game.id,
      player_id: player.id,
      event_type: 'qr_scanned',
      event_data: {
        position: cellNumber,
        finalPosition,
        effect: effect.type,
        message: `${player.username} validó su posición en la casilla ${cellNumber}.${finalPosition !== cellNumber ? ` ¡Efecto especial! Movido a ${finalPosition}` : ''
          }`
      }
    });

    // Verificar si hay tarjeta (pregunta/reto/premio/penalizacion)
    // Nota: si existe tarjeta en la casilla final, primero se debe resolver.
    const card = getRandomCardForCell(finalPosition);
    const hasCard = card !== null;

    // Verificar si ganó (Posición >= WIN_POSITION) solo cuando no hay tarjeta pendiente
    const hasWon = finalPosition >= GAME_CONSTANTS.WIN_POSITION && !hasCard;
    if (hasWon) {
      await endGame(game.id, { reason: 'winner', winnerUserId: userId });
    }

    // retro compatibilidad: hasQuestion = hasCard para preguntas
    const hasQuestion = hasCard && card.type === 'pregunta';
    const questionData = hasCard ? card : null;

    if (hasCard) {
      // Registrar la tarjeta pendiente para obligarlo a responder (evita turnos infinitos)
      await supabase
        .from('game_players')
        .update({ pending_card_id: card?.id })
        .eq('id', player.id);
    } else if (!hasWon) {
      // Si NO hay tarjeta y NO ha ganado, pasamos el turno
      await nextTurn(game.id);
    }

    return NextResponse.json({
      success: true,
      position: finalPosition,
      rawPosition: cellNumber,
      hasQuestion,
      hasCard,
      question: questionData,
      card: questionData,
      points: player.points + (effect.bonusPoints || 0),
      effect,
      battle,
      isWinner: hasWon
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error en scan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
