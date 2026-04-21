import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { comparePassword, hashEmail, cleanupExpiredTokens, checkRateLimit } from '@/lib/security';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { loginSchema, sanitizeEmail } from '@/lib/validation';
import { fetchIpQueryInfo, getRequestIp, normalizeIpQueryInfo } from '@/lib/ipquery';
import { isSuperAdminEmail } from '@/lib/super-admin';
import { setRefreshTokenCookie } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  // Disparar limpieza de forma asíncrona
  cleanupExpiredTokens().catch(console.error);

  const supabaseAdmin = getServiceSupabase();
  try {
    // 1. tasa limitación por IP (capa de memoria rápida)
    const ip = getRequestIp(request);
    if (!(await checkRateLimit(`login_${ip}`, 10, 300000))) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 5 minutos.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 2. Validar datos de entrada
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const sanitizedEmail = sanitizeEmail(email);
    const userAgent = request.headers.get('user-agent') || '';

    // 3. Buscar usuario (usando hash seguro)
    const emailKey = hashEmail(sanitizedEmail);

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, username, password, role, locked_until, failed_login_count, is_active, ip_info, spent_points, inventory, equipped')
      .eq('email_key', emailKey)
      .single();

    // Respuesta genérica para no revelar si el email existe
    const invalidCredentialsResponse = NextResponse.json(
      { error: 'Credenciales inválidas' },
      { status: 401 }
    );

    if (userError || !user) {
      // Log intento aunque el usuario no exista (previene enumeración con timing)
      await supabaseAdmin.from('login_attempts').insert({
        user_id: null,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
      });
      return invalidCredentialsResponse;
    }

    // 4. Verificar si la cuenta está activa
    if (!user.is_active) {
      return NextResponse.json({ error: 'Cuenta desactivada. Contacta al administrador.' }, { status: 403 });
    }

    // 5. Verificar lockout de cuenta
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockTime = new Date(user.locked_until);
      const minutesLeft = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
      await supabaseAdmin.from('login_attempts').insert({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
      });
      return NextResponse.json(
        {
          error: `Cuenta bloqueada por múltiples intentos fallidos. Puedes intentarlo en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.`,
          locked_until: user.locked_until,
        },
        { status: 423 }
      );
    }

    // 6. Verificar contraseña
    const passwordValid = await comparePassword(password, user.password);

    if (!passwordValid) {
      // Incrementar contador y bloquear si llega a 5
      const newCount = (user.failed_login_count || 0) + 1;
      const shouldLock = newCount >= 5;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : user.locked_until;

      await supabaseAdmin
        .from('users')
        .update({
          failed_login_count: newCount,
          locked_until: lockedUntil,
        })
        .eq('id', user.id);

      await supabaseAdmin.from('login_attempts').insert({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
      });

      if (shouldLock) {
        return NextResponse.json(
          { error: 'Cuenta bloqueada por 15 minutos debido a múltiples intentos fallidos.' },
          { status: 423 }
        );
      }

      return invalidCredentialsResponse;
    }

    // 7. Login exitoso — conseguir IP info
    let ipInfo = normalizeIpQueryInfo(user.ip_info);
    try {
      ipInfo = await fetchIpQueryInfo(ip, 2500);
    } catch (e) {
      console.warn('[IPQuery] Fetch error:', e);
    }

    const rawIpInfo = user.ip_info && typeof user.ip_info === 'object'
      ? (user.ip_info as Record<string, unknown>)
      : null;
    const persistedConsent = rawIpInfo?.consent;
    const mergedIpInfo = persistedConsent
      ? {
          ...(ipInfo || { ip }),
          consent: persistedConsent,
        }
      : ipInfo;

    // Actualizar estado de cuenta
    await supabaseAdmin
      .from('users')
      .update({
        failed_login_count: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        ip_info: mergedIpInfo,
      })
      .eq('id', user.id);

    // 8. Generar tokens (usando sanitizedEmail ya que la DB solo tiene el hash)
    const isAdmin = user.role === 'admin';
    const isSuperAdmin = isSuperAdminEmail(sanitizedEmail);
    const tokenPayload = { userId: user.id, email: sanitizedEmail, isAdmin, isSuperAdmin };
    const accessToken = generateAccessToken(tokenPayload);
    const { token: refreshToken, jti } = generateRefreshToken(tokenPayload);

    // 9. Guardar refresco token en lista de permitidos
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('refresh_tokens').insert({
      jti,
      user_id: user.id,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: userAgent,
    });

    // 10. Log intento exitoso
    await supabaseAdmin.from('login_attempts').insert({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
    });

    // 11. Respuesta sin datos sensibles
    const { password: _pw, failed_login_count, locked_until, email: _em, ...safeUser } = user;

    const response = NextResponse.json({
      user: { ...safeUser, email: sanitizedEmail, is_admin: isAdmin, is_super_admin: isSuperAdmin },
      tokens: { accessToken },
    });

    setRefreshTokenCookie(response, refreshToken);
    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
