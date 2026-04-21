'use client';

import { useState } from 'react';
import { m, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';
import { VariantProps } from 'class-variance-authority';

interface RippleButtonProps 
  extends Omit<HTMLMotionProps<'button'>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function RippleButton({ 
  children, 
  className = '', 
  onClick, 
  disabled, 
  variant, 
  size, 
  ...props 
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    };
    
    setRipples((prev) => [...prev, ripple]);
    
    // Limpiar ripple tras la animación (600ms, igual que la transición)
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
    
    onClick?.(e);
  };

  return (
    <m.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden select-none")}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center h-full w-full">{children}</span>
      
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
            width: '150%',
            height: '150%',
            animation: 'ripple 0.6s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
      ))}
    </m.button>
  );
}
