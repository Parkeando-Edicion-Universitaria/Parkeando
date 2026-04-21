import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import './globals.css';
import ClientToaster from '@/components/ui/ClientToaster';
import HeartbeatHandler from '@/components/shared/HeartbeatHandler';
import MotionProvider from '@/components/shared/MotionProvider';
import BoneyardRegistry from '@/components/shared/BoneyardRegistry';

export const dynamic = 'force-dynamic';

const siteName = 'Parkeando Edición Universitaria';
const siteUrl = 'https://parkeando.xyz';
const openGraphBannerUrl = `${siteUrl}/opengraph-image`;
const twitterBannerUrl = `${siteUrl}/twitter-image`;

export const metadata: Metadata = {
  title: 'Parkeando - Descubre Panamá | Edición Universitaria',
  description:
    'Parkeando es un juego educativo e interactivo para descubrir la cultura, biodiversidad y turismo de Panamá en la Edición Universitaria.',
  applicationName: siteName,
  metadataBase: new URL(siteUrl),
  keywords: [
    'Parkeando',
    'Panamá',
    'juego educativo',
    'Edición Universitaria',
    'turismo en Panamá',
    'cultura panameña',
    'biodiversidad',
  ],
  authors: [{ name: 'Equipo Parkeando' }],
  creator: 'Equipo Parkeando',
  publisher: 'Parkeando',
  category: 'education',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.PNG',
    apple: '/icon.PNG',
  },
  appleWebApp: {
    capable: true,
    title: 'Parkeando',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Parkeando - Descubre Panamá | Edición Universitaria',
    description:
      '¿Estás listo para el reto? Explora Panamá mientras juegas con Parkeando: cultura, turismo y biodiversidad en una experiencia educativa.',
    url: siteUrl,
    siteName,
    images: [
      {
        url: openGraphBannerUrl,
        width: 1200,
        height: 630,
        alt: 'Banner de Parkeando con la frase ¿Estás listo para el reto?',
      },
    ],
    locale: 'es_PA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parkeando - Descubre Panamá | Edición Universitaria',
    description:
      '¿Estás listo para el reto? Descubre la cultura, turismo y biodiversidad de Panamá jugando Parkeando.',
    images: [twitterBannerUrl],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'og:image:secure_url': openGraphBannerUrl,
    'og:image:type': 'image/png',
    'twitter:image:alt': 'Banner de Parkeando con la frase ¿Estás listo para el reto?',
    'twitter:domain': 'parkeando.xyz',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Permitir pinch-zoom en el tablero, pero evitar zoom por doble toque en botones
  maximumScale: 5,
  userScalable: true,
  // Necesario para que las variables env() de safe-area-inset funcionen en el notch de iPhone
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#DA291C' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Forzar renderizado dinámico para que los scripts inline del framework reciban nonces CSP por request.
  await headers();

  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <noscript>
          <meta httpEquiv="refresh" content="0; url=/no-javascript" />
        </noscript>
      </head>
      <body suppressHydrationWarning>
        <BoneyardRegistry />
        <MotionProvider>
          <a
            href="#main-content"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-100 focus-visible:px-4 focus-visible:py-2 focus-visible:bg-panama-blue focus-visible:text-white focus-visible:rounded-lg focus-visible:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panama-yellow"
          >
            Saltar al contenido principal
          </a>
          {children}
          <footer className="relative z-10 py-8 text-center px-4 bg-background/50 backdrop-blur-sm border-t border-white/5">
            <div className="flex flex-wrap justify-center gap-4 mb-4 text-[10px] uppercase tracking-widest font-bold">
              <Link href="/about" className="text-muted-foreground hover:text-panama-blue transition-colors">Sobre el Proyecto</Link>
              <span className="text-white/10">•</span>
              <Link href="/rules" className="text-muted-foreground hover:text-panama-red transition-colors">Reglas</Link>
              <span className="text-white/10">•</span>
              <Link href="/terms" className="text-muted-foreground hover:text-panama-yellow transition-colors">Términos</Link>
              <span className="text-white/10">•</span>
              <Link href="/privacy" className="text-muted-foreground hover:text-panama-green transition-colors">Privacidad</Link>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Parkeando © 2026 · Juego educativo de la Edición Universitaria · Panamá
            </p>
          </footer>
          <ClientToaster />
          <HeartbeatHandler />
        </MotionProvider>
      </body>
    </html>
  );
}
