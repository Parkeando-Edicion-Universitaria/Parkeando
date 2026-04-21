import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { isTransientNetworkError, summarizeUnknownError } from '@/lib/network-errors';
import {
    GameStatus,
    getGameForUser,
    removeInactivePlayers,
    removeInactiveWaitingPlayers,
} from '@/lib/game-manager';

/**
 * POST /api/game/heartbeat
 *
 * Actualiza la última actividad del jugador en su partida activa (waiting/in_progress).
 * Filtra por game_id para no afectar registros de partidas anteriores abandonadas.
 */
export const POST = withAuth(async (req) => {
    try {
        const user = req.user!;
        const supabase = getServiceSupabase();

        // Obtener la partida activa del usuario para filtrar correctamente
        const activeGame = await getGameForUser(user.userId);
        if (!activeGame) {
            return NextResponse.json({ success: false, message: 'Sin partida activa' });
        }

        // Usar RPC eficiente que throttles la actualización a cada 5 segundos
        const { error } = await supabase.rpc('efficient_heartbeat', {
            p_user_id: user.userId,
            p_game_id: activeGame.id
        }).abortSignal(AbortSignal.timeout(3000));

        let heartbeatOk = true;
        if (error) {
            heartbeatOk = false;
            if (isTransientNetworkError(error)) {
                console.warn('[Game Heartbeat] Transient Supabase issue, heartbeat skipped:', summarizeUnknownError(error));
            } else {
                console.error('[Heartbeat] Error updating last_action_at:', error);
            }
            // No retornar aquí: aun con fallo de RPC debemos ejecutar la limpieza
            // de jugadores inactivos para que la detección de AFK no se bloquee.
        }

        let cleanedPlayers = 0;

        if (activeGame.status === GameStatus.IN_PROGRESS) {
            const removed = await removeInactivePlayers(activeGame.id);
            cleanedPlayers = removed.length;
        } else if (activeGame.status === GameStatus.WAITING) {
            const removed = await removeInactiveWaitingPlayers(activeGame.id);
            cleanedPlayers = removed.length;
        }

        if (!heartbeatOk) {
            return NextResponse.json({ success: false, skipped: true, reason: 'heartbeat_error', cleanedPlayers });
        }

        return NextResponse.json({ success: true, cleanedPlayers });
    } catch (err: any) {
        if (isTransientNetworkError(err)) {
            console.warn('[Game Heartbeat] Transient Supabase issue, heartbeat skipped:', summarizeUnknownError(err));
            return NextResponse.json({ success: false, skipped: true, reason: 'transient_network_issue' });
        }

        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});
