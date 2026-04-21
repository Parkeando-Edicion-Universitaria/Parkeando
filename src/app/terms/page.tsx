import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  Scale,
  MessageSquareWarning,
  RefreshCw,
  Mail,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos y Condiciones · Parkeando Edición Universitaria',
  description:
    'Consulta los términos y condiciones de uso de Parkeando Edición Universitaria para jugar con claridad y seguridad.',
};

const termsSections = [
  {
    icon: FileText,
    color: 'text-panama-blue',
    title: '1. Aceptación de los términos',
    body:
      'Al registrarte y usar Parkeando Edición Universitaria aceptas estos términos, la política de privacidad y las reglas del juego vigentes.',
  },
  {
    icon: ShieldAlert,
    color: 'text-panama-red',
    title: '2. Cuenta y seguridad',
    body:
      'Eres responsable del uso de tu cuenta, del resguardo de tus credenciales y de mantener información veraz en tu perfil.',
  },
  {
    icon: MessageSquareWarning,
    color: 'text-panama-yellow',
    title: '3. Conducta en partidas y chat',
    body:
      'No se permite acoso, spam, insultos, suplantación de identidad ni manipulación de resultados. El equipo de administración puede moderar mensajes y aplicar bloqueos.',
  },
  {
    icon: Scale,
    color: 'text-panama-green',
    title: '4. Juego limpio y uso permitido',
    body:
      'Está prohibido automatizar acciones, explotar fallos, alterar el cliente o interferir con la experiencia de otros jugadores.',
  },
  {
    icon: RefreshCw,
    color: 'text-panama-cyan',
    title: '5. Cambios en el servicio',
    body:
      'Podemos ajustar reglas, mecánicas y funcionalidades para mejorar rendimiento, seguridad y equilibrio competitivo.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full bg-panama-blue/10 blur-[100px]" />
          <div className="absolute top-10 right-1/4 w-72 h-72 rounded-full bg-panama-yellow/10 blur-[90px]" />
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
            <div className="p-4 rounded-2xl bg-panama-blue/10 border border-panama-blue/20 backdrop-blur-sm shrink-0">
              <FileText className="w-8 h-8 text-panama-cyan" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold">
                Última actualización · 2026
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Términos y{' '}
                <span className="text-gradient-blue">Condiciones</span>
              </h1>
            </div>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            Este documento define las condiciones de uso de la plataforma y protege la experiencia
            de toda la comunidad de Parkeando Edición Universitaria.
          </p>
        </div>
      </div>

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-14 space-y-12">
        <section className="space-y-4">
          {termsSections.map(({ icon: Icon, color, title, body }) => (
            <article key={title} className="glass rounded-2xl p-6 border border-white/8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="glass rounded-2xl p-6 border border-panama-red/20">
          <h2 className="text-lg font-bold text-white mb-2">6. Suspensión o cierre de cuentas</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            En caso de incumplimiento grave o reiterado, Parkeando puede suspender temporal o permanentemente
            cuentas, chats o acceso a partidas para proteger la integridad del servicio.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 border border-panama-yellow/20">
          <h2 className="text-lg font-bold text-white mb-2">7. Limitación de responsabilidad</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La plataforma se ofrece para fines educativos y recreativos. Aunque trabajamos para mantener
            disponibilidad y seguridad, pueden existir interrupciones, errores o ajustes no previstos.
          </p>
        </section>

        <section className="relative glass rounded-3xl p-8 border border-panama-blue/10 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-panama-blue/5 to-panama-cyan/5 pointer-events-none rounded-3xl" aria-hidden />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 rounded-2xl bg-panama-blue/10 border border-panama-blue/20 shrink-0">
              <Mail className="w-6 h-6 text-panama-blue" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">¿Necesitas aclaraciones?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para dudas legales o solicitudes relacionadas con tus datos, revisa también la política de privacidad.
              </p>
            </div>
            <Link
              href="/privacy"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-panama-blue/20 border border-panama-blue/30 text-white font-semibold text-sm hover:bg-panama-blue/30 transition-colors"
            >
              Ver privacidad
            </Link>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-white/5 space-y-1">
          <p>Estos términos pueden actualizarse para reflejar cambios técnicos, legales o de operación.</p>
          <p className="font-medium">© 2026 Parkeando Edición Universitaria · Uso responsable y juego limpio.</p>
        </footer>
      </main>
    </div>
  );
}