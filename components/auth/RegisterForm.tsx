'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { sileo } from 'sileo';
import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validatePasswordStrength,
} from '@/lib/validation';
import { containsProfanity } from '@/lib/profanity';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, User, Lock, CheckCircle2, XCircle, Loader2, ChevronRight, Eye, EyeOff } from 'lucide-react';

const PRIVACY_CONSENT_VERSION = 'ley81-2019-v2026-04';

export default function RegisterForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [hcaptchaToken, setHcaptchaToken] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '', username: '', password: '', confirmPassword: '',
  });
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: false, errors: [],
  });

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordStrength(validatePasswordStrength(password));
  };

  const validateUsername = (username: string): string | null => {
    if (username.length < USERNAME_MIN_LENGTH) {
      return `El nombre de usuario debe tener al menos ${USERNAME_MIN_LENGTH} caracteres`;
    }

    if (username.length > USERNAME_MAX_LENGTH) {
      return `El nombre de usuario no puede exceder ${USERNAME_MAX_LENGTH} caracteres`;
    }

    if (containsProfanity(username)) {
      return 'El nombre de usuario contiene palabras inapropiadas';
    }

    return null;
  };

  const handleUsernameChange = (rawValue: string) => {
    const sanitizedUsername = normalizeUsername(rawValue);
    setFormData((previous) => ({
      ...previous,
      username: sanitizedUsername,
    }));

    if (!sanitizedUsername) {
      setUsernameError(null);
      return;
    }

    setUsernameError(validateUsername(sanitizedUsername));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedUsername = normalizeUsername(formData.username);
    const usernameValidation = validateUsername(sanitizedUsername);

    if (usernameValidation) {
      setUsernameError(usernameValidation);
      sileo.error({ title: usernameValidation });
      return;
    }

    if (sanitizedUsername !== formData.username) {
      setFormData((previous) => ({ ...previous, username: sanitizedUsername }));
    }

    if (!passwordStrength.isValid) { sileo.error({ title: 'La contraseña no cumple los requisitos' }); return; }
    if (formData.password !== formData.confirmPassword) { sileo.error({ title: 'Las contraseñas no coinciden' }); return; }
    if (!acceptedPolicies) { sileo.error({ title: 'Debes aceptar los términos y la política de privacidad' }); return; }
    if (!hcaptchaToken) { sileo.error({ title: 'Por favor completa el captcha' }); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: sanitizedUsername,
          password: formData.password,
          hcaptchaToken,
          acceptedPolicies,
          consentVersion: PRIVACY_CONSENT_VERSION,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al registrarse');
      setAuth(data.user, data.tokens);
      sileo.success({ title: '¡Cuenta creada exitosamente!' });
      router.push('/lobby');
    } catch (error: any) {
      sileo.error({ title: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
      <div>
        <Label htmlFor="email">Correo Electrónico</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="email" type="email" required value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="tu@email.com" className="pl-10" />
        </div>
      </div>

      <div>
        <Label htmlFor="username">Nombre de Usuario</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="username" type="text" required value={formData.username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="usuario123" className="pl-10"
            minLength={USERNAME_MIN_LENGTH} maxLength={USERNAME_MAX_LENGTH}
            pattern="[A-Za-z0-9_]+" />
        </div>
        <div className="mt-2 flex flex-col items-start gap-1 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className={usernameError ? 'text-red-400' : 'text-muted-foreground'}>
            {usernameError || '3-20 caracteres. Solo letras, números y guión bajo (_).' }
          </p>
          <span className="shrink-0 text-muted-foreground">
            {formData.username.length}/{USERNAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="password" type={showPassword ? 'text' : 'password'} required value={formData.password}
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="••••••••" className="pl-10 pr-12" />
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
        {formData.password && (
          <div className="mt-2 space-y-1">
            {passwordStrength.isValid ? (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Contraseña segura
              </div>
            ) : (
              passwordStrength.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-red-400">
                  <XCircle className="w-3 h-3" /> {err}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword}
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="••••••••" className="pl-10 pr-12" />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
            title={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
            className="absolute right-1 top-1/2 -translate-y-1/2 size-10 md:size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors grid place-items-center"
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 sm:p-3">
        <div className="flex items-start gap-2.5">
          <input
            id="acceptPolicies"
            type="checkbox"
            checked={acceptedPolicies}
            onChange={(e) => setAcceptedPolicies(e.target.checked)}
            aria-label="Aceptar términos y condiciones y política de privacidad"
            title="Aceptar términos y condiciones y política de privacidad"
            className="mt-0.5 h-4 w-4 rounded border-white/30 bg-black/40 accent-panama-green"
          />
          <Label htmlFor="acceptPolicies" className="text-sm leading-relaxed text-white/85 cursor-pointer sm:text-xs">
            Acepto los{' '}
            <Link
              href="/terms"
              className="font-semibold text-panama-yellow hover:text-yellow-300 underline decoration-2 underline-offset-2 decoration-panama-yellow/80"
            >
              Términos y Condiciones
            </Link>{' '}
            y la{' '}
            <Link
              href="/privacy"
              className="font-semibold text-panama-cyan hover:text-cyan-300 underline decoration-2 underline-offset-2 decoration-panama-cyan/80"
            >
              Política de Privacidad
            </Link>
            .
          </Label>
        </div>
      </div>

      <div className="flex justify-center py-1 sm:py-2 overflow-x-auto">
        <div className="origin-top scale-[0.84] min-[360px]:scale-[0.9] sm:scale-100">
          <HCaptcha
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
            onVerify={(token) => setHcaptchaToken(token)}
            onExpire={() => setHcaptchaToken('')}
            theme="dark"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={
          loading ||
          !passwordStrength.isValid ||
          !acceptedPolicies ||
          !!usernameError ||
          formData.username.length < USERNAME_MIN_LENGTH
        }
        variant="panama" size="lg" className="w-full h-12 sm:h-11">
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
        ) : (
          <>Crear Cuenta <ChevronRight className="w-4 h-4" /></>
        )}
      </Button>

      <div className="text-center pt-1 sm:pt-2">
        <button type="button" onClick={() => router.push('/auth/login')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
          ¿Ya tienes cuenta? Inicia sesión aquí
        </button>
      </div>
    </form>
  );
}
