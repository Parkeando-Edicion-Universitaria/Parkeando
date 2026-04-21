import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getActiveGame, GameStatus } from '@/lib/game-manager';
import { cleanupInactiveQueue } from '@/lib/queue-manager';

/**
 * POST /api/game/queue/limpieza
 * Limpia jugadores inactivos de la cola (sin dar listo en 2 minutos).
 * Retorna la lista de usuarios expulsados para que el cliente los notifique.
 * Puede ser llamado por el monitor cron o directamente.
 */
export async function POST(req: NextRequest) {
    try {
        // Verificar token de autorización (para cron jobs)
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const game = await getActiveGame();

        if (!game) {
            return NextResponse.json({
                message: 'No hay partida activa',
                kicked: [],
            });
        }

        // Solo limpiar la cola si la partida está en estado de espera
        if (game.status !== GameStatus.WAITING) {
            return NextResponse.json({
                message: 'La partida no está en estado de espera, no hay cola que limpiar',
                gameStatus: game.status,
                kicked: [],
            });
        }

        const { removed, kickedUserIds, kickedUsernames } = await cleanupInactiveQueue(game.id);

        return NextResponse.json({
            gameId: game.id,
            removed,
            kicked: kickedUserIds.map((id, i) => ({
                userId: id,
                username: kickedUsernames[i],
                reason: 'inactive_no_ready',
                message: `${kickedUsernames[i]} fue removido de la cola por no dar ready a tiempo (2 minutos).`,
            })),
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('Error en queue cleanup:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
