'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import { truncateSingleLineWithPretext } from '@/lib/pretext';

interface ScoreEntry {
    rank: number;
    username: string;
    games_won: number;
    total_points: number;
    games_played: number;
    win_rate_pct: number;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = [
    'from-yellow-400 to-yellow-600 border-yellow-300',
    'from-gray-300 to-gray-500 border-gray-200',
    'from-amber-700 to-amber-900 border-amber-600',
];
const SCOREBOARD_REFRESH_MS = 60_000;

export default function ScoreboardPage() {
    const router = useRouter();
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const truncateScoreName = (username: string, maxWidth: number, fontSize = 14): string => {
        return truncateSingleLineWithPretext(username || '', {
            font: `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`,
            maxWidth,
            lineHeight: fontSize + 6,
        });
    };

    const fetchScores = async () => {
        try {
            const res = await fetch('/api/scoreboard');
            if (res.ok) {
                const data = await res.json();
                setScores(data.scoreboard || []);
                setLastUpdated(new Date());
            }
        } catch {
            // silencioso
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchScores();

        const refreshWhenVisible = () => {
            if (!document.hidden) {
                void fetchScores();
            }
        };

        const interval = setInterval(refreshWhenVisible, SCOREBOARD_REFRESH_MS);
        document.addEventListener('visibilitychange', refreshWhenVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, []);

    return (
        <div className="min-h-screen min-h-dvh bg-gradient-to-br from-panama-red via-panama-blue to-panama-green p-4 pt-safe pb-safe">
            <div className="max-w-2xl mx-auto">
                {/* Encabezado */}
                <m.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6 pt-6"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                        🏆 Tabla de Honor
                    </h1>
                    <p className="text-white/80 text-sm flex items-center justify-center">
                        Top 10 jugadores de <Logo size="sm" className="ml-2" />
                    </p>
                    {lastUpdated && (
                        <p className="text-white/50 text-xs mt-1">
                            Actualizado: {lastUpdated.toLocaleTimeString('es-PA')}
                        </p>
                    )}
                </m.div>

                {/* Podio Top 3 */}
                {!loading && scores.length >= 3 && (
                    <m.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-end justify-center gap-3 mb-8"
                    >
                        {/* 2do lugar */}
                        <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-b ${MEDAL_COLORS[1]} border-2 flex items-center justify-center text-2xl shadow-lg`}>
                                {MEDAL[1]}
                            </div>
                            <div className="bg-white/20 backdrop-blur rounded-t-xl px-3 pt-3 pb-1 mt-2 text-center min-w-[80px] h-20">
                                <p className="text-white font-bold text-sm truncate max-w-[70px]">{truncateScoreName(scores[1]?.username || '', 70, 14)}</p>
                                <p className="text-yellow-200 text-xs font-semibold">{scores[1]?.games_won}🏆</p>
                                <p className="text-white/70 text-xs">{scores[1]?.total_points}pts</p>
                            </div>
                        </div>
                        {/* 1er lugar */}
                        <div className="flex flex-col items-center">
                            <div className={`w-20 h-20 rounded-full bg-gradient-to-b ${MEDAL_COLORS[0]} border-4 flex items-center justify-center text-3xl shadow-xl`}>
                                {MEDAL[0]}
                            </div>
                            <div className="bg-white/30 backdrop-blur rounded-t-xl px-4 pt-3 pb-1 mt-2 text-center min-w-[90px] h-24">
                                <p className="text-white font-bold truncate max-w-[78px]">{truncateScoreName(scores[0]?.username || '', 78, 16)}</p>
                                <p className="text-yellow-200 text-sm font-bold">{scores[0]?.games_won}🏆</p>
                                <p className="text-white/70 text-xs">{scores[0]?.total_points}pts</p>
                            </div>
                        </div>
                        {/* 3er lugar */}
                        <div className="flex flex-col items-center">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-b ${MEDAL_COLORS[2]} border-2 flex items-center justify-center text-xl shadow-lg`}>
                                {MEDAL[2]}
                            </div>
                            <div className="bg-white/20 backdrop-blur rounded-t-xl px-3 pt-3 pb-1 mt-2 text-center min-w-[80px] h-16">
                                <p className="text-white font-bold text-sm truncate max-w-[70px]">{truncateScoreName(scores[2]?.username || '', 70, 14)}</p>
                                <p className="text-yellow-200 text-xs font-semibold">{scores[2]?.games_won}🏆</p>
                                <p className="text-white/70 text-xs">{scores[2]?.total_points}pts</p>
                            </div>
                        </div>
                    </m.div>
                )}

                {/* Lista completa */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-2xl overflow-hidden"
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-10 h-10 border-4 border-panama-blue border-t-transparent rounded-full animate-spin" />
                            <p className="text-gray-500 text-sm">Cargando tabla...</p>
                        </div>
                    ) : scores.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-4xl mb-3">🎮</p>
                            <p className="text-gray-600 font-semibold">¡Sin jugadores aún!</p>
                            <p className="text-gray-400 text-sm mt-1">Sé el primero en ganar.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {/* encabezado de tabla */}
                            <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                <span>#</span>
                                <span className="col-span-2">Jugador</span>
                                <span className="text-center">Victorias</span>
                                <span className="text-center">Puntos</span>
                            </div>
                            {scores.map((entry, idx) => (
                                <m.div
                                    key={entry.username}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`grid grid-cols-5 gap-2 px-4 py-3 items-center ${idx < 3 ? 'bg-yellow-50/30' : ''}`}
                                >
                                    <span className="font-bold text-lg text-gray-400">
                                        {idx < 3 ? MEDAL[idx] : `#${entry.rank}`}
                                    </span>
                                    <div className="col-span-2">
                                        <p className="font-semibold text-gray-800 truncate">{truncateScoreName(entry.username, 180, 14)}</p>
                                        <p className="text-xs text-gray-400">{entry.games_played} partidas · {entry.win_rate_pct}% victorias</p>
                                    </div>
                                    <span className="text-center font-bold text-panama-blue">{entry.games_won}</span>
                                    <span className="text-center font-semibold text-panama-green">{entry.total_points}</span>
                                </m.div>
                            ))}
                        </div>
                    )}
                </m.div>

                {/* Botones de navegación */}
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3 mt-6"
                >
                    <button
                        onClick={() => router.push('/lobby')}
                        className="flex-1 py-3 bg-white text-panama-blue font-bold rounded-xl shadow hover:bg-gray-50 transition-colors"
                    >
                        🚌 Ir al Lobby
                    </button>
                    <button
                        onClick={fetchScores}
                        className="px-4 py-3 bg-white/20 text-white font-bold rounded-xl backdrop-blur hover:bg-white/30 transition-colors"
                        title="Actualizar"
                    >
                        🔄
                    </button>
                </m.div>
            </div>
        </div>
    );
}
