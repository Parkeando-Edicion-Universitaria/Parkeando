'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import PlayersList from './PlayersList';
import Chat from './Chat';
import Settings from '../ui/Settings';
import { Player } from '@/types/game';

interface GameNavProps {
  players: Player[];
  currentTurn: string;
  gameId: string;
  playerName: string;
  onLeave: () => void;
  onSendMessage?: (message: string) => void;
}

export interface GameNavRef {
  addMessage: (msg: { from: string; message: string }) => void;
  showNotification: () => void;
}

const tabs = [
  { id: 0, name: 'Jugadores', icon: '/all.png' },
  { id: 1, name: 'Chat', icon: '/chat.png' },
  { id: 2, name: 'Historial', icon: '/history.png' },
  { id: 3, name: 'Configuración', icon: '/settings.png' },
];

const GameNav = forwardRef<GameNavRef, GameNavProps>((props, ref) => {
  const [activeTab, setActiveTab] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useImperativeHandle(ref, () => ({
    addMessage(msg) {
      if (activeTab !== 1) {
        setHasNewMessage(true);
      }
    },
    showNotification() {
      // Implementar notificación visual
    },
  }));

  const handleTabChange = (tabId: number) => {
    setActiveTab(tabId);
    if (tabId === 1) {
      setHasNewMessage(false);
    }
  };

  return (
    <div className="game-nav-container">
      {/* Sidebar con iconos */}
      <div className="game-nav-sidebar">
        <div className="nav-logo">
          <Image
            src="/all.png"
            alt="Parkeando"
            width={40}
            height={40}
            className="opacity-80"
          />
        </div>

        <div className="nav-tabs-upper">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`nav-tab-button ${activeTab === tab.id ? 'active' : ''
                }`}
              title={tab.name}
            >
              <Image
                src={tab.icon}
                alt={tab.name}
                width={24}
                height={24}
                className={activeTab === tab.id ? 'opacity-100' : 'opacity-40'}
              />
              {tab.id === 1 && hasNewMessage && (
                <span className="notification-badge" />
              )}
            </button>
          ))}
        </div>

        <div className="nav-tabs-lower">
          <button
            onClick={props.onLeave}
            className="nav-tab-button leave-button"
            title="Salir"
          >
            <Image
              src="/trash.png"
              alt="Salir"
              width={24}
              height={24}
              className="opacity-70 hover:opacity-100"
            />
          </button>
        </div>
      </div>

      {/* Contenido del panel */}
      <div className="game-nav-content">
        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 0 && (
              <PlayersList
                players={props.players}
                currentPlayerId={props.currentTurn}
                myPlayerId={''}
              />
            )}

            {activeTab === 1 && (
              <Chat
                gameId={props.gameId}
                playerName={props.playerName}
                onSendMessage={props.onSendMessage}
              />
            )}

            {activeTab === 2 && (
              <div className="p-4">
                <h3 className="text-center text-2xl font-bold mb-4 text-white">
                  Historial
                </h3>
                <div className="text-white text-center opacity-70">
                  <p>Próximamente: Historial de movimientos</p>
                </div>
              </div>
            )}

            {activeTab === 3 && <Settings />}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

GameNav.displayName = 'GameNav';

export default GameNav;
