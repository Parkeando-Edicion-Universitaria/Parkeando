import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { endGame, GameStatus } from '@/lib/game-manager';

/**
 * POST /api/admin/games/[id]/end
 * Fuerza el fin de una partida sin adjudicar victoria.
 */
async function handler(
    req: AuthenticatedRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = req.user!;

        const { id: gameId } = await context.params;
        const body = await req.json().catch(() => ({}));
        const reason = body.reason || 'Fin forzado por administrador';

        const db = getServiceSupabase();
        // Verificar que la partida existe
        const { data: game, error: fetchError } = await db
            .from('games')
            .select(`
        id,
        status,
        game_players (
          id,
          user_id,
          username,
          position,
          points,
          status
        )
      `)
            .eq('id', gameId)
            .single();

        if (fetchError || !game) {
            return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
        }

        if (game.status === GameStatus.FINISHED) {
            return NextResponse.json({ error: 'La partida ya está finalizada' }, { status: 400 });
        }

        const { data: adminUser } = await db
            .from('users')
            .select('username')
            .eq('id', user.userId)
            .maybeSingle();

        const summary = await endGame(gameId, {
            reason: 'manual',
            winnerUserId: null,
            countWin: false,
            awardWinnerPoints: false,
            actor: {
                userId: user.userId,
                username: adminUser?.username ?? 'Administración',
            },
            adminReason: reason,
        });

        // Auto-eliminar todos los mensajes de chat de esta partida (Limpieza de logs)
        await db.from('game_events')
            .delete()
            .eq('game_id', gameId)
            .eq('event_type', 'chat_message');

        // Registrar el evento de fin forzado para auditoría
        await db.from('game_events').insert({
            game_id: gameId,
            player_id: null,
            event_type: 'admin_force_end',
            event_data: {
                adminId: user.userId,
                adminUsername: adminUser?.username ?? 'Administración',
                reason,
                winnerId: null,
                winnerUsername: null,
                endedAt: new Date().toISOString(),
            },
        });

        return NextResponse.json({
            success: true,
            gameId,
            winnerId: null,
            winnerUsername: null,
            message: summary?.message ?? 'Partida finalizada sin ganador.',
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export const POST = withAuth(handler, { requireAdmin: true });
