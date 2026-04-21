import { memo } from 'react';
import { m } from 'framer-motion';
import { Player } from '@/types/game';
import PlayerIcon from './PlayerIcon';

interface ProgressBarProps {
  players: Player[];
  maxCells?: number;
  myPlayerId?: string;
}

function ProgressBar({ players, maxCells = 120, myPlayerId }: ProgressBarProps) {
  // Encontrar al jugador local
  const me = players.find(p => p.id === myPlayerId) || players[0];
  const myPosition = me?.position || 0;
  const progressPercentage = Math.min(100, Math.max(0, (myPosition / maxCells) * 100));

  // Encontrar al líder real para el marcador de meta
  const leader = players.reduce(
    (max, p) => (p.position > max.position ? p : max),
    players[0] || { position: 0 }
  );

  return (
    <div className="w-full flex flex-col gap-2 mb-2 px-1">
      {/* Labels y Estado */}
      <div className="flex justify-between items-end px-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-1">
            Tu Progreso
          </span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-white leading-none">
              {Math.floor(progressPercentage)}%
            </span>
            {progressPercentage >= 80 && (
              <m.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-2 py-0.5 bg-panama-yellow text-black text-[10px] font-black rounded-full animate-bounce"
              >
                ¡META CERCA!
              </m.span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
            Líder: {leader?.username || '---'}
          </span>
          <span className="text-xs font-black text-panama-yellow">
            Casilla {leader?.position}/{maxCells}
          </span>
        </div>
      </div>

      {/* riel de la Barra */}
      <div className="relative h-6 w-full bg-black/60 rounded-xl border border-white/20 overflow-hidden shadow-2xl backdrop-blur-md p-1">
        {/* dinámico fondo riel con sutiles líneas de escaneo */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:1px_4px] opacity-20 pointer-events-none" />

        {/* Fill de progreso (Usuario Local) */}
        <m.div
          className={`h-full rounded-lg flex items-center justify-end px-3 relative z-10 ${
            progressPercentage > 85
              ? 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
              : 'bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
        >
          {/* Scanline effect */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] bg-[length:200%_100%] animate-[shimmer_3s_infinite_linear]" />
          
          {progressPercentage > 15 && (
            <span className="text-[10px] font-black text-white whitespace-nowrap drop-shadow-md">
              TÚ
            </span>
          )}
        </m.div>

        {/* Marcadores de otros jugadores */}
        <div className="absolute inset-0 z-20 pointer-events-none px-1">
          {players.map((p) => {
            const isMe = p.id === myPlayerId;
            if (isMe) return null;

            const pos = Math.min(100, Math.max(0, (p.position / maxCells) * 100));
            return (
              <m.div
                key={p.id}
                className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ left: `${pos}%` }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1, left: `${pos}%` }}
                transition={{ type: 'spring', bounce: 0.3 }}
              >
                <div className="scale-90 origin-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
                  <PlayerIcon
                    icon={(p as any).icon || (p as any).equipped?.avatar || 'car'}
                    color={p.color || '#fff'}
                    size="xs"
                    isCurrentTurn={false}
                    isMe={false}
                  />
                </div>
              </m.div>
            );
          })}
        </div>
      </div>

      {/* Texto de meta mostrando la urgencia Zeigarnik/Goal-Gradient */}
      <div className="flex justify-between px-2 mt-1">
         <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Inicio</span>
         <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Meta ({maxCells})</span>
      </div>
    </div>
  );
}

export default memo(ProgressBar);
