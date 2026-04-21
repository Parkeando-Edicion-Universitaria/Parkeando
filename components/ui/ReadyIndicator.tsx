'use client';

import { m, AnimatePresence } from 'framer-motion';

interface ReadyIndicatorProps {
    isReady: boolean;
    username: string;
    icon?: string;
    color?: string;
    timeoutSeconds?: number;   // Tiempo hasta ser expulsado (para mostrar countdown)
    secondsLeft?: number;      // Segundos restantes antes del kick
}

/**
 * Indicador de estado "listo" en la cola del lobby.
 * Verde pulsante cuando está listo, gris animado cuando espera.
 */
export default function ReadyIndicator({
    isReady,
    username,
    icon = '🚗',
    color = '#0033A0',
    timeoutSeconds = 120,
    secondsLeft,
}: ReadyIndicatorProps) {
    const urgentKick = secondsLeft !== undefined && secondsLeft <= 30;

    return (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 transition-all shadow-sm"
            style={{ borderColor: isReady ? '#00A651' : urgentKick ? '#DA291C' : '#E5E7EB' }}
        >
            {/* Icono del jugador */}
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-md flex-shrink-0"
                style={{ backgroundColor: color }}
            >
                {icon}
            </div>

            {/* Nombre */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{username}</p>
                <p className={`text-xs font-medium ${isReady ? 'text-green-600' : urgentKick ? 'text-red-500' : 'text-gray-400'
                    }`}>
                    {isReady
                        ? '✅ Listo'
                        : urgentKick && secondsLeft !== undefined
                            ? `⏱ Expira en ${secondsLeft}s`
                            : '⏳ Esperando ready...'}
                </p>
            </div>

            {/* Indicador de estado */}
            <AnimatePresence mode="wait">
                {isReady ? (
                    <m.div
                        key="ready"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-md"
                    >
                        <span className="text-white text-sm font-bold">✓</span>
                    </m.div>
                ) : (
                    <m.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Puntos de carga animados */}
                        <div className="flex gap-0.5">
                            {[0, 1, 2].map((i) => (
                                <m.div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${urgentKick ? 'bg-red-400' : 'bg-gray-300'}`}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 1,
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
