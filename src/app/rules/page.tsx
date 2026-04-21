'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Dice6,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { truncateSingleLineWithPretext } from '@/lib/pretext';

const FLOW_LABEL_FONT = '700 13px "Josefin Sans"';
const FLOW_LABEL_LINE_HEIGHT = 16;

const turnFlow = [
  { label: 'Lanza dados virtuales', icon: Dice6, color: 'text-panama-yellow' },
  { label: 'Avanza en el tablero', icon: ArrowRight, color: 'text-panama-blue' },
  { label: 'Escanea QR', icon: QrCode, color: 'text-panama-green' },
  { label: 'Responde reto o pregunta', icon: Sparkles, color: 'text-panama-cyan' },
  { label: 'Turno en 60 segundos', icon: Clock3, color: 'text-panama-red' },
];

const rules = [
  {
    id: '01',
    title: 'Objetivo del juego',
    description:
      'Recorre Panamá y conoce sus provincias a través del turismo, la gastronomía y la cultura urbana. Gana quien llegue a la casilla FIN.',
  },
  {
    id: '02',
    title: 'Inicio de partida',
    description:
      'Todos empiezan en la Casilla PARKEANDO con 0 puntos de experiencia. Cada jugador avanza lanzando dados virtuales.',
  },
  {
    id: '03',
    title: 'Turno y movimiento',
    description:
      'En tu turno lanzas el dado, avanzas a la casilla indicada y validas la jugada escaneando el QR. Luego continúa el siguiente jugador.',
  },
  {
    id: '04',
    title: 'Dobles',
    description:
      'Si sacas dobles avanzas 14 casillas. Si sacas dobles 3 veces consecutivas, pierdes tu próximo turno.',
  },
  {
    id: '05',
    title: 'Cárcel',
    description:
      'Para salir de la cárcel debes sacar 5 y 3. Si caes dos veces en una casilla de cárcel durante la misma partida, reinicias tu progreso en la salida.',
  },
  {
    id: '06',
    title: 'Jugadores y victoria automática',
    description:
      'Cada partida se juega entre 2 y 6 jugadores. Si queda un solo jugador activo, gana automáticamente.',
  },
  {
    id: '07',
    title: 'Inactividad',
    description:
      'Si un jugador permanece 2 minutos sin interactuar, se considera AFK y es expulsado de la partida.',
  },
  {
    id: '08',
    title: 'Batalla entre jugadores',
    description:
      'Si caes en una casilla ocupada se activa Juega Vivo. Con varios jugadores en la misma casilla, se resuelve batalla grupal: 1 avanza y el resto pierde turno.',
  },
  {
    id: '09',
    title: 'Retos y preguntas',
    description:
      'Si aciertas ganas experiencia y puedes avanzar. Si fallas, puedes retroceder casillas o perder puntos según la tarjeta.',
  },
  {
    id: '10',
    title: 'Casillas especiales',
    description:
      'Eventos nacionales dan +1 punto. Viaje rápido mueve entre aeropuertos. Problema vial te hace perder turno.',
  },
  {
    id: '11',
    title: 'Sin eliminaciones',
    description:
      'Nadie queda por fuera por perder turnos o puntos. La expulsión solo aplica por AFK o por rechazar permisos de cámara en 2 intentos.',
  },
  {
    id: '12',
    title: 'Fin del juego',
    description:
      'Para ganar debes completar el recorrido y llegar a la casilla de FIN. Cada casilla es una historia y cada provincia una experiencia.',
  },
];

export default function RulesPage() {
  const [isClientReady, setIsClientReady] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    setIsClientReady(true);
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const flowLabelWidth = viewportWidth && viewportWidth < 420 ? 112 : 172;

  const flowSteps = useMemo(
    () =>
      turnFlow.map((step) => ({
        ...step,
        displayLabel:
          isClientReady && viewportWidth
            ? truncateSingleLineWithPretext(step.label, {
                font: FLOW_LABEL_FONT,
                maxWidth: flowLabelWidth,
                lineHeight: FLOW_LABEL_LINE_HEIGHT,
              })
            : step.label,
      })),
    [flowLabelWidth, isClientReady, viewportWidth]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full bg-panama-red/12 blur-[100px]" />
          <div className="absolute top-10 right-1/4 w-72 h-72 rounded-full bg-panama-blue/12 blur-[95px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-20">
          <Link
            href="/lobby"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Volver a la sala
          </Link>

          <div className="flex items-start gap-5">
            <div className="p-4 rounded-2xl bg-panama-yellow/10 border border-panama-yellow/30 backdrop-blur-sm shrink-0">
              <Trophy className="w-8 h-8 text-panama-yellow" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold">
                Guía oficial · Edición Universitaria
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Reglas del{' '}
                <span className="text-gradient-blue">Juego</span>
              </h1>
              <p className="text-base md:text-lg text-white/80 mt-4 leading-relaxed max-w-3xl">
                Descubre Panamá casilla por casilla. Estas reglas resumen cómo jugar,
                puntuar, resolver batallas y cerrar la partida de forma clara y justa.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main id="main-content" className="max-w-5xl mx-auto px-6 py-14 space-y-12">
        <section className="glass rounded-3xl border border-white/8 p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-panama-green" />
            <h2 className="text-2xl font-bold text-white">Flujo de turno</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
            {flowSteps.map(({ label, displayLabel, icon: Icon, color }, index) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs md:text-sm font-semibold text-white/90">{displayLabel}</span>
                </div>
                {index < flowSteps.length - 1 && <ArrowRight className="w-4 h-4 text-white/30" />}
              </div>
            ))}
          </div>

          <p className="text-sm text-white/70">
            Tiempo máximo por turno: <span className="font-bold text-panama-yellow">60 segundos</span>.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-4 md:gap-5">
          {rules.map((rule) => (
            <article
              key={rule.id}
              className="glass rounded-2xl p-5 border border-white/10 hover:border-panama-cyan/35 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-panama-blue/20 border border-panama-blue/35 text-panama-cyan text-sm font-black">
                  {rule.id}
                </span>
                <h3 className="text-lg font-bold text-white">{rule.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-white/80">{rule.description}</p>
            </article>
          ))}
        </section>

        <section className="glass rounded-3xl border border-panama-yellow/25 p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-black text-panama-yellow mb-3">Casillas especiales</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl border border-panama-yellow/35 bg-panama-yellow/10 p-4">
              <p className="font-bold text-panama-yellow mb-1">Eventos nacionales</p>
              <p className="text-sm text-white/80">Carnavales (Los Santos), Fiestas Patrias (Panamá) y Ferias (Chiriquí-Boquete) otorgan +1 punto.</p>
            </div>
            <div className="rounded-xl border border-panama-blue/35 bg-panama-blue/10 p-4">
              <p className="font-bold text-panama-cyan mb-1">Viaje rápido</p>
              <p className="text-sm text-white/80">Casillas de aeropuerto y vuelo directo te permiten viajar entre provincias (por ejemplo, Enrique Malek en Chiriquí hacia Tocumen en Panamá Este).</p>
            </div>
            <div className="rounded-xl border border-panama-red/35 bg-panama-red/10 p-4">
              <p className="font-bold text-panama-red mb-1">Problema vial</p>
              <p className="text-sm text-white/80">Puedes perder un turno por tráfico o incidencia en ruta.</p>
            </div>
            <div className="rounded-xl border border-white/25 bg-white/5 p-4">
              <p className="font-bold text-white mb-1">Cárcel</p>
              <p className="text-sm text-white/80">Casillas de cárcel como La Joya y Coiba aplican regla de escape con 5 y 3.</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/terms"
            className="inline-flex justify-center items-center px-5 py-3 rounded-xl bg-panama-blue/20 border border-panama-blue/35 text-white font-semibold hover:bg-panama-blue/30 transition-colors"
          >
            Ver términos y condiciones
          </Link>
          <Link
            href="/"
            className="inline-flex justify-center items-center px-5 py-3 rounded-xl bg-panama-green/20 border border-panama-green/35 text-white font-semibold hover:bg-panama-green/30 transition-colors"
          >
            Ir al inicio
          </Link>
        </section>
      </main>
    </div>
  );
}
