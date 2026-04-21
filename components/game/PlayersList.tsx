'use client';

import { useEffect, useMemo, useState } from 'react';
import { Player } from '@/types/game';
import { m } from 'framer-motion';
import PlayerIcon from './PlayerIcon';
import WildcardCounter from './WildcardCounter';
import { WILDCARD_CONFIG } from '@/lib/wildcard-manager';
import { truncateSingleLineWithPretext } from '@/lib/pretext';
import { 
  Car, 
  Flag, 
  Lock, 
  Octagon, 
  MapPin, 
  Star,
  CheckCircle2
} from 'lucide-react';

interface PlayersListProps {
  players: Player[];
  currentPlayerId: string;
  myPlayerId: string;
}

export default function PlayersList({ players, currentPlayerId, myPlayerId }: PlayersListProps) {
  const [viewportWidth, setViewportWidth] = useState(1024);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const usernameMaxWidth = viewportWidth < 640 ? 110 : viewportWidth < 1024 ? 150 : 175;

  const displayNameById = useMemo(() => {
    const names = new Map<string, string>();

    players.forEach((player) => {
      const isMe = player.id === myPlayerId;
      const reservedForTag = isMe ? 34 : 0;
      names.set(
        player.id,
        truncateSingleLineWithPretext(player.username || '', {
          font: '600 15px ui-sans-serif, system-ui, sans-serif',
          maxWidth: Math.max(70, usernameMaxWidth - reservedForTag),
          lineHeight: 20,
        })
      );
    });

    return names;
  }, [myPlayerId, players, usernameMaxWidth]);

  return (
    <div className="glass rounded-lg shadow-lg p-4">
      <h3 className="text-lg md:text-xl font-bold mb-4 text-foreground">
        Jugadores ({players.length})
      </h3>
      <div className="space-y-3">
        {players.map((player, index) => {
          const isCurrentTurn = player.id === currentPlayerId;
          const isMe = player.id === myPlayerId;
          const icon = player.icon || '🚗';

          return (
            <m.div
              key={player.id}
              className={`p-3 rounded-xl border-2 transition-all ${isCurrentTurn
                ? 'border-panama-yellow bg-panama-yellow/10 shadow-md'
                : isMe
                  ? 'border-panama-blue bg-panama-blue/10'
                  : 'border-white/10 glass-strong'
                }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Icono + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <PlayerIcon
                    icon={icon === '🚗' ? <Car className="w-5 h-5" /> : icon}
                    color={player.color}
                    size="md"
                    isCurrentTurn={isCurrentTurn}
                    isMe={isMe}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="font-semibold text-sm md:text-base truncate text-foreground">
                        {displayNameById.get(player.id) || player.username}
                        {isMe && (
                          <span className="ml-1 text-xs font-bold text-panama-blue opacity-80">(Tú)</span>
                        )}
                      </p>
                      {/* Indicador de estado (Offline/AFK) */}
                      {player.status === 'disconnected' && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Octagon size={10} /> OFFLINE
                        </span>
                      )}
                      {player.status === 'inactive' && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                          AFK
                        </span>
                      )}
                      {player.status === 'finished' && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Flag size={10} /> META
                        </span>
                      )}
                      
                      {/* Indicador de cárcel */}
                      {(player as any).in_jail && (
                        <span className="text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Lock size={10} /> CÁRCEL
                        </span>
                      )}
                      {/* Indicador de turno perdido */}
                      {(player as any).skip_next_turn && (
                        <span className="text-[10px] bg-panama-red/10 text-panama-red px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Octagon size={10} className="rotate-45" /> SKIP
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/80">
                      <span className="flex items-center gap-1"><MapPin size={10} /> Casilla {player.position}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Star size={10} className="fill-current" /> B/. {player.points} Balboa</span>
                    </div>
                  </div>
                </div>

                {/* Panel derecho: turno + comodines */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {isCurrentTurn && (
                    <m.div
                      className="bg-panama-yellow text-slate-950 px-2.5 py-1 rounded-full text-xs font-black tracking-wide shadow border border-panama-yellow/80"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                      TURNO
                    </m.div>
                  )}

                  {/* Contador de comodines */}
                  <WildcardCounter
                    count={player.wildcards || 0}
                    max={WILDCARD_CONFIG.MAX_WILDCARDS}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
