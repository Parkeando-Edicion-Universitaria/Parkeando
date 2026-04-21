import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import DataDeletionForm from '@/components/privacy/DataDeletionForm';
import DataRightsPanel from '@/components/privacy/DataRightsPanel';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  FileClock,
  Server,
  Trash2,
  Mail,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad · Parkeando Edición Universitaria',
  description:
    'Conoce qué datos recopila Parkeando Edición Universitaria, para qué se usan y cómo puedes ejercer tus derechos.',
};

const dataItems = [
  {
    icon: CheckCircle2,
    color: 'text-panama-green',
    bg: 'bg-panama-green/10',
    border: 'border-panama-green/20',
    title: 'Datos que sí tratamos',
    items: [
      'Correo electrónico (cifrado en base de datos) y su hash técnico para validación',
      'Nombre de usuario público y datos del perfil de juego',
      'Contraseña protegida con hash seguro (no se almacena en texto plano)',
      'IP, user-agent e intentos de inicio de sesión para seguridad y antifraude',
      'Tokens de sesión/refresh para mantener tu sesión activa',
      'Eventos de juego y chat para funcionamiento, moderación y auditoría',
      'Estadísticas (partidas, victorias, puntos), inventario y personalización',
    ],
  },
  {
    icon: AlertCircle,
    color: 'text-panama-red',
    bg: 'bg-panama-red/10',
    border: 'border-panama-red/20',
    title: 'Datos que NO tratamos',
    items: [
      'Datos bancarios o de pago',
      'Documentos oficiales de identidad',
      'Geolocalización GPS en tiempo real del dispositivo',
      'Datos biométricos o de salud',
      'Contenido de otras apps o archivos privados del dispositivo',
    ],
  },
];

const usagePurposes = [
  {
    icon: '🔐',
    title: 'Autenticación y seguridad',
    desc: 'Validar accesos, limitar intentos, prevenir abuso y proteger cuentas con controles anti-bot y trazas de seguridad.',
  },
  {
    icon: '🎮',
    title: 'Ejecución de partidas',
    desc: 'Gestionar turnos, estados del juego, eventos, chat y sincronización entre jugadores en tiempo real.',
  },
  {
    icon: '🏆',
    title: 'Ranking y progreso',
    desc: 'Calcular resultados, puntajes, victorias, logros e inventario del jugador dentro de la experiencia universitaria.',
  },
  {
    icon: '🛠️',
    title: 'Moderación y soporte',
    desc: 'Atender reportes, aplicar reglas de convivencia y auditar incidentes técnicos o de comportamiento en sala/chat.',
  },
];

const retentionPolicies = [
  {
    title: 'Cuenta y perfil',
    desc: 'Se conserva mientras la cuenta esté activa o hasta que solicites eliminación.',
  },
  {
    title: 'Tokens de sesión',
    desc: 'Los refresh tokens se mantienen por tiempo limitado y se eliminan cuando expiran o se revocan.',
  },
  {
    title: 'Registros de seguridad',
    desc: 'Intentos de login y metadatos técnicos se conservan para prevención de abuso, análisis forense y estabilidad.',
  },
  {
    title: 'Eventos de juego/chat',
    desc: 'Se almacenan para funcionamiento del juego, estadísticas, moderación y trazabilidad de incidencias.',
  },
];

const rights = [
  { emoji: '👁️', label: 'Acceso', desc: 'Ver todos los datos asociados a tu cuenta.' },
  { emoji: '✏️', label: 'Rectificación', desc: 'Corregir información incorrecta o desactualizada.' },
  { emoji: '🗑️', label: 'Cancelación', desc: 'Solicitar la supresión de datos cuando corresponda.' },
  { emoji: '🛑', label: 'Oposición', desc: 'Oponerte al tratamiento en escenarios permitidos por ley.' },
  { emoji: '📦', label: 'Portabilidad', desc: 'Exportar tus datos en un formato legible.' },
];

const law81Highlights = [
  {
    title: 'Consentimiento previo, informado e inequívoco',
    description:
      'El tratamiento de datos personales requiere una manifestación válida de voluntad del titular.',
  },
  {
    title: 'Derechos ARCO',
    description:
      'La ley reconoce Acceso, Rectificación, Cancelación y Oposición sobre la información personal.',
  },
  {
    title: 'Principios de tratamiento',
    description:
      'Se aplican principios de finalidad, proporcionalidad, veracidad, seguridad y confidencialidad.',
  },
  {
    title: 'Datos sensibles',
    description:
      'Su tratamiento exige consentimiento expreso y mayores salvaguardas. Parkeando no recolecta biometría o salud.',
  },
  {
    title: 'Autoridad de control',
    description:
      'La ANTAI supervisa el cumplimiento y puede conocer reclamaciones por incumplimientos.',
  },
];

const FLASH_STATUS_COOKIE = 'privacy_deletion_status';

const isKnownDeletionStatus = (value: string | undefined): value is 'sent' | 'invalid' | 'rate_limit' | 'captcha' | 'error' =>
  value === 'sent' || value === 'invalid' || value === 'rate_limit' || value === 'captcha' || value === 'error';

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const rawDeletionStatus = cookieStore.get(FLASH_STATUS_COOKIE)?.value;
  const deletionStatus = isKnownDeletionStatus(rawDeletionStatus) ? rawDeletionStatus : undefined;

  const deletionStatusCopy: Record<string, { tone: string; text: string }> = {
    sent: {
      tone: 'border-panama-green/30 bg-panama-green/10 text-white/90',
      text: 'Solicitud enviada correctamente. Revisaremos tu caso y te responderemos por correo.',
    },
    invalid: {
      tone: 'border-panama-yellow/30 bg-panama-yellow/10 text-white/90',
      text: 'Faltan datos obligatorios. Completa el formulario e inténtalo nuevamente.',
    },
    rate_limit: {
      tone: 'border-panama-yellow/30 bg-panama-yellow/10 text-white/90',
      text: 'Has realizado demasiadas solicitudes en poco tiempo. Intenta de nuevo más tarde.',
    },
    captcha: {
      tone: 'border-panama-yellow/30 bg-panama-yellow/10 text-white/90',
      text: 'La verificación de captcha falló o expiró. Complétala nuevamente para enviar la solicitud.',
    },
    error: {
      tone: 'border-panama-red/30 bg-panama-red/10 text-white/90',
      text: 'No se pudo procesar la solicitud en este momento. Inténtalo de nuevo en unos minutos.',
    },
  };

  const deletionNotice = deletionStatus ? deletionStatusCopy[deletionStatus] : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full bg-panama-green/10 blur-[100px]" />
          <div className="absolute top-10 right-1/4 w-72 h-72 rounded-full bg-panama-blue/10 blur-[90px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 py-16 md:py-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-10 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Regresar al inicio
          </Link>

          <div className="flex items-start gap-5 mb-6">
            <div className="p-4 rounded-2xl bg-panama-green/10 border border-panama-green/20 backdrop-blur-sm shrink-0">
              <ShieldCheck className="w-8 h-8 text-panama-green" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold">
                Última actualización · 2026
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Política de{' '}
                <span className="text-gradient-blue">Privacidad</span>
              </h1>
            </div>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            En Parkeando: Edición Universitaria valoramos la privacidad de nuestros jugadores y
            estamos comprometidos con la{' '}
            <span className="text-white font-medium">transparencia total</span>{' '}
            en el manejo de sus datos.
          </p>
        </div>
      </div>

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-14 space-y-16">

        {/* ── datos recolección ── */}
        <section aria-labelledby="data-heading">
          <div className="flex items-center gap-3 mb-7">
            <Lock className="w-5 h-5 text-panama-blue" />
            <h2 id="data-heading" className="text-2xl font-bold">Datos Recolectados</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {dataItems.map(({ icon: Icon, color, bg, border, title, items }) => (
              <div key={title} className={`glass rounded-2xl p-6 border ${border}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className={`mt-1 shrink-0 text-xs ${color}`}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="law81-heading">
          <div className="flex items-center gap-3 mb-7">
            <Building2 className="w-5 h-5 text-panama-green" />
            <h2 id="law81-heading" className="text-2xl font-bold">Marco Legal en Panamá · Ley 81 de 2019</h2>
          </div>
          <div className="glass rounded-3xl border border-panama-green/20 p-6 md:p-7 space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              La Ley 81 del 26 de marzo de 2019 regula la protección de datos personales en Panamá.
              Entró en vigor el 29 de marzo de 2021 y exige que el tratamiento de información personal
              sea consentido, seguro, proporcional y transparente.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {law81Highlights.map(({ title, description }) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-4">
                  <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Si consideras que tus derechos no fueron atendidos adecuadamente, puedes recurrir ante la
              Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI).
            </p>
          </div>
        </section>

        {/* ── cómo nosotros usar datos ── */}
        <section aria-labelledby="usage-heading">
          <div className="flex items-center gap-3 mb-7">
            <ShieldCheck className="w-5 h-5 text-panama-yellow" />
            <h2 id="usage-heading" className="text-2xl font-bold">Cómo Usamos tu Información</h2>
          </div>
          <div className="space-y-3">
            {usagePurposes.map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 glass rounded-2xl p-5 border border-white/5 hover:bg-white/4 transition-colors">
                <span className="text-2xl shrink-0 mt-0.5" role="img" aria-label={title}>{icon}</span>
                <div>
                  <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="retention-heading">
          <div className="flex items-center gap-3 mb-7">
            <FileClock className="w-5 h-5 text-panama-blue" />
            <h2 id="retention-heading" className="text-2xl font-bold">Conservación de Datos</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {retentionPolicies.map(({ title, desc }) => (
              <div key={title} className="glass rounded-2xl p-5 border border-white/8">
                <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── seguridad ── */}
        <section aria-labelledby="security-heading">
          <div className="flex items-center gap-3 mb-7">
            <Server className="w-5 h-5 text-panama-cyan" />
            <h2 id="security-heading" className="text-2xl font-bold">Seguridad de la Información</h2>
          </div>
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Utilizamos medidas técnicas y organizativas de seguridad para proteger tus datos contra
                el acceso no autorizado, la alteración o la pérdida accidental:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Encriptación AES-256', icon: '🔐' },
                  { label: 'HTTPS / TLS 1.3', icon: '🔒' },
                  { label: 'Sesiones con JWT firmado', icon: '🎫' },
                  { label: 'Base de datos en Supabase', icon: '🛡️' },
                ].map(({ label, icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-white/3 border border-white/5 px-4 py-3 text-sm">
                    <span role="img" aria-label={label}>{icon}</span>
                    <span className="text-white/80 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── User rights ── */}
        <section aria-labelledby="rights-heading">
          <div className="flex items-center gap-3 mb-7">
            <Trash2 className="w-5 h-5 text-panama-red" />
            <h2 id="rights-heading" className="text-2xl font-bold">Tus Derechos</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Como usuario tienes derechos sobre tus datos personales. Puedes ejercerlos en cualquier momento:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rights.map(({ emoji, label, desc }) => (
              <div key={label} className="glass rounded-2xl p-4 text-center border border-white/5 hover:bg-white/5 transition-colors space-y-2">
                <span className="text-3xl" role="img" aria-label={label}>{emoji}</span>
                <p className="font-bold text-sm text-white">{label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <DataRightsPanel />
          </div>

        </section>

        <section id="solicitud-eliminacion" aria-labelledby="deletion-request-heading">
          <div className="flex items-center gap-3 mb-7">
            <Trash2 className="w-5 h-5 text-panama-red" />
            <h2 id="deletion-request-heading" className="text-2xl font-bold">Solicitud de Eliminación de Datos</h2>
          </div>
          <div className="glass rounded-3xl p-7 md:p-8 border border-panama-red/20 space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Completa este formulario para solicitar la eliminación de tu cuenta y datos personales.
              El equipo revisará tu solicitud y te responderá al correo indicado.
            </p>

            {deletionNotice && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${deletionNotice.tone}`} role="status">
                {deletionNotice.text}
              </div>
            )}

            <DataDeletionForm />
          </div>
        </section>

        {/* ── Contact ── */}
        <section aria-labelledby="contact-heading">
          <div className="relative glass rounded-3xl p-8 border border-panama-blue/10 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-panama-blue/5 to-panama-cyan/5 pointer-events-none rounded-3xl" aria-hidden />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="p-4 rounded-2xl bg-panama-blue/10 border border-panama-blue/20 shrink-0">
                <Mail className="w-6 h-6 text-panama-blue" />
              </div>
              <div className="flex-1">
                <h2 id="contact-heading" className="text-xl font-bold mb-1">¿Tienes preguntas?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Si deseas ejercer alguno de tus derechos o tienes dudas sobre el manejo de tus datos,
                  contáctanos a través de los canales oficiales del proyecto.
                </p>
                <p className="text-xs text-white/70 mt-3">
                  También puedes consultar los{' '}
                  <Link href="/terms" className="text-panama-yellow hover:text-yellow-300 underline underline-offset-2">
                    Términos y Condiciones
                  </Link>{' '}
                  y las{' '}
                  <Link href="/rules" className="text-panama-cyan hover:text-cyan-300 underline underline-offset-2">
                    Reglas del Juego
                  </Link>
                  .
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-panama-blue/20 border border-panama-blue/30 text-white font-semibold text-sm hover:bg-panama-blue/30 transition-colors"
              >
                Ir al Juego
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer note ── */}
        <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-white/5 space-y-1">
          <p>Esta política puede actualizarse periódicamente. Te notificaremos en caso de cambios significativos.</p>
          <p className="font-medium">© 2026 Parkeando Edición Universitaria · Su privacidad es nuestra prioridad.</p>
        </footer>

      </main>
    </div>
  );
}
