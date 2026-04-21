import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * obtener /api/admin/games
 * Lista todas las partidas con paginación y detalles
 */
export const GET = withAuth(async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status'); // waiting | in_progress | finished
        const from = (page - 1) * limit;

        const db = getServiceSupabase();
        let query = db
            .from('games')
            .select(
                `
        id,
        status,
        created_at,
        started_at,
        finished_at,
        winner,
        spectators,
        queue,
        game_players (
          id,
          user_id,
          username,
          position,
          points,
          status,
          color,
          icon,
          wildcards
        )
      `,
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: games, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
        }

        const enrichedGames = (games || []).map((g: any) => ({
            id: g.id,
            status: g.status,
            createdAt: g.created_at,
            startedAt: g.started_at,
            finishedAt: g.finished_at,
            winner: g.winner,
            playerCount: (g.game_players || []).length,
            spectatorCount: Array.isArray(g.spectators) ? g.spectators.length : 0,
            queueCount: Array.isArray(g.queue) ? g.queue.length : Object.keys(g.queue || {}).length,
            durationMinutes: g.started_at && g.finished_at
                ? Math.round(
                    (new Date(g.finished_at).getTime() - new Date(g.started_at).getTime()) / 60000
                )
                : null,
            players: (g.game_players || []).map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                username: p.username,
                position: p.position,
                points: p.points,
                status: p.status,
                color: p.color,
                icon: p.icon,
                wildcards: p.wildcards,
            })),
            winnerName: (g.game_players || []).find((p: any) => p.user_id === g.winner)?.username ?? null,
        }));

        return NextResponse.json({
            games: enrichedGames,
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}, { requireAdmin: true });
