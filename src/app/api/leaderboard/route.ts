import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const GET = async (req: NextRequest) => {
    try {
        const db = getServiceSupabase();

        const { data: rankedUsers } = await db
            .from('users')
            .select('username, games_won, total_points, spent_points')
            .eq('is_active', true)
            .limit(200);

        const topPlayers = (rankedUsers || [])
            .map((player: any) => ({
                username: player.username,
                gamesWon: player.games_won || 0,
                totalPoints: Math.max(0, (player.total_points || 0) - (player.spent_points || 0)),
            }))
            .sort((a, b) => {
                if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
                return b.totalPoints - a.totalPoints;
            })
            .slice(0, 10);

        return NextResponse.json({ leaderboard: topPlayers }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
