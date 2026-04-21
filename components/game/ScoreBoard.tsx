'use client';

import { m } from 'framer-motion';
import Image from 'next/image';
import { Player } from '@/types/game';

interface ScoreBoardProps {
  players: Player[];
  gameTime?: string;
  onClose?: () => void;
}

export default function ScoreBoard({
  players,
  gameTime = '00:00',
  onClose,
}: ScoreBoardProps) {
  // Sort jugadores by posición (closest to finish)
  const sortedPlayers = [...players].sort((a, b) => b.position - a.position);

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm"
      onClick={onClose}
    >
      <m.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image
              src="/scoreboard.png"
              alt="Scoreboard"
              width={48}
              height={48}
            />
            <h2 className="text-4xl font-bold text-white">Tabla de Posiciones</h2>
          </div>
          <p className="text-gray-400">Tiempo de juego: {gameTime}</p>
        </div>

        {/* Scoreboard */}
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <m.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-center gap-4 p-4 rounded-xl
                ${index === 0 ? 'bg-linear-to-r from-yellow-600 to-yellow-700' : ''}
                ${index === 1 ? 'bg-linear-to-r from-gray-400 to-gray-500' : ''}
                ${index === 2 ? 'bg-linear-to-r from-orange-600 to-orange-700' : ''}
                ${index > 2 ? 'bg-gray-700' : ''}
                transform transition-all hover:scale-105
              `}
            >
              {/* posición */}
              <div className="w-12 h-12 flex items-center justify-center">
                {index === 0 && <span className="text-4xl">🥇</span>}
                {index === 1 && <span className="text-4xl">🥈</span>}
                {index === 2 && <span className="text-4xl">🥉</span>}
                {index > 2 && (
                  <span className="text-2xl font-bold text-white">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Información del jugador */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">
                  {player.username}
                </h3>
                <p className="text-sm text-gray-200">
                  Casilla {player.position} de 120
                </p>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-2xl font-bold text-white">B/. {player.points || 0}</div>
                <div className="text-sm text-gray-200">
                  {Math.round((player.position / 120) * 100)}% completado · Balboa
                </div>
              </div>
            </m.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-panama-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </m.div>
    </m.div>
  );
}
