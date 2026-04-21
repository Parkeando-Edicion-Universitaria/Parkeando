'use client';

import { useMemo, useState } from 'react';
import BattleModal, { type BattleResult } from '@/components/game/BattleModal';
import { TestIcon } from '@/components/test/TestIcons';

type Perspective = 'a' | 'b';

export default function TestRuletaPage() {
  const [playerA, setPlayerA] = useState('Jugador A');
  const [playerB, setPlayerB] = useState('Jugador B');
  const [cellNumber, setCellNumber] = useState(42);
  const [winnerPerspective, setWinnerPerspective] = useState<Perspective>('a');
  const [viewPerspective, setViewPerspective] = useState<Perspective>('a');
  const [battle, setBattle] = useState<BattleResult | null>(null);

  const winnerName = winnerPerspective === 'a' ? playerA : playerB;
  const loserName = winnerPerspective === 'a' ? playerB : playerA;

  const battlePayload = useMemo<BattleResult>(() => ({
    winnerId: winnerPerspective === 'a' ? 'player-a' : 'player-b',
    loserId: winnerPerspective === 'a' ? 'player-b' : 'player-a',
    winnerUsername: winnerName,
    loserUsername: loserName,
    participantUsernames: [playerA, playerB],
    totalPlayers: 2,
    message: `⚔️ ¡Juega Vivo! ${winnerName} gana la ruleta en la casilla ${cellNumber}.`,
  }), [winnerPerspective, winnerName, loserName, playerA, playerB, cellNumber]);

  const openPreview = () => {
    setBattle(battlePayload);
  };

  const closePreview = () => {
    setBattle(null);
  };

  const isViewerWinner =
    viewPerspective === 'a'
      ? battlePayload.winnerId === 'player-a'
      : battlePayload.winnerId === 'player-b';

  return (
    <main className="p-4 text-foreground sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-violet-300/25 bg-slate-900/75 p-6 shadow-[0_25px_90px_rgba(168,85,247,0.18)] backdrop-blur-md md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" />
            <div className="absolute top-8 right-0 h-72 w-72 rounded-full bg-cyan-500/18 blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-violet-500/22 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[40px_40px]" />
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/35 bg-violet-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-100">
              <TestIcon name="stars" className="h-3.5 w-3.5" />
              QA de combate
            </span>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Test de ruleta: choque en misma casilla
            </h1>
          </div>

          <p className="relative z-10 mt-3 max-w-3xl text-sm md:text-base text-white/80">
            Esta vista simula el caso cuando dos jugadores caen en la misma casilla y se activa
            el modal de Juega Vivo con la ruleta.
          </p>

          <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-white/70">Jugador A</span>
              <input
                value={playerA}
                onChange={(event) => setPlayerA(event.target.value || 'Jugador A')}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-[#05a5e1]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-white/70">Jugador B</span>
              <input
                value={playerB}
                onChange={(event) => setPlayerB(event.target.value || 'Jugador B')}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-[#f68f2a]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-white/70">Casilla de choque</span>
              <input
                type="number"
                min={1}
                max={120}
                value={cellNumber}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isNaN(next)) {
                    setCellNumber(Math.max(1, Math.min(120, next)));
                  }
                }}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#cadf38]"
              />
            </label>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-white/70">Ganador de la ruleta</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWinnerPerspective('a')}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${winnerPerspective === 'a'
                    ? 'border-[#3aad48] bg-[#3aad48]/20 text-white'
                    : 'border-white/20 bg-black/20 text-white/80 hover:bg-white/10'
                    }`}
                >
                  Gana {playerA}
                </button>
                <button
                  type="button"
                  onClick={() => setWinnerPerspective('b')}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${winnerPerspective === 'b'
                    ? 'border-[#3aad48] bg-[#3aad48]/20 text-white'
                    : 'border-white/20 bg-black/20 text-white/80 hover:bg-white/10'
                    }`}
                >
                  Gana {playerB}
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="rounded-2xl border border-white/15 bg-black/25 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-white/65">Vista previa del evento</p>
              <p className="mt-2 text-sm text-white/90">{battlePayload.message}</p>
            </div>
            <button
              type="button"
              onClick={openPreview}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-400 px-5 py-3 font-bold text-violet-950 transition hover:bg-violet-300"
            >
              <TestIcon name="gamepad" className="h-5 w-5" />
              Abrir ruleta
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 backdrop-blur-sm">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <TestIcon name="usersGroup" className="h-4 w-4 text-cyan-300" />
            Perspectiva de visualizacion
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewPerspective('a')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${viewPerspective === 'a'
                ? 'bg-[#db1296] text-white'
                : 'bg-white/5 text-foreground/80 hover:bg-white/10'
                }`}
            >
              Ver como {playerA}
            </button>
            <button
              type="button"
              onClick={() => setViewPerspective('b')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${viewPerspective === 'b'
                ? 'bg-[#db1296] text-white'
                : 'bg-white/5 text-foreground/80 hover:bg-white/10'
                }`}
            >
              Ver como {playerB}
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Esto cambia el estado de ganador/perdedor que ve el modal para revisar ambos escenarios.
          </p>
        </section>
      </div>

      {battle && (
        <BattleModal
          battle={battle}
          isWinner={isViewerWinner}
          onClose={closePreview}
        />
      )}
    </main>
  );
}
