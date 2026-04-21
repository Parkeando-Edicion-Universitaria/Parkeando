'use client';

import { useRouter, redirect } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, BookOpen, MapPin, Trophy, Users, Map } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const prefersReducedMotion = useReducedMotion();

  if (isAuthenticated) {
    redirect(user?.is_admin ? '/admin/dashboard' : '/lobby');
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden bg-background">
      {/* ── Ambient fondo ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-panama-red/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-panama-blue/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-panama-yellow/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '-1.5s' }} />
        {/* sutiles grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* ── principal contenido ── */}
      <main id="main-content" className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-5 py-safe-top pt-12 pb-8 max-w-sm mx-auto">
        <h1 className="sr-only">Parkeando - Juego Educativo sobre Panamá</h1>

        {/* Badge */}
        <m.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -16 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-1.5 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground border border-white/10">
            <MapPin className="w-3 h-3 text-panama-yellow flex-shrink-0" />
            <span>Universidad Interamericana de Panamá</span>
          </div>
        </m.div>

        {/* Logo */}
        <m.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.5, type: 'spring', stiffness: 120 }
          }
          className="mb-3 text-center"
        >
          <Logo size="xl" className="drop-shadow-lg" />
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-muted-foreground mt-2">
            Edición Universitaria
          </p>
        </m.div>

        {/* Tagline */}
        <m.p
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.2, duration: prefersReducedMotion ? 0 : 0.4 }}
          className="text-base text-center text-muted-foreground mb-8 leading-relaxed"
        >
          Descubre Panamá en cada casilla
        </m.p>

        {/* CTA Buttons */}
        <m.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: prefersReducedMotion ? 0 : 0.45 }}
          className="w-full flex flex-col gap-3 mb-6"
        >
          <Button
            id="btn-login"
            variant="panama"
            size="lg"
            className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-panama-blue/20 active:scale-[0.98] transition-transform"
            aria-label="Iniciar Sesión"
            onClick={() => router.push('/auth/login')}
          >
            <LogIn className="w-5 h-5" aria-hidden="true" />
            Iniciar Sesión
          </Button>

          <Button
            id="btn-register"
            variant="panama-yellow"
            size="lg"
            className="w-full h-14 text-base font-bold text-white rounded-2xl shadow-lg shadow-panama-yellow/20 active:scale-[0.98] transition-transform"
            aria-label="Crear Cuenta"
            onClick={() => router.push('/auth/register')}
          >
            <UserPlus className="w-5 h-5" aria-hidden="true" />
            Crear Cuenta
          </Button>

          <Button
            id="btn-rules"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/rules')}
            className="text-muted-foreground hover:text-foreground mx-auto mt-1"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Ver reglas del juego
          </Button>
        </m.div>

        {/* Stats fila */}
        <m.div
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.5, duration: prefersReducedMotion ? 0 : 0.4 }}
          className="w-full grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Casillas', value: '120', icon: <Map className="w-4 h-4" /> },
            { label: 'Jugadores', value: '2–6', icon: <Users className="w-4 h-4" /> },
            { label: 'Provincias', value: '12', icon: <Trophy className="w-4 h-4" /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-3 text-center flex flex-col items-center gap-1 border border-white/8"
            >
              <span className="text-panama-yellow">{stat.icon}</span>
              <span className="text-xl font-black text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</span>
            </div>
          ))}
        </m.div>
      </main>
    </div>
  );
}
