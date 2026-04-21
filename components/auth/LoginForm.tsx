'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { m } from 'framer-motion';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al iniciar sesión');

      setAuth(data.user, data.tokens);

      // ✅ Redirect según on role
      if (data.user.is_admin) {
        sileo.success({ title: '¡Bienvenido, Administrador!' });
        router.push('/admin/dashboard');
      } else {
        sileo.success({ title: '¡Bienvenido de vuelta!' });
        router.push('/lobby');
      }
    } catch (error: any) {
      sileo.error({ title: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="email">Correo Electrónico</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="tu@email.com"
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            className="pl-10 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-1 top-1/2 -translate-y-1/2 size-10 md:size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors grid place-items-center"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={loading} variant="panama" size="lg" className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Iniciando sesión...
          </>
        ) : (
          <>
            Iniciar Sesión
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => router.push('/auth/register')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          ¿No tienes cuenta? Regístrate aquí
        </button>
      </div>
    </form>
  );
}
