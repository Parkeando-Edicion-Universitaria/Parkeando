'use client';

import { useEffect, useRef } from 'react';
import { m } from 'framer-motion';

interface TurnTimerProps {
    timeLeft: number;      // Segundos restantes
    totalTime: number;     // Tiempo total del turno (segundos)
    isActive: boolean;     // Si el timer está corriendo
    size?: number;         // Tamaño del SVG en px (default 96)
}

/**
 * Timer visual circular con anillo SVG.
 * Color: verde → amarillo → rojo conforme se acaba el tiempo.
 */
export default function TurnTimer({
    timeLeft,
    totalTime,
    isActive,
    size = 96,
}: TurnTimerProps) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const fraction = Math.max(0, Math.min(1, timeLeft / totalTime));
    const offset = circumference * (1 - fraction);

    // Color interpolation: verde (>50%) → amarillo (25-50%) → rojo (<25%)
    const getColor = () => {
        if (fraction > 0.5) return '#00A651';   // Verde Panamá
        if (fraction > 0.25) return '#FFD100';  // Amarillo Panamá
        return '#DA291C';                        // Rojo Panamá urgente
    };

    const isUrgent = fraction <= 0.25;

    return (
        <div
            className="flex flex-col items-center justify-center gap-1"
            aria-label={`Tiempo restante: ${timeLeft} segundos`}
        >
            <m.div
                animate={isActive && isUrgent ? { scale: [1, 1.06, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.6 }}
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* riel gris de fondo */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth={8}
                    />
                    {/* Anillo de progreso */}
                    <m.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={getColor()}
                        strokeWidth={8}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ rotate: '-90deg', transformOrigin: `${size / 2}px ${size / 2}px` }}
                        initial={false}
                        animate={{ strokeDashoffset: offset, stroke: getColor() }}
                        transition={{ duration: 0.4, ease: 'linear' }}
                    />
                    {/* Número en el centro */}
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={size * 0.28}
                        fontWeight="bold"
                        fill={getColor()}
                    >
                        {timeLeft}
                    </text>
                </svg>
            </m.div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isActive ? 'Tu turno' : 'Esperando'}
            </p>
        </div>
    );
}
