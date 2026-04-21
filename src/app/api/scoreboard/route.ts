import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const SCOREBOARD_CACHE_TTL_MS = 20_000;
const SCOREBOARD_CACHE_CONTROL = 'public, max-age=20, s-maxage=30, stale-while-revalidate=60';
let scoreboardCache: { expiresAt: number; payload: { scoreboard: any[] } } | null = null;

// La vista scoreboard no requiere autenticación (datos públicos)
export async function GET(_req: NextRequest) {
    try {
        const now = Date.now();
        if (scoreboardCache && scoreboardCache.expiresAt > now) {
            return NextResponse.json(scoreboardCache.payload, {
                status: 200,
                headers: {
                    'Cache-Control': SCOREBOARD_CACHE_CONTROL,
                },
            });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('users')
            .select('username, games_won, total_points, spent_points, games_played, is_active')
            .eq('is_active', true)
            .limit(200);

        if (error) {
            console.error('Error al obtener scoreboard:', error);
            return NextResponse.json({ error: 'Error al obtener el scoreboard' }, { status: 500 });
        }

        const scoreboard = (data || [])
            .map((player: any) => {
                const totalPoints = Math.max(0, (player.total_points || 0) - (player.spent_points || 0));
                const gamesPlayed = player.games_played || 0;
                const gamesWon = player.games_won || 0;
                const winRate = gamesPlayed > 0 ? Number(((gamesWon / gamesPlayed) * 100).toFixed(1)) : 0;

                return {
                    username: player.username,
                    games_won: gamesWon,
                    total_points: totalPoints,
                    games_played: gamesPlayed,
                    win_rate_pct: winRate,
                };
            })
            .sort((a, b) => {
                if (b.games_won !== a.games_won) return b.games_won - a.games_won;
                return b.total_points - a.total_points;
            })
            .slice(0, 5)
            .map((player, index) => ({
                rank: index + 1,
                ...player,
            }));

        const payload = { scoreboard };
        scoreboardCache = {
            payload,
            expiresAt: now + SCOREBOARD_CACHE_TTL_MS,
        };

        return NextResponse.json(
            payload,
            {
                status: 200,
                headers: {
                    'Cache-Control': SCOREBOARD_CACHE_CONTROL,
                },
            }
        );
    } catch (error) {
        console.error('Error en scoreboard:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
