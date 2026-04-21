'use client';

import React from 'react';

const LOGO_COLORS = [
  { char: 'P', color: '#E32636' }, // rojo
  { char: 'a', color: '#FF7F00' }, // naranja
  { char: 'r', color: '#FFD700' }, // amarillo
  { char: 'k', color: '#0055A4' }, // Azul
  { char: 'e', color: '#00BFFF' }, // Celeste
  { char: 'a', color: '#32CD32' }, // verde lima
  { char: 'n', color: '#228B22' }, // verde arbusto
  { char: 'd', color: '#FF1493' }, // rosa fiucha
  { char: 'o', color: '#800080' }, // morado
];

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
  };

  return (
    <span className={`inline-flex font-black tracking-tight ${sizeClasses[size]} ${className}`}>
      {LOGO_COLORS.map((item, index) => (
        <span key={index} style={{ color: item.color }}>
          {item.char}
        </span>
      ))}
    </span>
  );
}
