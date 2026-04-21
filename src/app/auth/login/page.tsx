'use client';

import LoginForm from '@/components/auth/LoginForm';
import { m } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
  }));

  useEffect(() => {
    if (!hydrated || !user) return;
    router.replace(user.is_admin ? '/admin/dashboard' : '/lobby');
  }, [hydrated, router, user]);

  if (hydrated && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-2 border-panama-yellow/40 border-t-panama-yellow rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">Redirigiendo a tu sesión...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-x-hidden overflow-y-auto bg-background p-4 pt-[max(1rem,env(safe-area-inset-top)+0.75rem)] pb-[max(1rem,env(safe-area-inset-bottom)+0.75rem)]">
      {/* fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-125 h-125 bg-panama-blue/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-100 h-100 bg-panama-red/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px]" />
      </div>

      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Encabezado */}
        <div className="text-center mb-8">
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-[clamp(2.5rem,11vw,3rem)] font-bold mb-2 leading-none">
              <span className="text-[#E32636] font-black tracking-tight">P</span><span className="text-[#FF7F00] font-black tracking-tight">a</span><span className="text-[#FFD700] font-black tracking-tight">r</span><span className="text-[#0055A4] font-black tracking-tight">k</span><span className="text-[#00BFFF] font-black tracking-tight">e</span><span className="text-[#32CD32] font-black tracking-tight">a</span><span className="text-[#228B22] font-black tracking-tight">n</span><span className="text-[#FF1493] font-black tracking-tight">d</span><span className="text-[#800080] font-black tracking-tight">o</span>
            </h1>
            <p className="text-muted-foreground text-sm">Inicia sesión para competir</p>
          </m.div>
        </div>

        {/* Form carta */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-6 md:p-8 border-white/10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-panama-yellow" />
            <h2 className="text-lg font-semibold text-foreground">Acceder al juego</h2>
          </div>
          <LoginForm />
        </m.div>
      </m.div>
    </div>
  );
}
