import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { removeInactiveWaitingPlayers, GameStatus } from '@/lib/game-manager';
import { getServiceSupabase } from '@/lib/supabase';
import { isTransientNetworkError, summarizeUnknownError } from '@/lib/network-errors';

/**
 * POST /api/game/waiting-limpieza
 *
 * Expulsa jugadores inactivos de una sala de espera (status=waiting).
 * Puede ser llamado por cualquier usuario autenticado que tenga el lobby abierto,
 * no sólo por jugadores dentro de la partida. Esto garantiza que los jugadores
 * "fantasma" (que cerraron el navegador sin salir correctamente) sean removidos
 * incluso cuando son los únicos en la sala y nadie más dispara el heartbeat normal.
 */
export const POST = withAuth(async (req) => {
    try {
        const body = await req.json().catch(() => ({}));
        const { gameId } = body as { gameId?: string };

        if (!gameId || typeof gameId !== 'string') {
            return NextResponse.json({ error: 'gameId requerido' }, { status: 400 });
        }

        // Verificar que la partida exista y siga en estado waiting
        const supabase = getServiceSupabase();
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, status')
            .eq('id', gameId)
            .abortSignal(AbortSignal.timeout(3000))
            .maybeSingle();

        if (gameError) {
            if (isTransientNetworkError(gameError)) {
                console.warn('[WaitingCleanup] Transient Supabase issue:', summarizeUnknownError(gameError));
                return NextResponse.json({ success: false, skipped: true, reason: 'transient_network_issue' });
            }
            throw gameError;
        }

        if (!game) {
            return NextResponse.json({ success: false, message: 'Partida no encontrada' });
        }

        if (game.status !== GameStatus.WAITING) {
            return NextResponse.json({ success: false, message: 'Partida no está en sala de espera' });
        }

        const removedUserIds = await removeInactiveWaitingPlayers(gameId);

        return NextResponse.json({ success: true, removedCount: removedUserIds.length });
    } catch (err: unknown) {
        if (isTransientNetworkError(err)) {
            console.warn('[WaitingCleanup] Transient Supabase issue:', summarizeUnknownError(err));
            return NextResponse.json({ success: false, skipped: true, reason: 'transient_network_issue' });
        }

        console.error('[WaitingCleanup] Error:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});
