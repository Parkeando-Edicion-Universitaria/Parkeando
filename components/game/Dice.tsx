'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { m } from 'framer-motion';
import { useAudio } from '@/lib/audio';
import { RippleButton } from '@/components/ui/RippleButton';
import { Dices } from 'lucide-react';

interface DiceProps {
  onRoll: (value: number) => void;
  disabled?: boolean;
  /** Si se provee, la animación termina en este valor confirmado por servidor. */
  serverResult?: number[] | null;
}

function Dice({ onRoll, disabled, serverResult }: DiceProps) {
  const [rolling, setRolling] = useState(false);
  const [diceValues, setDiceValues] = useState<[number, number]>([1, 1]);
  const [showDice, setShowDice] = useState(false);
  const audio = useAudio();
  const animationRef = useRef<number | null>(null);
  const isRollingRef = useRef(false);
  const pendingServerResult = useRef<number[] | null>(null);

  useEffect(() => {
    audio.preloadSounds();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Cuando el servidor responde con el resultado real del dado, sincroniza la vista.
  useEffect(() => {
    if (serverResult && serverResult.length === 2) {
      pendingServerResult.current = serverResult;
      if (!isRollingRef.current) {
        setDiceValues([serverResult[0], serverResult[1]]);
      }
    }
  }, [serverResult]);

  const diceAnimation = () => {
    isRollingRef.current = true;
    let startTime: number | null = null;
    const duration = 800;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed < duration && isRollingRef.current) {
        setDiceValues([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Caer en el resultado del servidor si está disponible; si no, usar uno aleatorio.
        const finalValues = pendingServerResult.current ?? [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
        setDiceValues([finalValues[0], finalValues[1]]);
        isRollingRef.current = false;
        setRolling(false);
        audio.playClick();
        onRoll(finalValues[0] + finalValues[1]);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const rollDice = () => {
    if (disabled || rolling) return;
    pendingServerResult.current = null;
    setRolling(true);
    setShowDice(true);
    audio.playDiceRoll();
    diceAnimation();
  };

  const getDiceImage = (value: number) => `/c${value}.png`;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dado */}
      {showDice && (
        <m.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-4 mb-2"
        >
          <m.div
            animate={rolling ? { rotate: [0, 360], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
            className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getDiceImage(diceValues[0])}
              alt={`Dado ${diceValues[0]}`}
              className="w-full h-full object-contain drop-shadow-sm p-2"
            />
          </m.div>
          <m.div
            animate={rolling ? { rotate: [360, 0], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
            className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getDiceImage(diceValues[1])}
              alt={`Dado ${diceValues[1]}`}
              className="w-full h-full object-contain drop-shadow-sm p-2"
            />
          </m.div>
        </m.div>
      )}

      {/* Resultado */}
      {showDice && !rolling && (
        <m.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-1">
          <p className="text-sm text-muted-foreground">Sacaste</p>
          <p className="text-4xl font-bold text-panama-blue">{diceValues[0] + diceValues[1]}</p>
        </m.div>
      )}

      {/* Botón */}
      <RippleButton
        onClick={rollDice}
        disabled={disabled || rolling}
        variant={disabled || rolling ? "outline" : "panama-red"}
        size="xl"
        className="w-full max-w-[200px]"
      >
        {rolling ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Lanzando...
          </span>
        ) : (
          <span className="flex items-center gap-2"><Dices size={20} /> Lanzar Dado</span>
        )}
      </RippleButton>

      {!disabled && !rolling && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Lanza el dado para avanzar en el tablero
        </p>
      )}
    </div>
  );
}

export default memo(Dice);
