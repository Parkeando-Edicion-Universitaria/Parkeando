'use client';

import { m } from 'framer-motion';
import { Activity, Radar, Users, Wifi } from 'lucide-react';

interface InteractiveMapProps {
  users: Array<{
    id: string;
    username: string;
    current_location?: string | null;
    last_seen_at?: string | null;
  }>;
}

const ONLINE_WINDOW_MS = 60_000;

const LOCATION_META: Array<{ key: string; label: string; accent: string }> = [
  { key: 'jugando', label: 'En partida', accent: 'text-amber-300 border-amber-400/20 bg-amber-400/5' },
  { key: 'lobby', label: 'Lobby', accent: 'text-cyan-300 border-cyan-400/20 bg-cyan-400/5' },
  { key: 'admin', label: 'Admin', accent: 'text-violet-300 border-violet-400/20 bg-violet-400/5' },
  { key: 'tienda', label: 'Tienda', accent: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/5' },
  { key: 'perfil', label: 'Perfil', accent: 'text-rose-300 border-rose-400/20 bg-rose-400/5' },
  { key: 'reglas', label: 'Reglas', accent: 'text-orange-300 border-orange-400/20 bg-orange-400/5' },
  { key: 'inicio', label: 'Inicio', accent: 'text-sky-300 border-sky-400/20 bg-sky-400/5' },
  { key: 'explorando', label: 'Explorando', accent: 'text-foreground/80 border-white/10 bg-white/5' },
  { key: 'offline', label: 'Sin señal', accent: 'text-muted-foreground border-white/10 bg-white/5' },
];

const isOnline = (lastSeen?: string | null) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
};

const normalizeLocation = (user: InteractiveMapProps['users'][number]) => {
  if (!isOnline(user.last_seen_at)) return 'offline';
  return user.current_location || 'lobby';
};

const relativeLastSeen = (lastSeen?: string | null) => {
  if (!lastSeen) return 'Sin heartbeat';
  const diffMinutes = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000);
  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes === 1) return 'Hace 1 min';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  return 'Hace más de 1 h';
};

export default function InteractiveMap({ users }: InteractiveMapProps) {
  const onlineUsers = users.filter((user) => isOnline(user.last_seen_at));
  const activeBuckets = LOCATION_META.map((location) => {
    const members = users.filter((user) => normalizeLocation(user) === location.key);
    return {
      ...location,
      count: members.length,
      members,
    };
  }).filter((bucket) => bucket.count > 0 || bucket.key === 'offline');

  const highlightedUsers = [...onlineUsers]
    .sort((a, b) => new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime())
    .slice(0, 6);

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-[2rem] p-6 border border-white/5 h-full flex flex-col gap-6"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/75">Pulso real</p>
          <h3 className="text-xl font-black text-foreground mt-2">Actividad por ubicación</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Basado en `current_location` y `last_seen_at`, no en coordenadas aleatorias.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-[240px]">
          <MiniStat icon={<Wifi className="w-4 h-4" />} label="Online" value={String(onlineUsers.length)} />
          <MiniStat icon={<Radar className="w-4 h-4" />} label="Ubicaciones" value={String(activeBuckets.filter((bucket) => bucket.count > 0).length)} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeBuckets.map((bucket, index) => (
            <m.div
              key={bucket.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`rounded-[1.6rem] border p-4 ${bucket.accent}`}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] font-bold opacity-70">Nodo</p>
                  <h4 className="text-lg font-black text-foreground mt-1">{bucket.label}</h4>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-foreground">{bucket.count}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] opacity-70">usuarios</p>
                </div>
              </div>

              <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-current opacity-80"
                  style={{ width: `${Math.max(8, Math.min(100, bucket.count * 18))}%` }}
                />
              </div>
            </m.div>
          ))}
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-300" />
            <h4 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Últimos heartbeats</h4>
          </div>

          {highlightedUsers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm">Aún no hay usuarios reportando actividad reciente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {highlightedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/10 px-3 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{user.username}</p>
                    <p className="text-[11px] text-muted-foreground">{relativeLastSeen(user.last_seen_at)}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-300 font-bold">
                    {LOCATION_META.find((item) => item.key === normalizeLocation(user))?.label || 'Lobby'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </m.div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-2 text-cyan-300">{icon}</div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold mt-3">{label}</p>
      <p className="text-xl font-black text-foreground mt-1">{value}</p>
    </div>
  );
}
