'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Cell, Player } from '@/types/game';
import PlayerIcon from './PlayerIcon';
import { useAudio } from '@/lib/audio';
import { HelpCircle, Zap, Flag, Play, AlertTriangle, Lock, Plane, ShieldAlert, Target, Trophy, Sparkles } from 'lucide-react';

interface BoardProps {
  cells: Cell[];
  players: Player[];
  currentPosition?: number;
}

const WIN_POSITION = 120;

// Province-según color sistema
const getCellStyle = (position: number, type: string) => {
  if (position === 0) return { 
    bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300/40', 
    num: 'text-white', 
    glow: 'shadow-[0_0_15px_rgba(52,211,153,0.4)]' 
  };
  if (position === WIN_POSITION && type === 'special') return { 
    bg: 'bg-gradient-to-br from-yellow-300 to-amber-500 border-yellow-200/40', 
    num: 'text-white', 
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]' 
  };

  if (type === 'special') return { 
    bg: 'bg-gradient-to-br from-red-600/90 to-red-900 border-red-400/30', 
    num: 'text-red-100', 
    glow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
  };
  if (type === 'event') return { 
    bg: 'bg-gradient-to-br from-amber-500/90 to-orange-700 border-amber-400/30', 
    num: 'text-amber-100', 
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
  };

  // Provinces (Approximated 10 per province)
  if (position >= 1 && position <= 10) return { bg: 'bg-gradient-to-br from-blue-700/60 to-blue-900/80 border-blue-400/20', num: 'text-blue-100', glow: '' };
  if (position >= 11 && position <= 20) return { bg: 'bg-gradient-to-br from-teal-700/60 to-teal-900/80 border-teal-400/20', num: 'text-teal-100', glow: '' };
  if (position >= 21 && position <= 29) return { bg: 'bg-gradient-to-br from-amber-700/60 to-amber-900/80 border-amber-400/20', num: 'text-amber-100', glow: '' };
  if (position >= 30 && position <= 39) return { bg: 'bg-gradient-to-br from-violet-700/60 to-violet-900/80 border-violet-400/20', num: 'text-violet-100', glow: '' };
  if (position >= 40 && position <= 49) return { bg: 'bg-gradient-to-br from-pink-700/60 to-pink-900/80 border-pink-400/20', num: 'text-pink-100', glow: '' };
  if (position >= 50 && position <= 59) return { bg: 'bg-gradient-to-br from-cyan-700/60 to-cyan-900/80 border-cyan-400/20', num: 'text-cyan-100', glow: '' };
  if (position >= 60 && position <= 69) return { bg: 'bg-gradient-to-br from-green-700/60 to-green-900/80 border-green-400/20', num: 'text-green-100', glow: '' };
  if (position >= 70 && position <= 79) return { bg: 'bg-gradient-to-br from-indigo-700/60 to-indigo-900/80 border-indigo-400/20', num: 'text-indigo-100', glow: '' };
  if (position >= 80 && position <= 89) return { bg: 'bg-gradient-to-br from-red-700/60 to-red-900/80 border-red-400/20', num: 'text-red-100', glow: '' };
  if (position >= 90 && position <= 99) return { bg: 'bg-gradient-to-br from-slate-600/60 to-slate-800/80 border-slate-400/20', num: 'text-slate-100', glow: '' };
  if (position >= 100 && position <= 109) return { bg: 'bg-gradient-to-br from-emerald-700/60 to-emerald-900/80 border-emerald-400/20', num: 'text-emerald-100', glow: '' };
  if (position >= 110 && position <= 120) return { bg: 'bg-gradient-to-br from-orange-700/60 to-orange-900/80 border-orange-400/20', num: 'text-orange-100', glow: '' };
  
  return { bg: 'bg-slate-800/40 border-slate-700/30', num: 'text-slate-400', glow: '' };
};

const getCellIcon = (cell: Cell, isMobile = false) => {
  const size = isMobile ? "w-4 h-4" : "w-3 h-3";
  
  if (cell.position === 0) return <Play className={`${size} text-emerald-200`} />;
  if (cell.position === WIN_POSITION && cell.type === 'special') return <Flag className={`${size} text-yellow-200`} />;

  // Prefer semantic icon generated from tablero-cells fuente of truth.
  // This keeps icon mapping aligned con pregunta/reto/premio/penalizacion y special cells.
  switch (cell.icon) {
    case '❓':
      return <HelpCircle className={`${size} text-blue-300`} />;
    case '🎯':
      return <Target className={`${size} text-amber-300`} />;
    case '🏆':
      return <Trophy className={`${size} text-emerald-300`} />;
    case '⚠️':
      return <AlertTriangle className={`${size} text-rose-300`} />;
    case '✈️':
      return <Plane className={`${size} text-sky-200 rotate-45`} />;
    case '⛓️':
      return <Lock className={`${size} text-red-300`} />;
    case '🛑':
      return <ShieldAlert className={`${size} text-orange-300`} />;
    case '🎉':
      return <Sparkles className={`${size} text-yellow-300`} />;
    default:
      break;
  }

  // defensivo respaldo cuando icon metadatos is faltan.
  const text = `${cell.description} ${cell.province || ''}`.toLowerCase();
  if (text.includes('aeropuerto') || text.includes('viaje rápido') || text.includes('vuelo')) {
    return <Plane className={`${size} text-sky-200 rotate-45`} />;
  }
  if (text.includes('cárcel') || text.includes('carcel')) {
    return <Lock className={`${size} text-red-300`} />;
  }
  if (text.includes('retén') || text.includes('reten') || text.includes('problema vial')) {
    return <ShieldAlert className={`${size} text-orange-300`} />;
  }

  if (cell.type === 'special') return <AlertTriangle className={`${size} text-red-400/80`} />;
  if (cell.type === 'event') return <Zap className={`${size} text-amber-400/80`} />;
  if (cell.has_question) return <HelpCircle className={`${size} text-blue-300/60`} />;
  
  return null;
};

function BoardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // fondo
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Decorative waves
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * (0.2 + i * 0.15));
      ctx.bezierCurveTo(w * 0.3, h * (0.1 + i * 0.1), w * 0.7, h * (0.9 - i * 0.1), w, h * (0.4 + i * 0.05));
      ctx.strokeStyle = `rgba(14, 165, 233, ${0.05 + i * 0.01})`;
      ctx.stroke();
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    for (let x = 0; x <= w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const redraw = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(drawBackground);
    };

    redraw();

    const resizeObserver = new ResizeObserver(() => {
      redraw();
    });

    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    window.addEventListener('resize', redraw);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('resize', redraw);
    };
  }, [drawBackground]);

  return <canvas ref={canvasRef} className="w-full h-full opacity-80" />;
}

function Board({ cells, players: actualPlayers, currentPosition }: BoardProps) {
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const audio = useAudio();
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>(actualPlayers);
  const movementTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    actualPlayers.forEach(actualPlayer => {
      const currentPlayer = displayPlayers.find(p => p.id === actualPlayer.id);
      if (!currentPlayer) { setDisplayPlayers(actualPlayers); return; }
      if (currentPlayer.position !== actualPlayer.position) {
        animateMovement(actualPlayer.id, currentPlayer.position, actualPlayer.position);
      }
    });
  }, [actualPlayers]);

  const animateMovement = (playerId: string, fromPos: number, toPos: number) => {
    if (movementTimers.current[playerId]) clearTimeout(movementTimers.current[playerId]);
    if (fromPos === toPos) return;
    const step = toPos > fromPos ? 1 : -1;
    const nextPos = fromPos + step;
    audio.playStep();
    setDisplayPlayers(prev => prev.map(p => p.id === playerId ? { ...p, position: nextPos } : p));
    if (nextPos !== toPos) {
      movementTimers.current[playerId] = setTimeout(() => animateMovement(playerId, nextPos, toPos), 250);
    }
  };

  useEffect(() => () => { Object.values(movementTimers.current).forEach(clearTimeout); }, []);

  // Modo seguimiento móvil: mantiene la posición actual centrada en el carril horizontal del tablero.
  useEffect(() => {
    const container = mobileScrollRef.current;
    if (!container) return;

    const cellEl = container.querySelector<HTMLElement>(`[data-cell-pos="${currentPosition}"]`);
    if (!cellEl) return;

    cellEl.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [currentPosition]);

  const getGridStyle = useCallback((position: number) => {
    const totalCols = 36;
    const totalRows = 27;

    // Lógica perimetral sincronizada a 0-120
    if (position <= 35) { // Arriba (Cols 1-36, fila 1)
      return { gridRow: 1, gridColumn: position + 1 };
    }
    if (position <= 61) { // Derecha (fila 2-27, Col 36)
      return { gridRow: (position - 35) + 1, gridColumn: totalCols };
    }
    if (position <= 96) { // Abajo (Col 35 hasta 1, fila 27)
      return { gridRow: totalRows, gridColumn: totalCols - (position - 61) };
    }
    if (position <= 120) { // Izquierda (fila 26 hasta 3)
      return { gridRow: totalRows - (position - 96), gridColumn: 1 };
    }
    return { gridRow: 1, gridColumn: 1 };
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* Tablero con scroll en móvil */}
      <div className="md:hidden w-full relative mb-1 px-1">
        <div ref={mobileScrollRef} className="flex gap-2 overflow-x-auto pb-4 pt-2 snap-x webkit-scrollbar-hide">
          {cells.map(cell => {
             const style = getCellStyle(cell.position, cell.type);
             const isCurrent = cell.position === currentPosition;
             const playersHere = displayPlayers.filter(p => p.position === cell.position);
             return (
               <div
                 key={`mob-${cell.position}`}
                 data-cell-pos={cell.position}
                 className={`relative flex-shrink-0 w-16 h-20 rounded-lg border flex flex-col items-center justify-center p-1 snap-center transition-all ${style.bg} ${isCurrent ? 'ring-2 ring-yellow-400 shadow-[0_0_0_2px_rgba(251,191,36,0.35)] scale-105' : 'opacity-60'}`}
               >
                 {isCurrent && (
                   <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-panama-yellow text-slate-950 border border-panama-yellow/70 shadow">
                     TU
                   </span>
                 )}
                 <span className={`text-xs font-black ${style.num}`}>{cell.position}</span>
                 <div className="mt-1 opacity-80">{getCellIcon(cell, true)}</div>
                 <div className="flex -space-x-1 mt-1">
                    {playersHere.map(p => (
                      <div key={p.id} className="scale-75 origin-center">
                        <PlayerIcon
                          icon={(p as any).icon || (p as any).equipped?.avatar || 'car'}
                          color={p.color}
                          size="xs"
                          isCurrentTurn={false}
                          isMe={false}
                        />
                      </div>
                    ))}
                 </div>
               </div>
             );
          })}
        </div>
      </div>

      {/* Tablero perimetral en escritorio */}
      <div className="hidden md:block w-full max-w-[1600px] mx-auto aspect-[36/27] relative bg-slate-950 rounded-2xl border border-white/5 shadow-2xl overflow-hidden p-2">
         {/* fondo centro */}
         <div className="absolute inset-[3%] z-0 rounded-xl overflow-hidden">
            <BoardCanvas />
         </div>

         {/* centro marca texto capa (estable entre clientes) */}
         <div className="pointer-events-none absolute inset-[3%] z-1 flex flex-col items-center justify-center select-none">
           <h2 className="text-[clamp(3.5rem,9vw,10rem)] font-black leading-none tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_8px_40px_rgba(15,23,42,0.65)]">
             PARKEANDO
           </h2>
           <p className="mt-4 text-[clamp(0.85rem,1.6vw,1.9rem)] font-black uppercase tracking-[0.38em] text-amber-400/85 drop-shadow-[0_4px_18px_rgba(251,191,36,0.35)]">
             EDICIÓN UNIVERSITARIA
           </p>
         </div>

         {/* Grid Cells Container */}
         <div 
           className="absolute inset-0 z-10 grid p-1"
           style={{
             gridTemplateColumns: 'repeat(36, 1fr)',
             gridTemplateRows: 'repeat(27, 1fr)',
             gap: '2px'
           }}
         >
           {cells.map(cell => {
             const style = getCellStyle(cell.position, cell.type);
             const gridPos = getGridStyle(cell.position);
             const playersHere = displayPlayers.filter(p => p.position === cell.position);
             const isCurrent = cell.position === currentPosition;

             return (
               <m.div
                 key={`cell-${cell.position}`}
                 style={gridPos}
                 className={`relative flex flex-col items-center justify-center border border-white/5 transition-all duration-300 ${style.bg} ${isCurrent ? 'scale-110 z-20 shadow-lg ring-1 ring-yellow-400' : 'hover:z-10 hover:scale-105'}`}
               >
                 <span className={`absolute top-0.5 left-1 text-[8px] font-black pointer-events-none ${style.num} opacity-50`}>{cell.position}</span>
                 
                 <div className="opacity-40">{getCellIcon(cell)}</div>

                 {/* jugadores Container */}
                 <div className="absolute inset-0 flex items-center justify-center">
                    <AnimatePresence>
                      {playersHere.map((p, idx) => (
                        <m.div
                          key={p.id}
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1, x: idx * 4 - (playersHere.length * 2) }}
                          exit={{ scale: 0.95 }}
                          className="absolute shadow-lg"
                        >
                          <PlayerIcon icon={(p as any).icon || 'car'} color={p.color} size="xs" isCurrentTurn={false} isMe={false} />
                        </m.div>
                      ))}
                    </AnimatePresence>
                 </div>
               </m.div>
             );
           })}
         </div>
      </div>
    </div>
  );
}

export default memo(Board, (prev, next) => {
  return prev.currentPosition === next.currentPosition && 
         prev.players.length === next.players.length &&
         JSON.stringify(prev.players.map(p => p.position)) === JSON.stringify(next.players.map(p => p.position));
});
