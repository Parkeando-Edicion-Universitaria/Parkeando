import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { decryptEmail, encryptEmail, hashEmail } from '@/lib/security';
import { normalizeIpQueryInfo } from '@/lib/ipquery';
import { isSuperAdminEmail } from '@/lib/super-admin';

const looksLikeEmail = (value?: string | null) => Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
const DEFAULT_USERS_PAGE_SIZE = 40;
const MAX_USERS_PAGE_SIZE = 120;

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const pageParam = Number(url.searchParams.get('page') || '1');
    const limitParam = Number(url.searchParams.get('limit') || String(DEFAULT_USERS_PAGE_SIZE));
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit = Number.isFinite(limitParam)
      ? Math.min(MAX_USERS_PAGE_SIZE, Math.max(1, Math.floor(limitParam)))
      : DEFAULT_USERS_PAGE_SIZE;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const db = getServiceSupabase();
    const { data: users, error, count } = await db
      .from('users')
      .select('id, email, username, is_active, is_admin, created_at, last_login_at, ip_info, last_seen_at, current_location, games_won, total_points, spent_points, games_played', { count: 'planned' })
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    if (!users?.length) {
      return NextResponse.json({
        users: [],
        page,
        limit,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
      });
    }

    const userIds = users.map((user) => user.id);
    const lookupWindow = Math.max(300, limit * 20);

    const [{ data: tokenRows, error: tokenError }, { data: loginRows, error: loginError }] = await Promise.all([
      db
        .from('refresh_tokens')
        .select('user_id, ip_address, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(lookupWindow),
      db
        .from('login_attempts')
        .select('user_id, ip_address, attempted_at')
        .in('user_id', userIds)
        .eq('success', true)
        .order('attempted_at', { ascending: false })
        .limit(lookupWindow),
    ]);

    if (tokenError) throw tokenError;
    if (loginError) throw loginError;

    const latestTokenByUser = new Map<string, { ip_address: string; created_at: string }>();
    for (const row of tokenRows ?? []) {
      if (!row.user_id || latestTokenByUser.has(row.user_id)) continue;
      latestTokenByUser.set(row.user_id, {
        ip_address: String(row.ip_address),
        created_at: row.created_at,
      });
    }

    const latestLoginByUser = new Map<string, { ip_address: string; attempted_at: string }>();
    for (const row of loginRows ?? []) {
      if (!row.user_id || latestLoginByUser.has(row.user_id)) continue;
      latestLoginByUser.set(row.user_id, {
        ip_address: String(row.ip_address),
        attempted_at: row.attempted_at,
      });
    }

    const normalizedUsers = [];

    for (const user of users) {
      const ipInfo = normalizeIpQueryInfo(user.ip_info);
      const latestToken = latestTokenByUser.get(user.id);
      const latestLogin = latestLoginByUser.get(user.id);
      const decryptedEmail = decryptEmail(user.email);
      const fallbackSessionEmail =
        user.id === req.user?.userId && looksLikeEmail(req.user?.email) ? req.user?.email : null;
      const resolvedEmail = looksLikeEmail(decryptedEmail)
        ? decryptedEmail
        : fallbackSessionEmail || '';

      if (!looksLikeEmail(decryptedEmail) && fallbackSessionEmail) {
        await db
          .from('users')
          .update({
            email: encryptEmail(fallbackSessionEmail),
            email_key: hashEmail(fallbackSessionEmail),
          })
          .eq('id', user.id);
      }

      normalizedUsers.push({
        ...user,
        total_points: Math.max(0, (user.total_points || 0) - (user.spent_points || 0)),
        email: resolvedEmail,
        is_super_admin: isSuperAdminEmail(resolvedEmail),
        ip_info: ipInfo,
        last_ip_address: latestToken?.ip_address ?? latestLogin?.ip_address ?? ipInfo?.ip ?? null,
        last_auth_at: latestToken?.created_at ?? latestLogin?.attempted_at ?? user.last_login_at ?? null,
      });
    }

    return NextResponse.json({
      users: normalizedUsers,
      page,
      limit,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}, { requireAdmin: true });
