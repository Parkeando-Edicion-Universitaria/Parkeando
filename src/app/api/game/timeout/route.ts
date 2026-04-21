import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { nextTurn, GameStatus, PlayerStatus, getGameForUser } from '@/lib/game-manager';
import { GAME_TIMING } from '@/lib/game-timing';

const TURN_TIMEOUT_AFK_PATTERN_THRESHOLD = 2;

export async function POST(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const mode = body?.mode === 'afk'
            ? 'afk'
            : body?.mode === 'camera_permission_denied'
                ? 'camera_permission_denied'
                : 'turn';

        const db = getServiceSupabase();

        const activeGame = await getGameForUser(user.userId);

        if (!activeGame || activeGame.status !== GameStatus.IN_PROGRESS) {
            // Devolver 200 en silencio — no tener partida activa no es un error
            return NextResponse.json({ success: false, message: 'No hay partida activa' }, { status: 200 });
        }

        const requesterPlayer = activeGame.players.find(
            (player) => player.userId === user.userId && [PlayerStatus.ACTIVE, PlayerStatus.DISCONNECTED].includes(player.status)
        );

        if (!requesterPlayer) {
            return NextResponse.json({ error: 'Solo los jugadores de la partida pueden procesar timeout.' }, { status: 403 });
        }

        // Validar si el turno REALMENTE expiró revisando turn_start_time
        const turnStart = new Date(activeGame.turnStartTime).getTime();
        const now = Date.now();
        const elapsedMs = now - turnStart;

        // tiempo agotado canónico de turno + pequeña gracia por desfase de reloj cliente/servidor
        const isTimeUp = elapsedMs >= (GAME_TIMING.TURN_TIMEOUT_MS + GAME_TIMING.TURN_TIMEOUT_GRACE_MS);

        if (!isTimeUp) {
            // Solo el jugador activo puede rendirse antes (salto voluntario)
            if (activeGame.currentTurn !== user.userId) {
                return NextResponse.json({
                    error: 'El turno aún no ha expirado. Solo el jugador activo puede saltar su turno prematuramente.',
                    elapsedSeconds: elapsedMs / 1000
                }, { status: 403 });
            }
        }

        // El tiempo agotado de turno y el tiempo agotado AFK son conceptos separados a propósito:
        // - modo='turn': solo avanza el turno, NO inactiva/expulsa jugadores.
        // - modo='afk': inactiva al jugador actual y luego avanza turno/finaliza.

        // tiempo agotado de turno:
        // - Si el turno no ha expirado, solo el jugador en turno puede saltarlo voluntariamente.
        // - Si ya expiró, cualquier jugador activo puede procesarlo para evitar partidas congeladas.
        if (mode === 'turn' && activeGame.currentTurn !== user.userId && !isTimeUp) {
            return NextResponse.json({
                error: 'Solo el jugador en turno puede saltar su turno antes de que expire el tiempo.'
            }, { status: 403 });
        }

        // El modo AFK también aplica al jugador actual; para oponentes desconectados
        // el sistema usa heartbeat + limpieza de inactivos en backend.
        if ((mode === 'afk' || mode === 'camera_permission_denied') && activeGame.currentTurn !== user.userId) {
            return NextResponse.json({
                error: 'Solo el jugador en turno puede procesar expulsión AFK directa.'
            }, { status: 403 });
        }

        // --- MODO: TIEMPO AGOTADO DE TURNO (no expulsa) ---
        if (mode === 'turn') {
            const timedOutPlayer = activeGame.players.find((player) => player.userId === activeGame.currentTurn);
            let timeoutStreakForEvent = timedOutPlayer?.failed_attempts ?? 0;

            const scheduledPenaltySkips = Math.max(
                timedOutPlayer?.skip_turns_remaining ?? 0,
                timedOutPlayer?.skip_next_turn ? 1 : 0
            );

            // Si el jugador ya venía penalizado para saltar turno(s), consumimos la penalización
            // y evitamos contar AFK/fallos por una jugada que no debía ejecutar.
            if (isTimeUp && timedOutPlayer && scheduledPenaltySkips > 0) {
                const nextSkips = Math.max(0, scheduledPenaltySkips - 1);

                const { error: consumePenaltyError } = await db
                    .from('game_players')
                    .update({
                        skip_turns_remaining: nextSkips,
                        skip_next_turn: nextSkips > 0,
                        failed_attempts: 0,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('game_id', activeGame.id)
                    .eq('user_id', timedOutPlayer.userId);

                if (consumePenaltyError) {
                    console.error('Error consuming scheduled skip penalty:', consumePenaltyError);
                    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
                }

                await db
                    .from('game_events')
                    .insert({
                        game_id: activeGame.id,
                        player_id: timedOutPlayer.id,
                        event_type: 'turn_ended',
                        event_data: {
                            reason: 'scheduled_skip_penalty',
                            userId: timedOutPlayer.userId,
                            username: timedOutPlayer.username,
                            remainingSkips: nextSkips,
                            message: `${timedOutPlayer.username ?? 'Un jugador'} saltó turno por penalización pendiente.`,
                        },
                    });

                const nextPlayerId = await nextTurn(activeGame.id, {
                    expectedCurrentTurn: activeGame.currentTurn,
                });

                return NextResponse.json({
                    success: true,
                    mode: 'turn',
                    skippedByPenalty: true,
                    remainingSkips: nextSkips,
                    nextTurn: nextPlayerId,
                });
            }

            if (isTimeUp && timedOutPlayer) {
                // Contamos todo turno expirado sin completar jugada.
                // Si el jugador deja pendiente el escaneo o la tarjeta, también suma para patrón AFK.
                const nextFailedAttempts = (timedOutPlayer.failed_attempts ?? 0) + 1;
                timeoutStreakForEvent = nextFailedAttempts;

                const { error: failedAttemptsError } = await db
                    .from('game_players')
                    .update({
                        failed_attempts: nextFailedAttempts,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('game_id', activeGame.id)
                    .eq('user_id', timedOutPlayer.userId);

                if (failedAttemptsError) {
                    console.error('Error updating failed_attempts on turn timeout:', failedAttemptsError);
                }

                if (nextFailedAttempts >= TURN_TIMEOUT_AFK_PATTERN_THRESHOLD) {
                    const removalTimestamp = new Date().toISOString();

                    const { error: markInactiveError } = await db
                        .from('game_players')
                        .update({
                            status: PlayerStatus.INACTIVE,
                            failed_attempts: nextFailedAttempts,
                            last_action_at: removalTimestamp,
                            updated_at: removalTimestamp,
                        })
                        .eq('game_id', activeGame.id)
                        .eq('user_id', timedOutPlayer.userId);

                    if (markInactiveError) {
                        console.error('Error marking player inactive by AFK timeout pattern:', markInactiveError);
                        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
                    }

                    await db
                        .from('game_events')
                        .insert({
                            game_id: activeGame.id,
                            player_id: timedOutPlayer.id,
                            event_type: 'player_timeout',
                            event_data: {
                                reason: 'turn_timeout_pattern',
                                userId: timedOutPlayer.userId,
                                timedOutUserId: timedOutPlayer.userId,
                                username: timedOutPlayer.username,
                                timeoutStreak: nextFailedAttempts,
                                message: `${timedOutPlayer.username ?? 'Un jugador'} fue removido por inactividad repetida (2 turnos sin completar su jugada).`,
                            },
                        });

                    const nextPlayerId = await nextTurn(activeGame.id, {
                        reason: 'player_timeout',
                        expectedCurrentTurn: activeGame.currentTurn,
                        removedPlayer: {
                            userId: timedOutPlayer.userId,
                            username: timedOutPlayer.username,
                        },
                    });

                    return NextResponse.json({
                        success: true,
                        mode: 'turn',
                        removedForAfkPattern: true,
                        timeoutStreak: nextFailedAttempts,
                        nextTurn: nextPlayerId,
                    });
                }
            }

            await db
                .from('game_events')
                .insert({
                    game_id: activeGame.id,
                    player_id: timedOutPlayer?.id ?? null,
                    event_type: 'turn_ended',
                    event_data: {
                        reason: 'timeout',
                        userId: timedOutPlayer?.userId ?? activeGame.currentTurn,
                        username: timedOutPlayer?.username ?? null,
                        timeoutStreak: timeoutStreakForEvent,
                        message: `${timedOutPlayer?.username ?? 'Un jugador'} agotó su tiempo de turno.`,
                    },
                });

            const nextPlayerId = await nextTurn(activeGame.id, {
                expectedCurrentTurn: activeGame.currentTurn,
            });

            if (!nextPlayerId) {
                return NextResponse.json({
                    success: true,
                    mode: 'turn',
                    message: 'Turno ya procesado por otro cliente.',
                });
            }
            return NextResponse.json({ success: true, mode: 'turn', nextTurn: nextPlayerId });
        }

        // --- modo: CAMERA PERMISSION DENIED (expulsa por falta de cámara) ---
        if (mode === 'camera_permission_denied') {
            const deniedPlayer = activeGame.players.find((player) => player.userId === activeGame.currentTurn);
            if (!deniedPlayer) {
                return NextResponse.json({ error: 'No se encontró el jugador en turno.' }, { status: 404 });
            }

            const { count: previousDenialsCount, error: denialCountError } = await db
                .from('game_events')
                .select('id', { count: 'exact', head: true })
                .eq('game_id', activeGame.id)
                .eq('player_id', deniedPlayer.id)
                .eq('event_type', 'player_timeout')
                .contains('event_data', { reason: 'camera_permission_denied' });

            if (denialCountError) {
                console.error('Error counting camera permission denials:', denialCountError);
                return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
            }

            const cameraDenialAttempt = (previousDenialsCount ?? 0) + 1;
            const shouldRemovePlayer = cameraDenialAttempt >= 2;
            const cameraUpdateTimestamp = new Date().toISOString();

            const { error: cameraRemovalError } = await db
                .from('game_players')
                .update(
                    shouldRemovePlayer
                        ? {
                            status: PlayerStatus.INACTIVE,
                            failed_attempts: (deniedPlayer.failed_attempts ?? 0) + 1,
                            last_action_at: cameraUpdateTimestamp,
                            updated_at: cameraUpdateTimestamp,
                        }
                        : {
                            failed_attempts: (deniedPlayer.failed_attempts ?? 0) + 1,
                            last_action_at: cameraUpdateTimestamp,
                            updated_at: cameraUpdateTimestamp,
                        }
                )
                .eq('game_id', activeGame.id)
                .eq('user_id', activeGame.currentTurn);

            if (cameraRemovalError) {
                console.error('Error handling player after camera permission denial:', cameraRemovalError);
                return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
            }

            await db
                .from('game_events')
                .insert({
                    game_id: activeGame.id,
                    player_id: deniedPlayer?.id ?? null,
                    event_type: 'player_timeout',
                    event_data: {
                        reason: 'camera_permission_denied',
                        attempt: cameraDenialAttempt,
                        userId: deniedPlayer.userId,
                        timedOutUserId: deniedPlayer.userId,
                        username: deniedPlayer.username,
                        message: shouldRemovePlayer
                            ? `${deniedPlayer.username ?? 'Un jugador'} fue removido por rechazar permisos de cámara 2 veces.`
                            : `${deniedPlayer.username ?? 'Un jugador'} rechazó permisos de cámara (${cameraDenialAttempt}/2). Se pasa su turno.`,
                    },
                });

            const { data: freshGame } = await db
                .from('games')
                .select('current_turn')
                .eq('id', activeGame.id)
                .single();

            if (freshGame?.current_turn !== activeGame.currentTurn) {
                return NextResponse.json({ success: true, message: 'Turno ya procesado por otro cliente.' });
            }

            const nextPlayerId = await nextTurn(activeGame.id, {
                reason: shouldRemovePlayer ? 'player_timeout' : undefined,
                expectedCurrentTurn: activeGame.currentTurn,
                removedPlayer: shouldRemovePlayer
                    ? {
                        userId: deniedPlayer.userId,
                        username: deniedPlayer.username,
                    }
                    : undefined,
            });

            return NextResponse.json({
                success: true,
                mode: 'camera_permission_denied',
                attempt: cameraDenialAttempt,
                removed: shouldRemovePlayer,
                nextTurn: nextPlayerId,
            });
        }

        // --- modo: AFK tiempo agotado (expulsa/inactiva) ---
        const afkPlayer = activeGame.players.find((player) => player.userId === activeGame.currentTurn);
        const afkScheduledPenaltySkips = Math.max(
            afkPlayer?.skip_turns_remaining ?? 0,
            afkPlayer?.skip_next_turn ? 1 : 0
        );

        if (afkPlayer && afkScheduledPenaltySkips > 0) {
            const nextSkips = Math.max(0, afkScheduledPenaltySkips - 1);
            const consumePenaltyTimestamp = new Date().toISOString();

            const { error: consumePenaltyError } = await db
                .from('game_players')
                .update({
                    skip_turns_remaining: nextSkips,
                    skip_next_turn: nextSkips > 0,
                    failed_attempts: 0,
                    last_action_at: consumePenaltyTimestamp,
                    updated_at: consumePenaltyTimestamp,
                })
                .eq('game_id', activeGame.id)
                .eq('user_id', afkPlayer.userId);

            if (consumePenaltyError) {
                console.error('Error consuming AFK-mode scheduled skip penalty:', consumePenaltyError);
                return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
            }

            await db
                .from('game_events')
                .insert({
                    game_id: activeGame.id,
                    player_id: afkPlayer.id,
                    event_type: 'turn_ended',
                    event_data: {
                        reason: 'scheduled_skip_penalty',
                        userId: afkPlayer.userId,
                        username: afkPlayer.username,
                        remainingSkips: nextSkips,
                        message: `${afkPlayer.username ?? 'Un jugador'} consumió un turno de penalización pendiente.`,
                    },
                });

            const nextPlayerId = await nextTurn(activeGame.id, {
                expectedCurrentTurn: activeGame.currentTurn,
            });

            return NextResponse.json({
                success: true,
                mode: 'afk',
                skippedByPenalty: true,
                remainingSkips: nextSkips,
                nextTurn: nextPlayerId,
            });
        }

        const { data: timeoutResult, error: timeoutError } = await db.rpc('handle_player_timeout', {
            p_game_id: activeGame.id
        });

        if (timeoutError) {
            console.error('Error in handle_player_timeout RPC:', timeoutError);
            return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
        }

        if (!timeoutResult.success && timeoutResult.error) {
            // Si el error es que ya no hay turno, probablemente otro cliente ya lo procesó
            return NextResponse.json({ success: true, message: timeoutResult.error });
        }

        // --- GUARD: Verificar que el turno no haya cambiado ya ---
        // Múltiples clientes pueden triggear tiempo agotado al mismo tiempo. Si el turno
        // ya fue procesado por otro cliente, rechazar silenciosamente.
        const { data: freshGame } = await db
            .from('games')
            .select('current_turn')
            .eq('id', activeGame.id)
            .single();

        if (freshGame?.current_turn !== activeGame.currentTurn) {
            return NextResponse.json({ success: true, message: 'Turno ya procesado por otro cliente.' });
        }
        // --- FIN DE LA PROTECCIÓN ---

        // nextTurn ahora maneja victoria en solitario si solo queda un jugador
        const timedOutPlayer = activeGame.players.find((player) => player.userId === activeGame.currentTurn);
        const nextPlayerId = await nextTurn(activeGame.id, {
            reason: 'player_timeout',
            expectedCurrentTurn: activeGame.currentTurn,
            removedPlayer: {
                userId: timedOutPlayer?.userId ?? activeGame.currentTurn,
                username: timedOutPlayer?.username ?? null,
            },
        });
        return NextResponse.json({ success: true, mode: 'afk', nextTurn: nextPlayerId });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
