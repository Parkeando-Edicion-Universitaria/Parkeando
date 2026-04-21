/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Ocultar el header "X-Powered-By: Next.js" para no exponer el stack
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'parkeando.xyz',
      },
      {
        protocol: 'https',
        hostname: 'www.parkeando.xyz',
      }
    ],
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()',
      },
    ];

    const pageHeaders = {
      // Seguridad en todas las rutas de páginas (NO assets estáticos)
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      headers: [
        ...securityHeaders,
        // No cachear HTML de páginas (siempre fresco)
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    };

    const apiHeaders = {
      // Solo APIs: no cachear nunca
      source: '/api/((?!scoreboard).*)',
      headers: [
        ...securityHeaders,
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
      ],
    };

    const scoreboardHeaders = {
      // Scoreboard con stale-while-revalidate (datos semi-públicos)
      source: '/api/scoreboard',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=60' },
      ],
    };

    return isDev
      ? [pageHeaders, apiHeaders, scoreboardHeaders]
      : [pageHeaders, apiHeaders, scoreboardHeaders];
  },
};

module.exports = nextConfig;
