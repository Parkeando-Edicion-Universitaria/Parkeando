import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { GameStatus } from '@/lib/game-manager';

/**
 * POST /api/admin/games/[id]/reinicio
 * Resetea una partida: todos los jugadores vuelven a posición 0,
 * puntos a 0, estado a "waiting" y cola limpiada.
 */
async function handler(
    req: AuthenticatedRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = req.user!;

        const { id: gameId } = await context.params;

        const db = getServiceSupabase();

        // Verificar que la partida existe
        const { data: game, error: fetchError } = await db
            .from('games')
            .select('id, status')
            .eq('id', gameId)
            .single();

        if (fetchError || !game) {
            return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
        }

        // Resetear todos los jugadores a su estado inicial
        const { error: playersError } = await db
            .from('game_players')
            .update({
                position: 0,
                points: 0,
                wildcards: 0,
                failed_attempts: 0,
                status: 'active',
                current_question_id: null,
                last_action_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('game_id', gameId);

        if (playersError) {
            return NextResponse.json({ error: 'Error al resetear jugadores' }, { status: 500 });
        }

        // Obtener el primer jugador para asignar turno inicial
        const { data: players } = await db
            .from('game_players')
            .select('user_id')
            .eq('game_id', gameId)
            .limit(1);

        const firstTurn = players?.[0]?.user_id || null;

        // Resetear el estado de la partida
        const { error: gameError } = await db
            .from('games')
            .update({
                status: GameStatus.WAITING,
                started_at: null,
                finished_at: null,
                winner: null,
                current_turn: firstTurn,
                turn_start_time: new Date().toISOString(),
                queue: [],
                spectators: [],
                updated_at: new Date().toISOString(),
            })
            .eq('id', gameId);

        if (gameError) {
            return NextResponse.json({ error: 'Error al resetear partida' }, { status: 500 });
        }

        // Registrar el evento de reinicio
        await db.from('game_events').insert({
            game_id: gameId,
            player_id: null,
            event_type: 'admin_reset',
            event_data: {
                adminId: user.userId,
                resetAt: new Date().toISOString(),
                message: 'La partida fue reseteada por un administrador.',
            },
        });

        return NextResponse.json({
            success: true,
            gameId,
            message: 'Partida reseteada exitosamente. Todos los jugadores vuelven a la casilla 0.',
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export const POST = withAuth(handler, { requireAdmin: true });
