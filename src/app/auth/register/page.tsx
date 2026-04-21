'use client';

import RegisterForm from '@/components/auth/RegisterForm';
import { m } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="relative min-h-dvh flex items-start justify-center sm:items-center overflow-x-hidden overflow-y-auto bg-background px-3 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top)+0.5rem)] pb-[max(1rem,env(safe-area-inset-bottom)+0.75rem)]">
      {/* fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-125 h-125 bg-panama-green/7 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-panama-blue/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px]" />
      </div>

      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md pb-2 sm:pb-0"
      >
        {/* Encabezado */}
        <div className="text-center mb-5 sm:mb-8">
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-[clamp(2.5rem,11vw,3rem)] font-bold mb-2 leading-none">
              <span className="text-[#E32636] font-black tracking-tight">P</span><span className="text-[#FF7F00] font-black tracking-tight">a</span><span className="text-[#FFD700] font-black tracking-tight">r</span><span className="text-[#0055A4] font-black tracking-tight">k</span><span className="text-[#00BFFF] font-black tracking-tight">e</span><span className="text-[#32CD32] font-black tracking-tight">a</span><span className="text-[#228B22] font-black tracking-tight">n</span><span className="text-[#FF1493] font-black tracking-tight">d</span><span className="text-[#800080] font-black tracking-tight">o</span>
            </h1>
            <p className="text-muted-foreground text-sm">Crea tu cuenta para empezar</p>
          </m.div>
        </div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-4 sm:p-6 md:p-8 border-white/10"
        >
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Gamepad2 className="w-5 h-5 text-panama-yellow" />
            <h2 className="text-lg font-semibold text-foreground">Crear cuenta</h2>
          </div>
          <RegisterForm />
        </m.div>
      </m.div>
    </div>
  );
}
