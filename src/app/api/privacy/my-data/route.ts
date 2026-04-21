import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { normalizeIpQueryInfo } from '@/lib/ipquery';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.userId;
    const supabaseAdmin = getServiceSupabase();

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(
        'id, username, role, created_at, updated_at, last_login_at, is_active, games_played, games_won, total_points, spent_points, inventory, equipped, ip_info'
      )
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[PrivacyMyData] Error obteniendo usuario:', userError);
      return NextResponse.json({ error: 'No se pudieron obtener tus datos.' }, { status: 500 });
    }

    const { data: playerStats } = await supabaseAdmin
      .from('player_stats')
      .select('games_played, games_won, total_points')
      .eq('user_id', userId)
      .maybeSingle();

    const ipInfoRecord = user.ip_info && typeof user.ip_info === 'object'
      ? (user.ip_info as Record<string, unknown>)
      : null;

    const consentRecord = ipInfoRecord?.consent ?? null;

    const payload = {
      generatedAt: new Date().toISOString(),
      lawReference: 'Ley 81 de 26 de marzo de 2019 (Panamá)',
      rightsModel: 'ARCO',
      user: {
        id: user.id,
        email: req.user?.email || null,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
      },
      gameProfile: {
        games_played: user.games_played || 0,
        games_won: user.games_won || 0,
        total_points: user.total_points || 0,
        spent_points: user.spent_points || 0,
        available_points: Math.max(0, (user.total_points || 0) - (user.spent_points || 0)),
      },
      inventory: user.inventory || [],
      equipped: user.equipped || {},
      playerStats: playerStats || null,
      security: {
        last_ip_info: normalizeIpQueryInfo(user.ip_info),
        consent_record: consentRecord,
      },
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[PrivacyMyData] Error inesperado:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
});