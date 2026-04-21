'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { TestIcon } from '@/components/test/TestIcons';

const TEST_ROUTES = [
  { href: '/test/preguntas', label: 'Preguntas QA', icon: 'questionCircle' as const },
  { href: '/test/qr-upload', label: 'QR Upload', icon: 'eyeScan' as const },
  { href: '/test/ruleta', label: 'Ruleta', icon: 'ferrisWheel' as const },
];

export default function TestRoutesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGuard requireAdmin requireSuperAdmin>
      <div className="relative min-h-screen overflow-x-hidden bg-[#030b1f] text-foreground">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -top-24 -left-16 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute top-0 right-0 h-112 w-md rounded-full bg-fuchsia-500/12 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-104 w-104 rounded-full bg-emerald-500/12 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.45),rgba(2,6,23,0.92))]" />
        </div>

        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300/80">Laboratorio interno</p>
                <h1 className="mt-1 flex items-center gap-2 text-lg font-black text-white sm:text-xl">
                  <TestIcon name="testTube" className="h-5 w-5 text-cyan-300" />
                  Panel de Testeo
                </h1>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                <TestIcon name="shieldCheck" className="h-4 w-4" />
                Super admin only
              </span>
            </div>

            <nav className="flex flex-wrap gap-2">
              {TEST_ROUTES.map((route) => {
                const isActive = pathname === route.href;

                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${isActive
                      ? 'border-cyan-300/45 bg-cyan-400/15 text-cyan-100'
                      : 'border-white/15 bg-white/5 text-white/75 hover:border-white/25 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <TestIcon name={route.icon} className="h-4 w-4" />
                    {route.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <div className="relative">{children}</div>
      </div>
    </AuthGuard>
  );
}
