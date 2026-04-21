import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth-middleware';
import { getGameForUser, GameStatus, PlayerStatus, GAME_CONSTANTS } from '@/lib/game-manager';
import { GAME_TIMING } from '@/lib/game-timing';

/**
 * POST /api/game/going-
 *
 * Beacon enviado cuando la página pasa a estado oculto (visibilitychange hidden=true,
 * pagehide con persisted=true, o cierre del navegador en móvil).
 *
 * Para partidas IN_PROGRESS: retrocede `last_action_at` para que
 * `removeInactivePlayers` lo detecte como AFK tras DISCONNECT_GRACE_MS en lugar
 * de esperar el AFK_TIMEOUT_MS completo.
 *
 * Para partidas WAITING (sala de espera): retrocede `last_action_at` para que
 * `removeInactiveWaitingPlayers` lo detecte tras LOBBY_DISCONNECT_GRACE_MS en lugar
 * de esperar el WAITING_PLAYER_TIMEOUT_MS completo.
 *
 * Si el jugador regresa antes, su próximo heartbeat restablece `last_action_at`
 * al momento actual y cancela la detección.
 *
 * Compatible con navigator.sendBeacon: acepta el access token en el cuerpo JSON
 * además del encabezado Authorization estándar.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        let user = getUserFromRequest(req);

        // respaldo para sendBeacon (no envía headers Authorization fácilmente)
        if (!user && body.accessToken) {
            const { verifyAccessToken } = await import('@/lib/jwt');
            user = verifyAccessToken(body.accessToken);
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const activeGame = await getGameForUser(user.userId);
        if (!activeGame) {
            return NextResponse.json({ success: false, message: 'Sin partida activa' });
        }

        const isWaiting = activeGame.status === GameStatus.WAITING;
        const isInProgress = activeGame.status === GameStatus.IN_PROGRESS;

        if (!isWaiting && !isInProgress) {
            return NextResponse.json({ success: false, message: 'Partida no en estado válido' });
        }

        const player = activeGame.players.find(
            (p) => p.userId === user!.userId && p.status === PlayerStatus.ACTIVE
        );

        if (!player) {
            // Jugador ya inactivo o no encontrado — nada que hacer
            return NextResponse.json({ success: false, message: 'Jugador no activo' });
        }

        // Retroceder last_action_at según el tipo de partida:
        // - IN_PROGRESS: detectar AFK tras DISCONNECT_GRACE_MS (en vez de AFK_TIMEOUT_MS)
        // - WAITING: detectar AFK tras LOBBY_DISCONNECT_GRACE_MS (en vez de WAITING_PLAYER_TIMEOUT_MS)
        const backdateAmount = isInProgress
            ? GAME_TIMING.AFK_TIMEOUT_MS - GAME_TIMING.DISCONNECT_GRACE_MS
            : GAME_CONSTANTS.WAITING_PLAYER_TIMEOUT_MS - GAME_TIMING.LOBBY_DISCONNECT_GRACE_MS;

        const backdatedTimestamp = new Date(Date.now() - backdateAmount).toISOString();

        const supabase = getServiceSupabase();
        await supabase
            .from('game_players')
            .update({
                last_action_at: backdatedTimestamp,
                updated_at: new Date().toISOString(),
            })
            .eq('game_id', activeGame.id)
            .eq('user_id', user.userId)
            .eq('status', PlayerStatus.ACTIVE); // solo si sigue ACTIVO

        return NextResponse.json({ success: true, gameStatus: activeGame.status });
    } catch (err: unknown) {
        console.error('[Going Away] Error:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
