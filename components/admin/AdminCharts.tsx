'use client';

import { m } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Clock3, Trophy } from 'lucide-react';
import { truncateSingleLineWithPretext } from '@/lib/pretext';

interface AdminChartsProps {
  stats: any;
  users: any[];
}

type ChartSize = {
  width: number;
  height: number;
};

const PLAYER_COLORS = ['#22d3ee', '#38bdf8', '#f59e0b', '#fb7185', '#818cf8'];
const METRIC_COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#f97316', '#ef4444'];
const AXIS_LABEL_FONT = '700 10px "Josefin Sans"';
const AXIS_LABEL_WIDTH = 64;
const AXIS_LINE_HEIGHT = 12;

export default function AdminCharts({ stats }: AdminChartsProps) {
  if (!stats) return null;

  const topPlayersData = (stats.topPlayers ?? []).slice(0, 5).map((player: any) => {
    const username = String(player.username ?? 'Sin nombre');

    return {
      username,
      name: truncateSingleLineWithPretext(username, {
        font: AXIS_LABEL_FONT,
        maxWidth: AXIS_LABEL_WIDTH,
        lineHeight: AXIS_LINE_HEIGHT,
      }),
      points: player.totalPoints,
      wins: player.gamesWon,
    };
  });

  const activityData = [
    { name: 'Batallas', value: stats.today?.battles ?? 0 },
    { name: 'Wildcards', value: stats.today?.wildcardsUsed ?? 0 },
    { name: 'Celdas', value: stats.today?.specialCells ?? 0 },
    { name: 'Carcel', value: stats.today?.jails ?? 0 },
    { name: 'AFK', value: stats.today?.inactiveQueueKicks ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
      <m.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2rem] p-6 border border-white/5 min-h-85 overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/70">Competencia</p>
            <h3 className="text-xl font-black text-foreground mt-2">Rendimiento de jugadores</h3>
            <p className="text-sm text-muted-foreground mt-1">Ranking real por puntos acumulados, con victorias visibles en tooltip.</p>
          </div>
          <Badge className="bg-cyan-400/10 text-cyan-300 border-cyan-400/20">
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            Top {topPlayersData.length || 0}
          </Badge>
        </div>

        <ChartViewport>
          {({ width, height }) => (
            <ResponsiveContainer width={width} height={height}>
              <BarChart data={topPlayersData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontWeight: 700 }}
                />
                <YAxis
                  fontSize={10}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  wrapperStyle={{ zIndex: 40, outline: 'none' }}
                  content={<PerformanceTooltip />}
                />
                <Bar dataKey="points" fill={PLAYER_COLORS[0]} radius={[10, 10, 0, 0]} barSize={34}>
                  {topPlayersData.map((entry: any, index: number) => (
                    <Cell key={entry.name} fill={PLAYER_COLORS[index % PLAYER_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartViewport>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass rounded-[2rem] p-6 border border-white/5 min-h-85 overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/70">Actividad real</p>
            <h3 className="text-xl font-black text-foreground mt-2">Eventos de hoy</h3>
            <p className="text-sm text-muted-foreground mt-1">Datos del día desde `game_events`, sin curvas inventadas.</p>
          </div>
          <Badge className="bg-amber-400/10 text-amber-300 border-amber-400/20">
            <Clock3 className="w-3.5 h-3.5 mr-1.5" />
            {stats.today?.avgGameDurationMinutes ? `${stats.today.avgGameDurationMinutes} min` : 'Sin cierre hoy'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <InsightBox label="Abiertas" value={String((stats.activeGames || 0) + (stats.waitingGames || 0))} accent="cyan" />
          <InsightBox label="Preguntas" value={String(stats.totalQuestions || 0)} accent="emerald" />
          <InsightBox label="Cerradas" value={String(stats.finishedGames || 0)} accent="amber" />
          <InsightBox label="Online" value={String(stats.onlineUsers || 0)} accent="rose" />
        </div>

        <ChartViewport>
          {({ width, height }) => (
            <ResponsiveContainer width={width} height={height}>
              <BarChart data={activityData} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontWeight: 700 }}
                />
                <YAxis
                  fontSize={10}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(9, 14, 28, 0.94)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '18px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill={METRIC_COLORS[0]} radius={[10, 10, 0, 0]} barSize={28}>
                  {activityData.map((entry, index) => (
                    <Cell key={entry.name} fill={METRIC_COLORS[index % METRIC_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartViewport>
      </m.div>
    </div>
  );
}

function ChartViewport({ children }: { children: (size: ChartSize) => ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const nextSize = {
        width: Math.max(0, Math.floor(container.clientWidth)),
        height: Math.max(0, Math.floor(container.clientHeight)),
      };

      setSize((previous) =>
        previous.width === nextSize.width && previous.height === nextSize.height ? previous : nextSize
      );
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="flex-1 w-full min-w-0 min-h-0">
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

function PerformanceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const player = payload[0].payload;

  return (
    <div className="min-w-[220px] rounded-[1.25rem] border border-white/10 bg-slate-950/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300/80">Jugador</p>
      <p className="mt-1 text-lg font-black text-white">{player.username}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/70">Puntos</p>
          <p className="mt-1 text-xl font-black text-white">{player.points} pts</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/70">Victorias</p>
          <p className="mt-1 text-xl font-black text-white">{player.wins}</p>
        </div>
      </div>
    </div>
  );
}

function InsightBox({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'emerald' | 'amber' | 'rose' }) {
  const accents = {
    cyan: 'border-cyan-400/20 bg-cyan-400/5 text-cyan-300',
    emerald: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300',
    amber: 'border-amber-400/20 bg-amber-400/5 text-amber-300',
    rose: 'border-rose-400/20 bg-rose-400/5 text-rose-300',
  };

  return (
    <div className={`rounded-2xl border p-3 ${accents[accent]}`}>
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold opacity-75">{label}</p>
      <p className="text-xl font-black text-foreground mt-2">{value}</p>
    </div>
  );
}
