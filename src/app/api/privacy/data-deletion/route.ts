import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, verifyHCaptcha } from '@/lib/security';
import { getRequestIp } from '@/lib/ipquery';
import { getConfiguredSuperAdminEmail } from '@/lib/super-admin';
import { sanitizeEmail } from '@/lib/validation';

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_MAX_PER_WINDOW = 3;
const STATUS_COOKIE_NAME = 'privacy_deletion_status';
const STATUS_COOKIE_MAX_AGE_SECONDS = 12;

const deletionRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  username: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10).max(3000),
  deletionConfirmation: z.string().trim().min(1),
  hcaptchaToken: z.string().trim().max(4000).optional(),
});

const textFromForm = (value: FormDataEntryValue | null, maxLength: number) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\u0000/g, '').trim().slice(0, maxLength);
};

const textFromHeader = (value: string | null, maxLength: number) => {
  if (!value) return '';
  return value.replace(/\u0000/g, '').trim().slice(0, maxLength);
};

const redirectToPrivacy = (request: NextRequest, status: string) => {
  const url = new URL('/privacy', request.url);
  url.hash = 'solicitud-eliminacion';
  const response = NextResponse.redirect(url, { status: 303 });

  response.cookies.set({
    name: STATUS_COOKIE_NAME,
    value: status,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/privacy',
    maxAge: STATUS_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
};

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);

  if (!(await checkRateLimit(`privacy_data_deletion_${ip}`, REQUEST_MAX_PER_WINDOW, REQUEST_WINDOW_MS))) {
    return redirectToPrivacy(request, 'rate_limit');
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return redirectToPrivacy(request, 'invalid');
  }

  // Honeypot anti-bot: si viene con valor, rechazar la solicitud sin reenviar correo.
  const honey = textFromForm(formData.get('_honey'), 200);
  if (honey) {
    return redirectToPrivacy(request, 'invalid');
  }

  const parsed = deletionRequestSchema.safeParse({
    name: textFromForm(formData.get('name'), 120),
    email: textFromForm(formData.get('email'), 200),
    username: textFromForm(formData.get('username'), 60) || undefined,
    message: textFromForm(formData.get('message'), 3000),
    deletionConfirmation: textFromForm(formData.get('deletion_confirmation'), 200),
    hcaptchaToken: textFromForm(formData.get('hcaptchaToken'), 4000),
  });

  if (!parsed.success) {
    return redirectToPrivacy(request, 'invalid');
  }

  if (!parsed.data.hcaptchaToken) {
    return redirectToPrivacy(request, 'captcha');
  }

  const captchaValid = await verifyHCaptcha(parsed.data.hcaptchaToken);
  if (!captchaValid) {
    return redirectToPrivacy(request, 'captcha');
  }

  const endpointFromEnv = textFromHeader(
    process.env.FORMSUBMIT_DELETION_ENDPOINT || null,
    500
  );
  const ccFromEnv = textFromHeader(
    process.env.FORMSUBMIT_DELETION_CC || null,
    500
  );
  const fallbackRecipient = getConfiguredSuperAdminEmail();
  const destination = endpointFromEnv || (fallbackRecipient
    ? `https://formsubmit.co/${encodeURIComponent(fallbackRecipient)}`
    : '');

  if (!destination) {
    console.error('[PrivacyDeletion] No se encontró destino para FormSubmit (FORMSUBMIT_DELETION_ENDPOINT o SUPER_ADMIN_EMAIL).');
    return redirectToPrivacy(request, 'error');
  }

  const normalizedEmail = sanitizeEmail(parsed.data.email);
  const userAgent = textFromHeader(request.headers.get('user-agent'), 500) || 'unknown';

  const payload = new URLSearchParams();
  payload.set('_subject', 'Solicitud de eliminación de datos - Parkeando');
  payload.set('_template', 'table');
  payload.set('_replyto', normalizedEmail);
  payload.set('_blacklist', 'http://,https://,casino,crypto,viagra');
  payload.set('_autoresponse', 'Recibimos tu solicitud de eliminación de datos. Te responderemos por este mismo correo tras validar tu identidad.');
  if (ccFromEnv) {
    payload.set('_cc', ccFromEnv);
  }

  payload.set('request_type', 'eliminacion_datos');
  payload.set('name', parsed.data.name);
  payload.set('email', normalizedEmail);
  if (parsed.data.username) {
    payload.set('username', parsed.data.username);
  }
  payload.set('message', parsed.data.message);
  payload.set('deletion_confirmation', parsed.data.deletionConfirmation);
  payload.set('request_ip', ip);
  payload.set('user_agent', userAgent);
  payload.set('submitted_at', new Date().toISOString());
  payload.set('source', 'privacy_page');

  try {
    const response = await fetch(destination, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[PrivacyDeletion] FormSubmit respondió con estado ${response.status}.`);
      return redirectToPrivacy(request, 'error');
    }

    return redirectToPrivacy(request, 'sent');
  } catch (error) {
    console.error('[PrivacyDeletion] Error enviando solicitud:', error);
    return redirectToPrivacy(request, 'error');
  }
}
