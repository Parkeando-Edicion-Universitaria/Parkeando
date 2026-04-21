'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { m, AnimatePresence } from 'framer-motion';
import { sileo } from 'sileo';
import { useAudio } from '@/lib/audio';
import ReadyIndicator from '@/components/ui/ReadyIndicator';
import PlayerIcon from '@/components/game/PlayerIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Gamepad2, BookOpen, Clock, Users, CheckCircle2, Shield, Shirt, MessageSquareOff, MessageSquare, Loader2, LogOut, Bus, Eye } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { RippleButton } from '@/components/ui/RippleButton';
import { GAME_TIMING } from '@/lib/game-timing';
import dynamic from 'next/dynamic';

// División de código para componentes pesados
const Chat = dynamic(() => import('@/components/game/Chat'), { 
  ssr: false, 
  loading: () => <div className="h-full w-full bg-black/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground">Conectando chat...</div> 
});
const SettingsModal = dynamic(() => import('@/components/lobby/SettingsModal'), { ssr: false });

const READY_TIMEOUT_SECONDS = 300;

const normalizeLobbyGameId = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') return '';
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      try {
        return normalizeLobbyGameId(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nestedId = normalizeLobbyGameId(record.id);
    if (nestedId) return nestedId;
    const nestedGameId = normalizeLobbyGameId(record.gameId);
    if (nestedGameId) return nestedGameId;
    const nestedLegacyGameId = normalizeLobbyGameId(record.game_id);
    if (nestedLegacyGameId) return nestedLegacyGameId;
  }
  return '';
};

const getLatestAccessToken = (): string | null => {
  const storeToken = useAuthStore.getState().tokens?.accessToken;
  if (storeToken) return storeToken;

  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem('parkeando-auth');
    if (!raw) return null;
    const persisted = JSON.parse(raw);
    return persisted?.state?.tokens?.accessToken ?? null;
  } catch {
    return null;
  }
};

export default function LobbyPage() {
  const router = useRouter();
  const { user, clearAuth, authenticatedFetch } = useAuthStore();
  const audio = useAudio();
  const [mounted, setMounted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [loading, setLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setLoading(false);
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  }, []);

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(READY_TIMEOUT_SECONDS);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const lastHeartbeatPingRef = useRef(0);
  const lastActivityUiSyncRef = useRef(0);
  const gameRef = useRef<any>(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/scoreboard');
      const data = await response.json().catch(() => null);
      if (response.ok && data?.scoreboard) {
        setLeaderboard(data.scoreboard);
      }
    } catch (error) {
      console.error('[Lobby] No se pudo cargar el leaderboard:', error);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const markLobbyActivity = useCallback((persist = false) => {
    const now = Date.now();
    const currentGame = gameRef.current;

    if (persist || now - lastActivityUiSyncRef.current >= 1000) {
      lastActivityUiSyncRef.current = now;
      setLastActivityAt(new Date(now));
    }

    if (!persist || !currentGame?.id || currentGame.status !== 'waiting') return;

    if (now - lastHeartbeatPingRef.current < 5000) return;

    lastHeartbeatPingRef.current = now;
    authenticatedFetch('/api/game/heartbeat', {
      method: 'POST'
    }).catch(() => {});
  }, [authenticatedFetch]);

  const sendLobbyLeaveBeacon = useCallback((gameId: string) => {
    const latestAccessToken = getLatestAccessToken();
    const body = JSON.stringify({ gameId, accessToken: latestAccessToken });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (latestAccessToken) {
      headers.Authorization = `Bearer ${latestAccessToken}`;
    }

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/game/leave', new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch('/api/game/leave', { method: 'POST', headers, body, keepalive: true }).catch(() => {});
  }, []);

  // Enviado cuando el lobby pasa a estado oculto (visibilitychange hidden / pagehide
  // persistido en BFCache). Retrodata last_action_at para que el servidor detecte
  // inactividad tras LOBBY_DISCONNECT_GRACE_MS en vez de los 5 min completos.
  // El próximo heartbeat al volver restablece last_action_at y cancela la detección.
  const sendLobbyGoingAwayBeacon = useCallback((gameId: string) => {
    const latestAccessToken = getLatestAccessToken();
    const body = JSON.stringify({ gameId, accessToken: latestAccessToken });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/game/going-away', new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch('/api/game/going-away', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }, []);

  const checkActiveGame = useCallback(async () => {
    if (!user) return;

    // 1. Primero buscar si YA estamos en un juego (jugador o espectador)
    const { data: playerGame } = await supabase
      .from('games')
      .select('*, game_players!inner(*)')
      .eq('game_players.user_id', user.id)
      .neq('game_players.status', 'inactive')
      .in('status', ['waiting', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (playerGame) {
      setGame(playerGame);
      const playersResult = await supabase.from('game_players').select('*').eq('game_id', playerGame.id);
      setPlayers(playersResult.data || []);

      const mine = playersResult.data?.find((p: any) => p.user_id === user?.id);
      if (mine) {
        const activitySource = mine.last_action_at || mine.joined_at;
        setLastActivityAt(activitySource ? new Date(activitySource) : null);
      }

      if (playerGame.status === 'in_progress') {
        // Si el jugador lleva más de 2 minutos sin actividad en la partida (lo mismo que el
        // tiempo agotado AFK), significa que cerró el navegador sin usar el botón de salir. En ese
        // caso lo abandonamos automáticamente para que pueda unirse a una nueva partida, en
        // vez de redirigirlo de vuelta a una partida que ya abandonó.
        const mineLastAction = mine?.last_action_at ? new Date(mine.last_action_at).getTime() : 0;
        const timeSinceLastAction = Date.now() - mineLastAction;

        if (mineLastAction > 0 && timeSinceLastAction > GAME_TIMING.AFK_TIMEOUT_MS) {
          const gameId = normalizeLobbyGameId(playerGame.id);
          if (gameId) {
            try {
              await authenticatedFetch('/api/game/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId }),
              });
            } catch (err) {
              console.warn('[Lobby] Auto-leave failed for stale in-progress game:', err);
              // Si falla el leave, igual no redirigimos: el AFK los expulsará eventualmente.
            }
          }
          setGame(null);
          setPlayers([]);
          return;
        }

        router.push('/game/play');
      }
      return;
    }

    // 1.5 Si no es jugador activo, verificar si está como espectador en una partida en curso.
    const { data: spectatorGame } = await supabase
      .from('games')
      .select('id, status, spectators, max_players')
      .eq('status', 'in_progress')
      .contains('spectators', [user.id])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (spectatorGame) {
      router.push(`/game/play?spectate=${spectatorGame.id}`);
      return;
    }

    // 2. Si no estamos en uno, buscar si hay alguno 'waiting' o 'in_progress' para mostrar
    const { data: anyActiveGame } = await supabase
      .from('games')
      .select('*, game_players(*)')
      .in('status', ['waiting', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (anyActiveGame) {
      setGame(anyActiveGame);
      setPlayers(anyActiveGame.game_players || []);
      const mine = anyActiveGame.game_players?.find((p: any) => p.user_id === user?.id);
      if (mine) {
        const activitySource = mine.last_action_at || mine.joined_at;
        setLastActivityAt(activitySource ? new Date(activitySource) : null);
      } else {
        setLastActivityAt(null);
      }
    } else {
      setGame(null);
      setPlayers([]);
      setLastActivityAt(null);
    }
  }, [user, router, authenticatedFetch]);

  const redirectToLogin = useCallback(() => {
    router.replace('/auth/login');
  }, [router]);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { redirectToLogin(); return; }
    checkActiveGame();

    const debounceRef = { current: null as NodeJS.Timeout | null };
    const debouncedCheck = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => checkActiveGame(), 600);
    };

    const channel = supabase.channel('lobby-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, debouncedCheck)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, debouncedCheck)
      .subscribe();

    const heartbeatInterval = setInterval(async () => {
      const currentGame = gameRef.current;
      if (user && currentGame && currentGame.status === 'waiting' && !document.hidden) {
        try {
          markLobbyActivity(true);
        } catch (e) { }

        // Disparar limpieza para la partida en espera visible sin importar si
        // el usuario actual se unió. Esto elimina jugadores fantasma (quienes cerraron
        // el navegador sin salir correctamente) incluso cuando son el único jugador
        // en el lobby y no se está enviando heartbeat dentro de partida.
        const gameId = normalizeLobbyGameId(currentGame) || normalizeLobbyGameId(currentGame.id);
        if (gameId) {
          authenticatedFetch('/api/game/waiting-cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId }),
          }).catch(() => {});
        }
      }
    }, 20000); 

    const handleWindowFocus = () => {
      if (document.hidden) return;
      markLobbyActivity(true);
      checkActiveGame();
    };

    const handleLocalActivity = () => {
      const currentGame = gameRef.current;
      if (document.hidden || !currentGame || currentGame.status !== 'waiting') return;
      markLobbyActivity(true);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // La página volvió a ser visible: refrescar actividad y estado de la partida.
        handleWindowFocus();
      } else {
        // La página pasó a oculto (móvil: app en segundo plano).
        // Enviamos un beacon de going-away para que el servidor detecte AFK
        // tras LOBBY_DISCONNECT_GRACE_MS en lugar de los 5 min completos.
        // Si el jugador regresa, el siguiente heartbeat/focus restablece last_action_at.
        const currentGame = gameRef.current;
        if (currentGame?.id && currentGame.status === 'waiting') {
          const normalizedId = normalizeLobbyGameId(currentGame) || normalizeLobbyGameId(currentGame.id);
          if (normalizedId) {
            sendLobbyGoingAwayBeacon(normalizedId);
          }
        }
      }
    };

    const handleUnload = (e: Event) => {
      const currentGame = gameRef.current;
      if (!currentGame?.id || currentGame.status !== 'waiting') return;

      // En pagehide con persisted=true la página entra en BFCache (móvil: app en segundo
      // plano). Ya se envió un beacon going- desde visibilitychange, así que aquí no
      // hacemos nada para no patear al jugador innecesariamente.
      if (e.type === 'pagehide' && (e as PageTransitionEvent).persisted) return;

      const normalizedId = normalizeLobbyGameId(currentGame) || normalizeLobbyGameId(currentGame.id);
      if (normalizedId) {
        sendLobbyLeaveBeacon(normalizedId);
      }
    };

    const passiveEventOpts: AddEventListenerOptions = { passive: true };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('mousedown', handleLocalActivity);
    window.addEventListener('mousemove', handleLocalActivity);
    window.addEventListener('pointerdown', handleLocalActivity);
    window.addEventListener('pointermove', handleLocalActivity);
    window.addEventListener('scroll', handleLocalActivity, passiveEventOpts);
    window.addEventListener('wheel', handleLocalActivity, passiveEventOpts);
    window.addEventListener('touchstart', handleLocalActivity, passiveEventOpts);
    window.addEventListener('touchmove', handleLocalActivity, passiveEventOpts);
    window.addEventListener('keydown', handleLocalActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('mousedown', handleLocalActivity);
      window.removeEventListener('mousemove', handleLocalActivity);
      window.removeEventListener('pointerdown', handleLocalActivity);
      window.removeEventListener('pointermove', handleLocalActivity);
      window.removeEventListener('scroll', handleLocalActivity);
      window.removeEventListener('wheel', handleLocalActivity);
      window.removeEventListener('touchstart', handleLocalActivity);
      window.removeEventListener('touchmove', handleLocalActivity);
      window.removeEventListener('keydown', handleLocalActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, mounted, checkActiveGame, markLobbyActivity, redirectToLogin, router, sendLobbyLeaveBeacon, sendLobbyGoingAwayBeacon]);

  useEffect(() => {
    if (!lastActivityAt || !game || game.status !== 'waiting') return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityAt.getTime()) / 1000);
      const left = Math.max(0, READY_TIMEOUT_SECONDS - elapsed);
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(interval);
        setLastActivityAt(null);
        handleLeaveGame(); 
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastActivityAt, game]);

  useEffect(() => {
    if (!game?.queue?._startCountdownAt || game.status !== 'waiting') {
      setCountdownLeft(null);
      return;
    }

    const countdownTarget = new Date(game.queue._startCountdownAt).getTime();

    const interval = setInterval(async () => {
      const now = Date.now();
      const diff = Math.ceil((countdownTarget - now) / 1000);

      if (diff <= 0) {
        setCountdownLeft(0);
        clearInterval(interval);
        try {
          await authenticatedFetch('/api/game/start', {
            method: 'POST'
          });
        } catch (e) {
          console.error("Error al iniciar juego:", e);
        }
      } else {
        setCountdownLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.queue?._startCountdownAt, game?.status]);

  const startLoading = () => {
    setLoading(true);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, 8000); 
  };

  const handleCreateGame = async () => {
    startLoading();
    try {
      const res = await authenticatedFetch('/api/game/create', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      audio.playClick();
      sileo.success({ title: '¡Juego creado! Esperando jugadores...' });
      await checkActiveGame();
    } catch (e: any) { 
        sileo.error({ title: e.message }); 
    } finally { 
        setLoading(false);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  };

  const handleJoinGame = async () => {
    startLoading();
    try {
      const res = await authenticatedFetch('/api/game/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: user?.username || 'Invitado' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      audio.playClick();
      if (data.status === 'spectator' && data.gameId) {
        sileo.info({ title: data.message || 'Entrando como espectador...' });
        router.push(`/game/play?spectate=${data.gameId}`);
        return;
      }

      sileo.success({ title: '¡Te has unido!' });
      setLastActivityAt(new Date());
      await checkActiveGame();
    } catch (e: any) { 
        sileo.error({ title: e.message }); 
    } finally { 
        setLoading(false); 
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  };

  const handleReady = async () => {
    startLoading();
    try {
      const res = await authenticatedFetch('/api/game/ready', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      audio.playClick();
      sileo.success({ title: data.message });
      markLobbyActivity(true);
      await checkActiveGame();
    } catch (e: any) { 
        sileo.error({ title: e.message }); 
    } finally { 
        setLoading(false); 
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  };

  const handleSpectateGame = async () => {
    startLoading();
    try {
      const res = await authenticatedFetch('/api/game/spectate', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      audio.playClick();
      sileo.success({ title: 'Entrando como espectador...' });
      if (data.gameId) {
        router.push(`/game/play?spectate=${data.gameId}`);
        return;
      }
      await checkActiveGame();
    } catch (e: any) { 
        sileo.error({ title: e.message }); 
    } finally { 
        setLoading(false); 
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  };

  const handleLeaveGame = async () => {
    if (!game) return;
    startLoading();
    try {
      const res = await authenticatedFetch('/api/game/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      audio.playClick();
      sileo.success({ title: data.message });
      setLastActivityAt(null);
      await checkActiveGame();
    } catch (e: any) {
      sileo.error({ title: e.message });
    } finally {
      setLoading(false);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  };

  const myPlayerEntry = players.find((p: any) => p.user_id === user?.id);
  const normalizedLobbyGameId = normalizeLobbyGameId(game?.id);
  const inactivityProgressPercent = Math.round(
    ((READY_TIMEOUT_SECONDS - secondsLeft) / READY_TIMEOUT_SECONDS) * 100
  );
  const timerColor = secondsLeft > 60 ? 'text-green-400' : secondsLeft > 30 ? 'text-yellow-400' : 'text-red-400';

  if (!mounted || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-panama-yellow animate-spin" /></div>;
  }

  return (
    <div className="relative min-h-screen min-h-dvh overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-panama-blue/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-panama-red/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <nav className="glass border-b border-white/5 px-6 pb-4 pt-[max(1rem,env(safe-area-inset-top))]" aria-label="Navegación del Lobby">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground/80 hidden sm:block mr-3 font-semibold tracking-wide">
                {user?.username}
              </span>
              <Button variant="outline" size="sm" onClick={() => router.push('/shop')} className="border-panama-yellow/30 text-panama-yellow hover:bg-panama-yellow/10 shadow-sm">
                <Shirt className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Tienda</span>
              </Button>
              {user?.is_admin && (
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/dashboard')} className="border-panama-yellow/50 text-panama-yellow hover:bg-panama-yellow/10 shadow-sm">
                  <Shield className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <SettingsModal />
            </div>
          </div>
        </nav>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                <Bus className="inline-block mr-2 text-panama-yellow" /> Sala de Espera
              </h1>
              <p className="text-center text-muted-foreground text-sm mb-8">
                Únete o crea una partida para comenzar
              </p>

              <AnimatePresence mode="wait">
                {!game ? (
                  <m.div
                    key="no-game"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-strong rounded-2xl p-10 text-center border-white/10"
                  >
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-panama-yellow/10 flex items-center justify-center">
                        <Gamepad2 className="w-10 h-10 text-panama-yellow" />
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      No hay partidas activas.
                    </p>
                    <RippleButton
                      onClick={handleCreateGame}
                      disabled={loading}
                      variant="panama"
                      size="lg"
                      className="min-w-[200px]"
                    >
                      {loading ? (
                        <span className="animate-pulse">Creando...</span>
                      ) : (
                        <><Plus className="w-5 h-5 mr-2" /> Crear Nueva Partida</>
                      )}
                    </RippleButton>
                  </m.div>
                ) : (
                  <m.div
                    key="game"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    {countdownLeft !== null && countdownLeft >= 0 && (
                      <m.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-5 rounded-2xl bg-panama-yellow/20 border border-panama-yellow/50 backdrop-blur-xl text-center shadow-[0_0_30px_rgba(252,196,13,0.15)]"
                      >
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-panama-yellow/80 mb-1">Iniciando partida en</div>
                        <div className="text-6xl font-black text-panama-yellow tabular-nums drop-shadow-sm" role="timer" aria-live="assertive">{countdownLeft}</div>
                        <div className="text-xs text-panama-yellow/60 mt-2 font-semibold">¡Prepárate! Todos los jugadores están listos.</div>
                      </m.div>
                    )}

                    <div className="glass rounded-xl px-5 py-3 flex items-center justify-between border-white/8">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" aria-hidden="true" />
                        <span>{players.length} / {game.max_players || 6} Jugadores</span>
                      </div>
                      {game.status === 'waiting' ? (
                        <Badge variant="warning" className="animate-pulse" role="status">
                          Esperando jugadores...
                        </Badge>
                      ) : (
                        <Badge variant="default" className="animate-pulse bg-panama-blue/20 text-panama-blue border-panama-blue/30" role="status">
                          Partida en curso
                        </Badge>
                      )}
                    </div>

                    {players.length > 0 && (
                      <Card className="glass border-white/8 bg-transparent">
                        <CardContent className="p-5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                            En la partida
                          </p>
                          <div className="space-y-2">
                            {players.map((p: any, i: number) => (
                              <m.div
                                key={p.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-3 p-3 glass rounded-xl min-w-0"
                              >
                                  <div className="shrink-0">
                                    <PlayerIcon icon={p.icon || '🚗'} color={p.color} size="md" isMe={p.user_id === user?.id} />
                                  </div>
                                  <span className="font-semibold text-foreground truncate flex-1 min-w-0">
                                    {p.username}
                                    {p.user_id === user?.id && (
                                      <span className="ml-2 text-xs text-panama-yellow font-bold shrink-0">(Tú)</span>
                                    )}
                                    {game.queue?.[p.user_id] === true && game.status === 'waiting' && (
                                      <span className="ml-2 text-xs text-green-400 font-bold shrink-0">✓ Listo</span>
                                    )}
                                    {p.status === 'afk' && (
                                      <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase">AFK</span>
                                    )}
                                  </span>
                                </m.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {myPlayerEntry && lastActivityAt && secondsLeft <= 60 && game.status === 'waiting' && (
                      <div className="glass rounded-xl px-5 py-3 border-red-500/20 bg-red-500/5 space-y-3">
                        <div className="flex items-center gap-3">
                          <Clock className={`w-4 h-4 ${timerColor}`} />
                          <p className={`text-sm font-semibold ${timerColor}`}>
                            Te expulsarán por inactividad en {secondsLeft}s
                          </p>
                          <div className="ml-auto text-xs bg-red-500/20 rounded-full px-2 py-0.5">
                            {inactivityProgressPercent}%
                          </div>
                        </div>
                        <div
                          className="h-2 rounded-full bg-white/8 overflow-hidden"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={inactivityProgressPercent}
                          aria-label="Progreso hacia expulsión por inactividad"
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 transition-[width] duration-500 ease-out"
                            style={{ width: `${inactivityProgressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {game.status === 'waiting' ? (
                        <>
                          {!myPlayerEntry && !players.some((p: any) => p.user_id === user?.id) && (
                            <RippleButton
                              onClick={handleJoinGame}
                              disabled={loading || players.length >= (game.max_players || 6)}
                              variant="panama-green"
                              size="lg"
                              className="w-full"
                            >
                              <Gamepad2 className="w-5 h-5 mr-1" />
                              {loading ? 'Uniéndose...' : '🚀 Unirse al Juego'}
                            </RippleButton>
                          )}
                          {myPlayerEntry && (
                            <div className="flex gap-2 w-full justify-center">
                               <RippleButton
                                 onClick={handleLeaveGame}
                                 disabled={loading}
                                 variant="destructive"
                                 size="lg"
                                 className="w-full sm:w-1/2 flex items-center justify-center gap-2"
                               >
                                 <LogOut className="w-4 h-4" />
                                 <span>Salir de la Sala</span>
                               </RippleButton>
                               <RippleButton
                                 onClick={handleReady}
                                 disabled={loading}
                                 variant={game.queue?.[user?.id] === true ? "outline" : "panama-green"}
                                 size="lg"
                                 className="w-full sm:w-1/2"
                               >
                                 {game.queue?.[user?.id] === true ? "No estoy listo" : "Estoy Listo"}
                               </RippleButton>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Opciones de partida en curso */
                        !players.some((p: any) => p.user_id === user?.id) && (
                          <RippleButton
                            onClick={handleSpectateGame}
                            disabled={loading}
                            variant="panama"
                            size="lg"
                            className="w-full"
                          >
                            <Eye className="w-5 h-5 mr-1" /> Espectar Partida
                          </RippleButton>
                        )
                      )}
                    </div>

                    <Button
                      onClick={() => router.push('/rules')}
                      variant="glass"
                      size="sm"
                      className="w-full"
                    >
                      <BookOpen className="w-4 h-4" />
                      Ver Reglas del Juego
                    </Button>

                    {game.status === 'waiting' && myPlayerEntry && (
                      <div className="mt-6 w-full flex flex-col items-center" aria-label="Chat de la sala">
                        <div className="w-full overflow-hidden glass rounded-xl border border-white/5 h-[300px]">
                          <div className="h-full w-full">
                            <Chat
                              gameId={normalizeLobbyGameId(game) || normalizedLobbyGameId}
                              playerName={user?.username || 'Participante'}
                              onSendMessage={() => {
                                markLobbyActivity(true);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>

            {leaderboard.length > 0 && !myPlayerEntry && !players.some((p: any) => p.user_id === user?.id) && (
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6"
              >
                <Card className="glass border-white/8 bg-transparent">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                      🏆 Ranking Global
                    </p>
                    <div className="space-y-2">
                      {leaderboard.map((p, i) => (
                        <div key={p.username} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gradient-panama min-w-[20px]">{i + 1}.</span>
                            <span className="text-foreground font-medium">{p.username}</span>
                            {i === 0 && <span className="text-xs">🥇</span>}
                            {i === 1 && <span className="text-xs">🥈</span>}
                            {i === 2 && <span className="text-xs">🥉</span>}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground uppercase leading-none mb-1">Victorias</p>
                              <p className="text-xs font-bold text-white leading-none">{p.games_won || 0}</p>
                            </div>
                            <div className="text-right min-w-[60px]">
                              <p className="text-[10px] text-muted-foreground uppercase leading-none mb-1">Puntos</p>
                              <p className="text-xs font-bold text-panama-yellow leading-none">{p.total_points || 0} pts</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </m.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
