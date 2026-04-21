'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import Logo from '@/components/ui/Logo';

interface MainMenuProps {
  onStartGame?: () => void;
  onJoinGame?: () => void;
}

export default function MainMenu({ onStartGame, onJoinGame }: MainMenuProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const menuItems = [
    {
      id: 'new-game',
      title: 'Nueva Partida',
      description: 'Crear una nueva partida',
      icon: '/roll.png',
      action: onStartGame,
      color: 'from-panama-blue to-blue-700',
    },
    {
      id: 'join-game',
      title: 'Unirse a Partida',
      description: 'Unirse con código',
      icon: '/players.png',
      action: onJoinGame,
      color: 'from-panama-green to-green-700',
    },
    {
      id: 'rules',
      title: 'Reglas del Juego',
      description: 'Aprende a jugar',
      icon: '/credits.png',
      href: '/rules',
      color: 'from-panama-yellow to-yellow-600',
    },
    {
      id: 'gallery',
      title: 'Galería',
      description: 'Ver capturas del juego',
      icon: '/all.png',
      href: '/gallery',
      color: 'from-panama-red to-red-700',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-panama-blue via-gray-900 to-panama-red p-8">
      <div className="max-w-6xl w-full">
        {/* Logo/Title */}
        <m.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Logo size="xl" className="mb-4 drop-shadow-2xl" />
          <p className="text-2xl text-panama-yellow font-semibold">
            Edición Universitaria
          </p>
          <p className="text-lg text-gray-300 mt-4">
            Descubre Panamá mientras juegas
          </p>
        </m.div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {menuItems.map((item, index) => (
            <m.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              onHoverStart={() => setHoveredButton(item.id)}
              onHoverEnd={() => setHoveredButton(null)}
            >
              {item.href ? (
                <Link href={item.href}>
                  <MenuCard item={item} isHovered={hoveredButton === item.id} />
                </Link>
              ) : (
                <button
                  onClick={item.action}
                  className="w-full text-left focus:outline-none"
                >
                  <MenuCard item={item} isHovered={hoveredButton === item.id} />
                </button>
              )}
            </m.div>
          ))}
        </div>

        {/* Footer */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-16 text-gray-400"
        >
          <p>Versión 1.0.0 - Marzo 2026</p>
          <p className="text-sm mt-2">
            Desarrollado con ❤️ para la comunidad universitaria
          </p>
        </m.div>
      </div>
    </div>
  );
}

function MenuCard({
  item,
  isHovered,
}: {
  item: any;
  isHovered: boolean;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-8
        bg-gradient-to-br ${item.color}
        transform transition-all duration-300
        ${isHovered ? 'scale-105 shadow-2xl' : 'shadow-lg'}
        cursor-pointer
      `}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Image
              src={item.icon}
              alt={item.title}
              width={40}
              height={40}
              className="filter drop-shadow-lg"
            />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{item.title}</h3>
            <p className="text-white text-opacity-90">{item.description}</p>
          </div>
        </div>
      </div>

      {/* Animated fondo effect */}
      <m.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}
