'use client';

import { m } from 'framer-motion';
import { Ticket } from 'lucide-react';

interface WildcardCounterProps {
    count: number;   // Comodines actuales
    max: number;     // Máximo (usualmente 5)
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

/**
 * Contador de comodines representado como tarjetas (Ticket) llenas/vacías.
 * Las tarjetas vacías aparecen en gris, las llenas en naranja vibrante.
 */
export default function WildcardCounter({
    count,
    max,
    size = 'md',
    showLabel = true,
}: WildcardCounterProps) {
    const iconSizes = { sm: 14, md: 18, lg: 24 };
    const iconSize = iconSizes[size];

    return (
        <div className="flex flex-col items-center gap-1">
            {showLabel && (
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Comodines
                </p>
            )}
            <div className="flex items-center gap-0.5 flex-wrap justify-center">
                {Array.from({ length: max }).map((_, i) => {
                    const filled = i < count;
                    return (
                        <m.div
                            key={i}
                            title={filled ? `Comodín ${i + 1}` : 'Comodín vacío'}
                            className={`select-none leading-none ${filled ? 'text-orange-500 opacity-100' : 'text-gray-300 opacity-25 grayscale'
                                }`}
                            initial={false}
                            animate={
                                filled
                                    ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }
                                    : {}
                            }
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                            <Ticket size={iconSize} />
                        </m.div>
                    );
                })}
            </div>

            {/* Texto de conteo */}
            <p className={`font-bold leading-none ${count === max
                    ? 'text-orange-600'
                    : count === 0
                        ? 'text-gray-400'
                        : 'text-orange-500'
                } ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                {count === max
                    ? '¡Máximo!'
                    : count === 0
                        ? 'Sin comodines'
                        : `${count} / ${max}`}
            </p>
        </div>
    );
}
