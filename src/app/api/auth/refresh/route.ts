import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { cleanupExpiredTokens, decryptEmail, encryptEmail, hashEmail } from '@/lib/security';
import { fetchIpQueryInfo, getRequestIp, normalizeIpQueryInfo } from '@/lib/ipquery';
import { isSuperAdminEmail } from '@/lib/super-admin';
import { getRefreshTokenFromRequest, setRefreshTokenCookie } from '@/lib/auth-cookies';

const looksLikeEmail = (value?: string | null) => Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

export async function POST(request: NextRequest) {
  // Disparar limpieza de forma asíncrona (sin esperar respuesta)
  cleanupExpiredTokens().catch(console.error);

  const supabaseAdmin = getServiceSupabase();
  try {
    const refreshToken = getRefreshTokenFromRequest(request);

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token requerido' }, { status: 400 });
    }

    // 1. Verificar firma JWT
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Refresh token inválido o expirado' }, { status: 401 });
    }

    // 2. Verificar que el jti exista en la lista de permitidos y no esté revocado
    const { data: stored, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('jti, revoked, expires_at, user_id')
      .eq('jti', payload.jti)
      .single();

    if (error || !stored || stored.revoked) {
      return NextResponse.json(
        { error: 'Refresh token inválido o ya utilizado. Por seguridad, inicia sesión de nuevo.' },
        { status: 401 }
      );
    }

    if (new Date(stored.expires_at) < new Date()) {
      // Limpiar token expirado
      await supabaseAdmin.from('refresh_tokens').update({ revoked: true, revoked_at: new Date().toISOString() }).eq('jti', payload.jti);
      return NextResponse.json({ error: 'Refresh token expirado' }, { status: 401 });
    }

    // 3. Verificar que el usuario siga activo y obtener datos necesarios
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, is_admin, is_active, username, spent_points, inventory, equipped, ip_info')
      .eq('id', stored.user_id)
      .single();

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Usuario inactivo o no encontrado' }, { status: 401 });
    }

    const decryptedEmail = decryptEmail(user.email);
    const resolvedEmail = looksLikeEmail(decryptedEmail)
      ? decryptedEmail
      : looksLikeEmail(payload.email)
        ? payload.email
        : '';

    if (!looksLikeEmail(decryptedEmail) && looksLikeEmail(payload.email)) {
      await supabaseAdmin
        .from('users')
        .update({
          email: encryptEmail(payload.email),
          email_key: hashEmail(payload.email),
        })
        .eq('id', user.id);
    }

    // 4. Revocar el viejo refresco token (rotación — previene reutilización)
    await supabaseAdmin
      .from('refresh_tokens')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('jti', payload.jti);

    // 5. Emitir nuevos tokens
    const tokenPayload = {
      userId: user.id,
      email: resolvedEmail,
      isAdmin: user.is_admin,
      isSuperAdmin: isSuperAdminEmail(resolvedEmail),
    };
    const newAccessToken = generateAccessToken(tokenPayload);
    const { token: newRefreshToken, jti: newJti } = generateRefreshToken(tokenPayload);

    // 6. Guardar nuevo refresco token en lista de permitidos
    const ip = getRequestIp(request);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('refresh_tokens').insert({
      jti: newJti,
      user_id: user.id,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || '',
    });

    const existingIpInfo = normalizeIpQueryInfo(user.ip_info);
    if (existingIpInfo?.ip !== ip) {
      try {
        const refreshedIpInfo = await fetchIpQueryInfo(ip, 2500);
        await supabaseAdmin.from('users').update({ ip_info: refreshedIpInfo }).eq('id', user.id);
      } catch (error) {
        console.warn('[IPQuery] Refresh enrichment skipped:', error);
      }
    }

    const response = NextResponse.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: resolvedEmail,
        username: user.username,
        is_admin: user.is_admin,
        is_super_admin: isSuperAdminEmail(resolvedEmail),
        is_active: user.is_active,
        spent_points: user.spent_points,
        inventory: user.inventory,
        equipped: user.equipped
      }
    });

    setRefreshTokenCookie(response, newRefreshToken);
    return response;
  } catch (error) {
    console.error('Error en refresh:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
