'use client';

import { useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Send } from 'lucide-react';

export default function DataDeletionForm() {
  const [hcaptchaToken, setHcaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim() || '';
  const isCaptchaConfigured = hcaptchaSiteKey.length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isCaptchaConfigured) {
      event.preventDefault();
      setCaptchaError('Captcha no configurado. Contacta al administrador.');
      return;
    }

    if (!hcaptchaToken) {
      event.preventDefault();
      setCaptchaError('Completa el captcha antes de enviar la solicitud.');
    }
  };

  return (
    <form
      method="POST"
      action="/api/privacy/data-deletion"
      className="space-y-4"
      onSubmit={handleSubmit}
    >
      <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <input type="hidden" name="hcaptchaToken" value={hcaptchaToken} />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="deletion-name" className="text-sm font-semibold text-white">
            Nombre completo
          </label>
          <input
            id="deletion-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-panama-blue/50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="deletion-email" className="text-sm font-semibold text-white">
            Correo de la cuenta
          </label>
          <input
            id="deletion-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-panama-blue/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="deletion-username" className="text-sm font-semibold text-white">
          Usuario en Parkeando (opcional)
        </label>
        <input
          id="deletion-username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Tu usuario"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-panama-blue/50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="deletion-message" className="text-sm font-semibold text-white">
          Detalles de la solicitud
        </label>
        <textarea
          id="deletion-message"
          name="message"
          required
          rows={4}
          placeholder="Describe tu solicitud y cualquier dato que ayude a validar la cuenta."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-panama-blue/50"
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
        <input
          type="checkbox"
          name="deletion_confirmation"
          value="Acepto la eliminación de mi cuenta y datos"
          required
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-panama-red focus:ring-panama-red/40"
        />
        Confirmo que esta solicitud puede implicar la eliminación permanente de mi progreso, estadísticas e inventario.
      </label>

      <div className="flex justify-center py-2 overflow-hidden">
        {isCaptchaConfigured ? (
          <div className="origin-top scale-[0.92] sm:scale-100">
            <HCaptcha
              sitekey={hcaptchaSiteKey}
              onVerify={(token) => {
                setHcaptchaToken(token);
                setCaptchaError(null);
              }}
              onExpire={() => {
                setHcaptchaToken('');
              }}
              theme="dark"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-panama-yellow/30 bg-panama-yellow/10 px-4 py-3 text-sm text-white/90">
            Captcha no configurado. Define NEXT_PUBLIC_HCAPTCHA_SITE_KEY para habilitar el envío.
          </div>
        )}
      </div>

      {captchaError && (
        <p className="text-sm text-panama-red">{captchaError}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <p className="text-xs text-white/65">
          Al enviar, recibirás una confirmación por correo y una redirección de vuelta a esta página.
        </p>
        <button
          type="submit"
          disabled={!isCaptchaConfigured || !hcaptchaToken}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-panama-red/20 border border-panama-red/35 text-white font-semibold text-sm hover:bg-panama-red/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Enviar solicitud
        </button>
      </div>
    </form>
  );
}
