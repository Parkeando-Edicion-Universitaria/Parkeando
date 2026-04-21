import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';

const ADMIN_STATS_CACHE_TTL_MS = 45_000;
let adminStatsCache: { expiresAt: number; payload: any } | null = null;

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const now = Date.now();
    if (adminStatsCache && adminStatsCache.expiresAt > now) {
      return NextResponse.json(adminStatsCache.payload, {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=30',
        },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const onlineSince = new Date(Date.now() - 60_000).toISOString();
    const db = getServiceSupabase();
    const countMode = 'planned' as const;

    const [
      { count: totalUsers },
      { count: totalGames },
      { count: activeGames },
      { count: waitingGames },
      { count: finishedGames },
      { count: onlineUsers },
      { count: totalQuestions },
      { data: recentGames },
      { data: todayEvents },
      { data: avgDurationData },
    ] = await Promise.all([
      db.from('users').select('id', { count: countMode, head: true }),
      db.from('games').select('id', { count: countMode, head: true }),
      db.from('games').select('id', { count: countMode, head: true }).eq('status', 'in_progress'),
      db.from('games').select('id', { count: countMode, head: true }).eq('status', 'waiting'),
      db.from('games').select('id', { count: countMode, head: true }).eq('status', 'finished'),
      db.from('users').select('id', { count: countMode, head: true }).gte('last_seen_at', onlineSince),
      db.from('questions').select('id', { count: countMode, head: true }),
      db
        .from('games')
        .select(`
          id, status, created_at, started_at, finished_at, winner, queue,
          game_players(id, username, position, points, status)
        `)
        .order('created_at', { ascending: false })
        .limit(10),
      db
        .from('game_events')
        .select('event_type, event_data')
        .gte('created_at', todayISO)
        .in('event_type', ['wildcard_used', 'battle_juega_vivo', 'cell_effect', 'queue_inactive_kick'])
        .order('created_at', { ascending: false })
        .limit(800),
      db
        .from('games')
        .select('started_at, finished_at')
        .eq('status', 'finished')
        .not('started_at', 'is', null)
        .not('finished_at', 'is', null)
        .gte('finished_at', todayISO),
    ]);

    // Calcular métricas de eventos de hoy
    const todayList = todayEvents || [];
    const wildcardsUsedToday = todayList.filter((e: any) => e.event_type === 'wildcard_used').length;
    const battlesToday = todayList.filter((e: any) => e.event_type === 'battle_juega_vivo').length;
    const jailsToday = todayList.filter(
      (e: any) => e.event_type === 'cell_effect' && e.event_data?.effect === 'carcel'
    ).length;
    const specialCellsToday = todayList.filter((e: any) => e.event_type === 'cell_effect').length;
    const inactiveKicksToday = todayList.filter((e: any) => e.event_type === 'queue_inactive_kick').length;

    // Promedio de duración de partidas de hoy (en minutos)
    const durations = (avgDurationData || []).map((g: any) => {
      const start = new Date(g.started_at).getTime();
      const end = new Date(g.finished_at).getTime();
      return (end - start) / 60000;
    });
    const avgGameDurationMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
        : null;

    // Enriquecer partidas recientes
    const enrichedRecent = (recentGames || []).map((g: any) => ({
      id: g.id,
      status: g.status,
      createdAt: g.created_at,
      startedAt: g.started_at,
      finishedAt: g.finished_at,
      winner: g.winner,
      playerCount: (g.game_players || []).length,
      queueCount: (g.queue || []).length,
      durationMinutes:
        g.started_at && g.finished_at
          ? Math.round(
            (new Date(g.finished_at).getTime() - new Date(g.started_at).getTime()) / 60000
          )
          : null,
    }));

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
      .slice(0, 5);

    const payload = {
      // Totales globales
      totalUsers: totalUsers || 0,
      totalGames: totalGames || 0,
      activeGames: activeGames || 0,
      waitingGames: waitingGames || 0,
      finishedGames: finishedGames || 0,
      onlineUsers: onlineUsers || 0,
      totalQuestions: totalQuestions || 0,
      // Métricas de hoy
      today: {
        wildcardsUsed: wildcardsUsedToday,
        battles: battlesToday,
        jails: jailsToday,
        specialCells: specialCellsToday,
        inactiveQueueKicks: inactiveKicksToday,
        avgGameDurationMinutes,
      },
      // Partidas recientes
      recentGames: enrichedRecent,
      topPlayers,
    };

    adminStatsCache = {
      payload,
      expiresAt: now + ADMIN_STATS_CACHE_TTL_MS,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}, { requireAdmin: true });
