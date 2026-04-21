'use client';

import { useState, useEffect } from 'react';
import Slider from './Slider';
import Switcher from './Switcher';

interface GameSettings {
  audio: {
    master: number;
    sfx: number;
    music: number;
  };
  accessibility: {
    showPlayerIds: boolean;
    reduceMotion: boolean;
  };
  notifications: {
    enabled: boolean;
  };
}

const defaultSettings: GameSettings = {
  audio: {
    master: 100,
    sfx: 100,
    music: 25,
  },
  accessibility: {
    showPlayerIds: false,
    reduceMotion: false,
  },
  notifications: {
    enabled: true,
  },
};

export default function Settings() {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);

  // Cargar ajustes desde localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem('parkeando-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Guardar ajustes en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('parkeando-settings', JSON.stringify(settings));
  }, [settings]);

  const updateAudio = (key: keyof GameSettings['audio'], value: number) => {
    setSettings((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        [key]: value,
      },
    }));
  };

  const updateAccessibility = (
    key: keyof GameSettings['accessibility'],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        [key]: value,
      },
    }));
  };

  const updateNotifications = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        enabled,
      },
    }));
  };

  return (
    <div className="settings-panel">
      <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>
        Configuración
      </h3>

      <div className="space-y-6">
        {/* Audio Settings */}
        <div>
          <h2>Audio</h2>
          <div className="space-y-3">
            <div className="settings-item">
              <p>Volumen Principal</p>
              <Slider
                step={1}
                min={0}
                max={100}
                defaultValue={settings.audio.master}
                fixedNum={0}
                suffix="%"
                onChange={(value) => updateAudio('master', value)}
              />
            </div>
            <div className="settings-item">
              <p>Efectos de Sonido</p>
              <Slider
                step={1}
                min={0}
                max={100}
                defaultValue={settings.audio.sfx}
                fixedNum={0}
                suffix="%"
                onChange={(value) => updateAudio('sfx', value)}
              />
            </div>
            <div className="settings-item">
              <p>Música</p>
              <Slider
                step={1}
                min={0}
                max={100}
                defaultValue={settings.audio.music}
                fixedNum={0}
                suffix="%"
                onChange={(value) => updateAudio('music', value)}
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Accessibility Settings */}
        <div>
          <h2>Accesibilidad</h2>
          <div className="space-y-3">
            <div className="settings-item">
              <p>Mostrar IDs de Jugadores</p>
              <input
                type="checkbox"
                checked={settings.accessibility.showPlayerIds}
                onChange={(e) =>
                  updateAccessibility('showPlayerIds', e.target.checked)
                }
              />
            </div>
            <div className="settings-item">
              <p>Reducir Movimiento</p>
              <input
                type="checkbox"
                checked={settings.accessibility.reduceMotion}
                onChange={(e) =>
                  updateAccessibility('reduceMotion', e.target.checked)
                }
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Ajustes de notificaciones */}
        <div>
          <h2>Notificaciones</h2>
          <div className="space-y-3">
            <div className="settings-item">
              <p>Habilitar Notificaciones</p>
              <input
                type="checkbox"
                checked={settings.notifications.enabled}
                onChange={(e) => updateNotifications(e.target.checked)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Exportar hook para usar ajustes en otros componentes
export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem('parkeando-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }

    // Escuchar cambios en storage
    const handleStorageChange = () => {
      const saved = localStorage.getItem('parkeando-settings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load settings:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return settings;
}
