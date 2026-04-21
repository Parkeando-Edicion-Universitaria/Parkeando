import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { hashPassword, encryptEmail, hashEmail, verifyHCaptcha, checkRateLimit } from '@/lib/security';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import {
  normalizeUsername,
  registerSchema,
  sanitizeEmail,
  USERNAME_MIN_LENGTH,
} from '@/lib/validation';
import { fetchIpQueryInfo, getRequestIp } from '@/lib/ipquery';
import { isSuperAdminEmail } from '@/lib/super-admin';
import { setRefreshTokenCookie } from '@/lib/auth-cookies';

const DEFAULT_CONSENT_VERSION = 'ley81-2019-v2026-04';

export async function POST(request: NextRequest) {
  const supabaseAdmin = getServiceSupabase();
  try {
    // 1. tasa limitación por IP
    const ip = getRequestIp(request);
    if (!(await checkRateLimit(`register_${ip}`, 3, 300000))) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta en 5 min.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 2. Validar datos con Zod
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, username, password, hcaptchaToken, consentVersion } = validation.data;

    // 3. Verificar hCaptcha
    const captchaValid = await verifyHCaptcha(hcaptchaToken);
    if (!captchaValid) {
      return NextResponse.json({ error: 'Verificación de captcha fallida' }, { status: 400 });
    }

    // 4. Sanitizar inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedUsername = normalizeUsername(username);

    if (sanitizedUsername.length < USERNAME_MIN_LENGTH) {
      return NextResponse.json({ error: 'Nombre de usuario inválido (mínimo 3 caracteres alfanuméricos)' }, { status: 400 });
    }

    const { containsProfanity } = await import('@/lib/profanity');
    if (containsProfanity(sanitizedUsername)) {
      return NextResponse.json({ error: 'El nombre de usuario contiene palabras inapropiadas o prohibidas' }, { status: 400 });
    }

    // Hash y Encrypt Email
    const emailKey = hashEmail(sanitizedEmail);
    const encryptedEmail = encryptEmail(sanitizedEmail);

    // 5. Verificar email duplicado
    const { data: existingEmailUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email_key', emailKey)
      .maybeSingle();

    if (existingEmailUser) {
      return NextResponse.json({ error: 'El email ya está en uso' }, { status: 409 });
    }

    // 6. Verificar username duplicado (case-insensitive)
    const escapedUsernamePattern = sanitizedUsername.replace(/[\\%_]/g, (token) => `\\${token}`);
    const { data: existingUsernameUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('username', escapedUsernamePattern)
      .limit(1)
      .maybeSingle();

    if (existingUsernameUser) {
      return NextResponse.json({ error: 'El nombre de usuario ya está en uso' }, { status: 409 });
    }

    // 7. Hashear contraseña
    const passwordHash = await hashPassword(password);

    // 8. Obtener info de IP (VPN, ISP, país) - opcional y con tiempo de espera para no bloquear
    let ipInfo = null;
    try {
      ipInfo = await fetchIpQueryInfo(ip, 2500);
    } catch (e) {
      console.warn('[IPQuery] Skip or timeout fetching IP data:', e);
    }

    const consentAcceptedAt = new Date().toISOString();
    const normalizedConsentVersion = (consentVersion || DEFAULT_CONSENT_VERSION).trim().slice(0, 64) || DEFAULT_CONSENT_VERSION;
    const persistedIpInfo = {
      ...(ipInfo || { ip }),
      consent: {
        law: 'Ley 81 de 2019 (Panamá)',
        accepted_at: consentAcceptedAt,
        version: normalizedConsentVersion,
        source: 'register_form',
      },
    };

    // 9. Crear usuario
    const isAdminEmail = isSuperAdminEmail(sanitizedEmail);
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email_key: emailKey,
        email: encryptedEmail,
        username: sanitizedUsername,
        password: passwordHash,
        role: isAdminEmail ? 'admin' : 'user',
        ip_info: persistedIpInfo,
      })
      .select('id, email, username, created_at, role, is_active, spent_points, inventory, equipped')
      .single();

    if (createError) {
      if ((createError as any).code === '23505') {
        return NextResponse.json({ error: 'El email o nombre de usuario ya está en uso (conflicto concurrente)' }, { status: 409 });
      }
      console.error('Error al crear usuario:', createError);
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
    }

    if (!newUser) {
      return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 });
    }

    // Crear estadísticas iniciales (no crítico si falla)
    try {
      await supabaseAdmin.from('player_stats').insert({ user_id: newUser.id });
    } catch {
      // player_stats puede no existir en todos los deploys
    }

    // 10. Generar tokens (usando el email sanitizado, ya que la DB no lo devuelve en texto plano)
    const tokenPayload = {
      userId: newUser.id,
      email: sanitizedEmail,
      isAdmin: isAdminEmail,
      isSuperAdmin: isAdminEmail,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const { token: refreshToken, jti } = generateRefreshToken(tokenPayload);

    // 11. Guardar refresco token en lista de permitidos
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('refresh_tokens').insert({
      jti,
      user_id: newUser.id,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || '',
    });

    // 12. Respuesta con datos completos
    const { email: _em, role: userRole, ...restUser } = newUser;
    const response = NextResponse.json({
      user: {
        ...restUser,
        email: sanitizedEmail,
        is_admin: isAdminEmail,
        is_super_admin: isAdminEmail,
        role: userRole
      },
      tokens: { accessToken },
    });

    setRefreshTokenCookie(response, refreshToken);
    return response;
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
