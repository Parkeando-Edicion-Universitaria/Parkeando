import { NextRequest, NextResponse } from 'next/server';

const buildCspHeader = (nonce: string, isDev: boolean): string => {
  const scriptSrcDirectives = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://hcaptcha.com',
    'https://*.hcaptcha.com',
  ];

  if (isDev) {
    scriptSrcDirectives.splice(1, 0, "'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrcDirectives.join(' ')}`,
    "frame-src https://hcaptcha.com https://*.hcaptcha.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://hcaptcha.com https://*.hcaptcha.com https://api.ipquery.io",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    !isDev ? 'upgrade-insecure-requests' : '',
  ]
    .filter(Boolean)
    .join('; ');
};

const generateNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

export function proxy(request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
