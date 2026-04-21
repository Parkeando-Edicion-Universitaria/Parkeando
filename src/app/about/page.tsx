import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Landmark,
  Globe,
  GraduationCap,
  MapPin,
  Sparkles,
  Users,
  Target,
  Heart,
  BookOpen,
  Gamepad2,
  Trophy,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sobre el Proyecto · Parkeando Edición Universitaria',
  description:
    'Conoce la historia, misión y equipo detrás de Parkeando: Edición Universitaria — el juego educativo sobre la cultura panameña.',
};

const pillars = [
  {
    icon: Globe,
    color: 'from-panama-blue/20 to-panama-cyan/10',
    border: 'border-panama-blue/20',
    iconColor: 'text-panama-blue',
    title: 'Misión Cultural',
    desc: 'Usamos la gamificación para conectar a las nuevas generaciones con las raíces de Panamá, fomentando el orgullo nacional y el turismo interno.',
  },
  {
    icon: GraduationCap,
    color: 'from-panama-green/20 to-panama-cyan/10',
    border: 'border-panama-green/20',
    iconColor: 'text-panama-green',
    title: 'Enfoque Educativo',
    desc: 'Diseñado para universitarios: integra retos y curiosidades sobre biodiversidad, historia, gastronomía y geografía panameña.',
  },
  {
    icon: Users,
    color: 'from-panama-yellow/20 to-panama-orange/10',
    border: 'border-panama-yellow/20',
    iconColor: 'text-panama-yellow',
    title: 'Comunidad Abierta',
    desc: 'Proyecto de código abierto donde cualquier universitario puede contribuir con preguntas, arte, traducciones e ideas.',
  },
  {
    icon: Zap,
    color: 'from-panama-red/20 to-panama-orange/10',
    border: 'border-panama-red/20',
    iconColor: 'text-panama-red',
    title: 'Tiempo Real',
    desc: 'Multijugador en tiempo real: hasta 6 jugadores compiten simultáneamente con sincronización instantánea via WebSockets.',
  },
];

const stats = [
  { value: '6', label: 'Jugadores simultáneos', icon: Users },
  { value: '100+', label: 'Preguntas únicas', icon: BookOpen },
  { value: '4', label: 'Categorías culturales', icon: MapPin },
  { value: '∞', label: 'Partidas posibles', icon: Trophy },
];

const categories = [
  { emoji: '🦜', label: 'Biodiversidad', color: 'bg-panama-green/10 border-panama-green/20 text-panama-green' },
  { emoji: '🏛️', label: 'Historia & Patrimonio', color: 'bg-panama-blue/10 border-panama-blue/20 text-panama-blue' },
  { emoji: '🍽️', label: 'Gastronomía', color: 'bg-panama-orange/10 border-panama-orange/20 text-panama-orange' },
  { emoji: '🎭', label: 'Cultura & Tradiciones', color: 'bg-panama-yellow/10 border-panama-yellow/20 text-panama-yellow' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* fondo brillo */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-panama-red/10 blur-[120px]" />
          <div className="absolute top-10 right-1/4 w-80 h-80 rounded-full bg-panama-blue/10 blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-10 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Regresar al inicio
          </Link>

          <div className="flex items-start gap-5 mb-6">
            <div className="p-4 rounded-2xl bg-panama-red/10 border border-panama-red/20 backdrop-blur-sm shrink-0">
              <Landmark className="w-8 h-8 text-panama-red" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold">
                Proyecto educativo
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Sobre{' '}
                <span className="text-gradient-panama">Parkeando</span>
              </h1>
            </div>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Parkeando: Edición Universitaria es un juego de mesa digital multijugador
            que promueve el conocimiento sobre la{' '}
            <span className="text-white font-medium">biodiversidad, historia, gastronomía y cultura de Panamá</span>{' '}
            a través de retos interactivos en tiempo real.
          </p>
        </div>
      </div>

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-14 space-y-20">

        {/* ── Stats ── */}
        <section aria-label="Estadísticas del juego">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="glass rounded-2xl p-5 text-center space-y-2 hover:bg-white/[0.06] transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground mx-auto" />
                <p className="text-3xl font-black tracking-tighter text-white">{value}</p>
                <p className="text-xs text-muted-foreground leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pillars ── */}
        <section aria-labelledby="pillars-heading">
          <div className="flex items-center gap-3 mb-8">
            <Target className="w-5 h-5 text-panama-yellow" />
            <h2 id="pillars-heading" className="text-2xl font-bold">Nuestros Pilares</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {pillars.map(({ icon: Icon, color, border, iconColor, title, desc }) => (
              <div
                key={title}
                className={`relative glass rounded-3xl p-6 border ${border} hover:bg-white/[0.06] transition-all duration-300 group overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-50 rounded-3xl pointer-events-none`} aria-hidden />
                <div className="relative space-y-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Categories ── */}
        <section aria-labelledby="categories-heading">
          <div className="flex items-center gap-3 mb-6">
            <Gamepad2 className="w-5 h-5 text-panama-cyan" />
            <h2 id="categories-heading" className="text-2xl font-bold">Categorías del Juego</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map(({ emoji, label, color }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-sm ${color}`}
              >
                <span role="img" aria-hidden>{emoji}</span>
                {label}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Cada categoría incluye preguntas de dificultad variada que cubren los rincones más fascinantes de Panamá —
            desde la fauna del Canal hasta las tradiciones del interior.
          </p>
        </section>

        {/* ── cómo it works ── */}
        <section aria-labelledby="how-heading">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-5 h-5 text-panama-yellow" />
            <h2 id="how-heading" className="text-2xl font-bold">¿Cómo Funciona?</h2>
          </div>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Escanea tu QR', desc: 'Recibe un código QR único en la sesión y únete a la partida en segundos desde tu celular.' },
              { step: '02', title: 'Lanza el dado', desc: 'Avanza por el tablero y cae en casillas con retos culturales sobre Panamá.' },
              { step: '03', title: 'Responde & Aprende', desc: 'Responde correctamente para ganar ventajas. Cada respuesta enseña algo nuevo sobre tu país.' },
              { step: '04', title: 'Gana la partida', desc: 'El jugador que mejor combina suerte, conocimiento y estrategia lleva la victoria.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 group">
                <div className="shrink-0 w-12 h-12 rounded-2xl glass border border-white/10 flex items-center justify-center font-black text-sm text-muted-foreground group-hover:border-panama-yellow/30 group-hover:text-panama-yellow transition-colors">
                  {step}
                </div>
                <div className="pt-1">
                  <h3 className="font-bold text-white mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Collaboration CTA ── */}
        <section aria-labelledby="collab-heading">
          <div className="relative glass rounded-3xl p-8 md:p-10 border border-panama-yellow/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-panama-yellow/5 to-panama-orange/5 pointer-events-none rounded-3xl" aria-hidden />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="p-4 rounded-2xl bg-panama-yellow/10 border border-panama-yellow/20 shrink-0">
                <Heart className="w-7 h-7 text-panama-yellow" />
              </div>
              <div className="flex-1">
                <h2 id="collab-heading" className="text-2xl font-bold mb-2">Colabora con el Proyecto</h2>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Esta es una iniciativa abierta a la comunidad universitaria. Si deseas contribuir con preguntas,
                  arte, correcciones o ideas, escríbenos a través de los canales oficiales del proyecto.
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-panama-yellow text-black font-bold text-sm hover:bg-panama-yellow/90 transition-colors"
              >
                Ir al Juego
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
