'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function HeartbeatHandler() {
  const pathname = usePathname();
  const { isAuthenticated, authenticatedFetch } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Mapping pathnames to friendly location names
    const getLocationName = (path: string) => {
      if (path === '/') return 'inicio';
      if (path.startsWith('/lobby')) return 'lobby';
      if (path.startsWith('/game/play')) return 'jugando';
      if (path.startsWith('/shop')) return 'tienda';
      if (path.startsWith('/admin')) return 'admin';
      if (path.startsWith('/profile')) return 'perfil';
      if (path.startsWith('/rules')) return 'reglas';
      return 'explorando';
    };

    const sendHeartbeat = async () => {
      try {
        await authenticatedFetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: getLocationName(pathname) })
        });
      } catch (err) {
        // Error silencioso en heartbeat
      }
    };

    // Send initial heartbeat on mount/path change
    sendHeartbeat();

    // Configurar intervalo para heartbeats posteriores
    const interval = setInterval(sendHeartbeat, 30000); // cada 30 segundos

    return () => clearInterval(interval);
  }, [pathname, isAuthenticated, authenticatedFetch]);

  return null; // Este componente no renderiza nada.
}
