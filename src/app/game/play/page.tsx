'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { supabase } from '@/lib/supabase';
import { Game, Player, Question, GameCard } from '@/types/game';
import Board from '@/components/game/Board';
import Dice from '@/components/game/Dice';
import { Button } from '@/components/ui/button';
import { GAME_CARDS } from '@/data/game-cards';
import PlayersList from '@/components/game/PlayersList';
import { sileo } from 'sileo';
import { m, AnimatePresence } from 'framer-motion';
import { useIdleTimer } from 'react-idle-timer';
import { useAudio } from '@/lib/audio';
import { CELLS } from '@/lib/board-cells';
import { Volume2, VolumeX, LogOut, Clock, CheckCircle2, Sparkles, XCircle, Gamepad2, Flame, Lock, Trophy, Ban, Shield, AlertTriangle } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import ProgressBar from '@/components/game/ProgressBar';
import dynamic from 'next/dynamic';
import { truncateSingleLineWithPretext } from '@/lib/pretext';
import { GAME_TIMING, GAME_TIMING_SECONDS } from '@/lib/game-timing';

// División de código para componentes pesados
const QRScanner = dynamic(() => import('@/components/game/QRScanner'), { ssr: false });
const QuestionModal = dynamic(() => import('@/components/game/QuestionModal'), { ssr: false });
const BattleModal = dynamic(() => import('@/components/game/BattleModal'), { ssr: false });
import type { BattleResult } from '@/components/game/BattleModal';

const AFK_WARNING_BEFORE_IDLE_MS = Math.min(30_000, Math.floor(GAME_TIMING.AFK_TIMEOUT_MS / 2));
const MIN_SILENT_GAME_SYNC_INTERVAL_MS = 1200;
const LEAVE_GAME_CONFIRM_TOAST_ID = 'game-leave-confirm';
const ADMIN_END_GAME_TOAST_ID = 'game-admin-end-confirm';

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

function GameContent() {
  const router = useRouter();
  const { user, authenticatedFetch } = useAuthStore();
  const {
    game, players, myPlayer, isMyTurn, cells,
    setGame, setPlayers, setCells, setMyPlayer, updatePlayerPosition, recalculateIsMyTurn, reset: resetGameState
  } = useGameStore();
  const audio = useAudio();

  // Todos los estados correlacionados al inicio para evitar TDZ (Temporal Dead Zone)
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [expectedPosition, setExpectedPosition] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<GameCard | null>(null);
  const [currentBattle, setCurrentBattle] = useState<BattleResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_TIMING_SECONDS.TURN_TIMEOUT);
  const [isMuted, setIsMuted] = useState(false);
  const [leavingGame, setLeavingGame] = useState(false);
  const [lastDiceResult, setLastDiceResult] = useState<number[] | null>(null);
  const [waitingForNextTurn, setWaitingForNextTurn] = useState(false);
  const [finishSummary, setFinishSummary] = useState<{
    message?: string;
    reason?: string;
    winnerId?: string | null;
    winnerUsername?: string | null;
    countsAsWin?: boolean;
  } | null>(null);
  const [spectateId, setSpectateId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('spectate');
  });

  const isSpectatorSession = Boolean(spectateId);
  const isAdminSpectator = Boolean(user?.is_admin && isSpectatorSession);
  const exitDestination = isAdminSpectator ? '/admin/dashboard' : '/lobby';
  const exitDestinationLabel = isAdminSpectator ? 'panel administrativo' : 'lobby';
  const exitNowLabel = isAdminSpectator ? 'Ir al panel ahora' : 'Ir al Lobby ahora';
  const returnNowLabel = isAdminSpectator ? 'Regresar al panel ahora' : 'Regresar al Lobby ahora';
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myPlayerRef = useRef<Player | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const lastInteractionSyncRef = useRef<number>(0);
  const presenceHeartbeatAtRef = useRef(0);
  const lastDeepSyncRef = useRef(0);
  const afkWarningShownRef = useRef(false);
  // Protección para evitar que handleTimeout se dispare varias veces por turno
  const timeoutFiredRef = useRef(false);
  const processedFinishKeyRef = useRef<string | null>(null);
  // Ref de debounce para loadGameData — se inicializa aquí, el callback se define más abajo
  const loadDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const loadGameDataInFlightRef = useRef(false);
  const loadGameDataQueuedRef = useRef(false);
  const lastSilentLoadAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSpectateIdFromUrl = () => {
      setSpectateId(new URLSearchParams(window.location.search).get('spectate'));
    };

    syncSpectateIdFromUrl();
    window.addEventListener('popstate', syncSpectateIdFromUrl);

    return () => window.removeEventListener('popstate', syncSpectateIdFromUrl);
  }, []);

  // Sincronizar la referencia con el estado
  useEffect(() => {
    myPlayerRef.current = myPlayer;
  }, [myPlayer]);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrated(true), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    audio.preloadSounds();
  }, [audio]);

  useEffect(() => {
    audio.setMuted(isMuted);
    if (!isMuted) {
      audio.playMusic();
    } else {
      audio.stopMusic();
    }
  }, [isMuted, audio]);

  const getFinishReasonLabel = useCallback((reason?: string) => {
    switch (reason) {
      case 'player_timeout':
        return 'Victoria por inactividad del rival';
      case 'player_left':
        return 'Victoria por abandono del rival';
      case 'admin_ban':
        return 'Partida cerrada por moderación';
      case 'admin_kick':
        return 'Partida cerrada por expulsión administrativa';
      case 'winner':
        return 'Victoria por llegada a meta';
      case 'manual':
        return 'Partida finalizada manualmente';
      case 'no_players':
        return 'Partida finalizada sin jugadores activos';
      default:
        return '¡Gracias por jugar Parkeando Edición Universitaria!';
    }
  }, []);

  const announceFinishedGame = useCallback((summary: {
    message?: string;
    reason?: string;
    winnerId?: string | null;
    winnerUsername?: string | null;
    countsAsWin?: boolean;
  }) => {
    // Siempre actualizar el resumen (para el capa) — la deduplicación solo aplica al toast
    setFinishSummary(summary);

    // Forzar status='finished' en el store inmediatamente para mostrar el capa sin esperar loadGameData
    const { game: storeGame } = useGameStore.getState();
    if (storeGame && storeGame.status !== 'finished') {
      useGameStore.getState().updateGameState({ status: 'finished' } as any);
    }

    const finishKey = `${game?.id || spectateId || 'unknown'}:${summary.winnerId || 'none'}:${summary.countsAsWin ? 'win' : 'closed'}`;
    if (processedFinishKeyRef.current === finishKey) return; // Solo dedup el toast
    processedFinishKeyRef.current = finishKey;

    const isLocalWinner = Boolean(summary.countsAsWin && summary.winnerId && summary.winnerId === user?.id);

    if (isLocalWinner) {
      sileo.success({
        title: '¡Ganaste la partida! 🏆',
        description: summary.message || 'Ganaste por quedar como último jugador activo.',
        duration: 12000,
        icon: '🏆',
      });
      audio.playWin();
      return;
    }

    if (summary.countsAsWin && summary.winnerUsername) {
      sileo.success({
        title: 'Partida finalizada',
        description: summary.message || `La partida terminó con victoria para ${summary.winnerUsername}.`,
        duration: 10000,
        icon: '🏆',
      });
      // Play victory sound
      audio.playWin();
      return;
    }

    sileo.info({
      title: 'Partida cerrada',
      description: summary.message || 'La partida terminó sin ganador registrado.',
      duration: 10000,
      icon: '📋',
    });
  }, [audio, game?.id, spectateId, user?.id]);

  const removeSpectatorSeat = useCallback(async (gameId?: string | null) => {
    if (!isSpectatorSession || !gameId) return;

    try {
      await authenticatedFetch('/api/game/spectate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch (error) {
      console.warn('[Spectator] No se pudo limpiar el modo espectador:', error);
    }
  }, [authenticatedFetch, isSpectatorSession]);

  const navigateAwayFromGame = useCallback((path = exitDestination) => {
    sileo.dismiss(LEAVE_GAME_CONFIRM_TOAST_ID);
    audio.stopMusic();
    resetGameState();
    router.replace(path);
  }, [audio, exitDestination, resetGameState, router]);

  const sendLeaveBeacon = useCallback((gameId: string) => {
    const latestAccessToken = getLatestAccessToken();

    const body = JSON.stringify({
      gameId,
      accessToken: latestAccessToken,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/game/leave', new Blob([body], { type: 'application/json' }));
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (latestAccessToken) {
      headers.Authorization = `Bearer ${latestAccessToken}`;
    }

    fetch('/api/game/leave', {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    }).catch(() => {});
  }, []);

  // Enviado cuando la página pasa a estado oculto (cambio de visibilidad / cierre
  // del navegador en móvil). Retrodata last_action_at para que el servidor detecte
  // AFK más rápido sin necesidad de esperar el tiempo agotado completo. Si el jugador
  // regresa, el próximo heartbeat restablece last_action_at al momento actual.
  const sendGoingAwayBeacon = useCallback((gameId: string) => {
    const latestAccessToken = getLatestAccessToken();

    const body = JSON.stringify({
      gameId,
      accessToken: latestAccessToken,
    });

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

  const leaveSpectatorMode = useCallback(async (description?: string) => {
    setLeavingGame(true);
    await removeSpectatorSeat(game?.id || spectateId);
    if (description) {
      sileo.info({
        title: 'Modo espectador cerrado',
        description,
      });
    }
    navigateAwayFromGame();
  }, [game?.id, navigateAwayFromGame, removeSpectatorSeat, spectateId]);

  const leaveCurrentGame = useCallback(() => {
    if (!game?.id) return;

    sileo.dismiss(LEAVE_GAME_CONFIRM_TOAST_ID);

    sileo.action({
      title: 'Salir de la partida',
      description: 'Abandonarás la mesa y perderás tu turno.',
      duration: 30000,
      autopilot: { expand: 1, collapse: 28000 },
      ...({ id: LEAVE_GAME_CONFIRM_TOAST_ID } as any),
      button: {
        title: 'Salir',
        onClick: async () => {
          setLeavingGame(true);
          try {
            await authenticatedFetch('/api/game/leave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ gameId: game.id }),
            });
            setGame(null as any);
            setPlayers([]);
          } catch { }
          finally {
            sileo.dismiss(LEAVE_GAME_CONFIRM_TOAST_ID);
          }
          navigateAwayFromGame('/lobby');
        },
      },
    });
  }, [authenticatedFetch, game?.id, navigateAwayFromGame, setGame, setPlayers]);

  const endGameFromSpectator = useCallback(() => {
    if (!isAdminSpectator || !game?.id) return;

    sileo.dismiss(ADMIN_END_GAME_TOAST_ID);

    sileo.action({
      title: 'Finalizar mesa (Admin)',
      description: 'La partida se cerrará sin contar como victoria.',
      duration: 30000,
      autopilot: { expand: 1, collapse: 28000 },
      ...({ id: ADMIN_END_GAME_TOAST_ID } as any),
      button: {
        title: 'Finalizar',
        onClick: async () => {
          setLeavingGame(true);
          try {
            const response = await authenticatedFetch(`/api/admin/games/${game.id}/end`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'Finalizada por administración desde modo espectador' }),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(payload.error || 'No se pudo finalizar la mesa');
            }

            sileo.success({
              title: payload.message || 'Mesa finalizada',
              description: 'La partida se cerró desde el modo espectador.',
            });
          } catch (error) {
            sileo.error({
              title: 'No se pudo finalizar la mesa',
              description: error instanceof Error ? error.message : 'Error inesperado',
            });
          } finally {
            sileo.dismiss(ADMIN_END_GAME_TOAST_ID);
            setLeavingGame(false);
          }
        },
      },
    });
  }, [authenticatedFetch, game?.id, isAdminSpectator]);

  useEffect(() => {
    return () => {
      sileo.dismiss(LEAVE_GAME_CONFIRM_TOAST_ID);
      if (loadDebounceRef.current) {
        clearTimeout(loadDebounceRef.current);
      }
      audio.stopMusic();
    };
  }, [audio]);


  const loadGameData = useCallback(async (silent = false) => {
    const now = Date.now();

    if (loadGameDataInFlightRef.current) {
      if (silent) {
        loadGameDataQueuedRef.current = true;
      }
      return;
    }

    if (silent && now - lastSilentLoadAtRef.current < MIN_SILENT_GAME_SYNC_INTERVAL_MS) {
      return;
    }

    if (silent) {
      lastSilentLoadAtRef.current = now;
    }

    loadGameDataInFlightRef.current = true;

    try {
      if (!user && !spectateId) return;

      // Usar getState() para evitar dependencia circular de 'game'
      const { game: currentGame } = useGameStore.getState();

      // Mostrar carga solo si no hay datos previos
      if (!silent && !currentGame) setLoading(true);

      // Siempre reinicia el bloqueo viejo de fin de turno para que el nuevo turno pueda tirar de inmediato.
      setWaitingForNextTurn(false);
      setLastDiceResult(null);

      let gameIdToFetch = spectateId || null;
      if (!gameIdToFetch && user) {
        // Priorizar SIEMPRE la partida activa (waiting/in_progress) para evitar
        // cargar una partida vieja finalizada desde estado local obsoleto.
        const { data: activeGame } = await supabase
          .from('games')
          .select('id, game_players!inner(status)')
          .eq('game_players.user_id', user.id)
          .neq('game_players.status', 'inactive')
          .in('status', ['waiting', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeGame) {
          gameIdToFetch = (activeGame as any).id;
        }
      }

      // Solo usar el juego del store como respaldo final (por ejemplo, para mostrar resumen de cierre)
      if (!gameIdToFetch) {
        gameIdToFetch = currentGame?.id ?? null;
      }

      // Si no hay partida activa en DB ni en store, intentar recuperar una partida
      // recién finalizada para poder mostrar el resumen de victoria/cierre.
      if (!gameIdToFetch && user) {
        const recentFinishedThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: recentFinishedGame } = await supabase
          .from('games')
          .select('id, finished_at, game_players!inner(user_id)')
          .eq('game_players.user_id', user.id)
          .eq('status', 'finished')
          .gte('finished_at', recentFinishedThreshold)
          .order('finished_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentFinishedGame) {
          gameIdToFetch = (recentFinishedGame as any).id;
        }
      }

      if (!gameIdToFetch) {
        setLoading(false);
        return;
      }

      const { data: gameData } = await supabase
        .from('games')
        .select('*, game_players(*)')
        .eq('id', gameIdToFetch)
        .single();

      if (gameData) {
        setCells(CELLS);
        const gameObj = gameData as unknown as Game;
        const playersArray = (gameObj.game_players ?? []) as Player[];

        if (isSpectatorSession && gameObj.status === 'waiting') {
          await removeSpectatorSeat(gameObj.id);
          setGame(null as any);
          setPlayers([]);
          setMyPlayer(null);
          sileo.info({
            title: 'La mesa todavía no inicia',
            description: 'Solo puedes espectar partidas que ya comenzaron.',
          });
          navigateAwayFromGame();
          return;
        }

        // ✅ ARREGLO CRÍTICO: define game + jugadores PRIMERO para que isMyTurn se calcule correctamente dentro de setMyPlayer.
        // Antes, setMyPlayer corría con estado obsoleta/vacío del store → isMyTurn siempre daba false.
        setGame(gameObj);
        setPlayers(playersArray);

        const me = playersArray.find(p => p.user_id === user?.id);
        if (me) {
          setMyPlayer(me); // Ahora setMyPlayer lee game + jugadores correctos desde el store

          // Sincronizar posición pendiente
          if ((me as any).pending_position !== null && (me as any).pending_position !== undefined) {
            const pendingPos = (me as any).pending_position;
            setExpectedPosition(pendingPos);
            if (gameObj.current_turn === user?.id) {
              setShowQRScanner(true);
            }
          }

          // Sincronizar tarjeta pendiente
          if ((me as any).pending_card_id !== null && (me as any).pending_card_id !== undefined) {
             const cardId = (me as any).pending_card_id;
             if (gameObj.current_turn === user?.id) {
                const pendingCard = GAME_CARDS.find(c => c.id === cardId);
                if (pendingCard) {
                   setCurrentQuestion(prev => prev?.id === pendingCard.id ? prev : pendingCard);
                }
             }
          }
        } else {
          setMyPlayer(null);
        }

        if (gameObj.status !== 'finished') {
          setFinishSummary(null);
        }

        // Sincronizar timer
        if (gameObj.turn_start_time) {
          const start = new Date(gameObj.turn_start_time).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - start) / 1000);
          setTimeLeft(Math.max(0, GAME_TIMING_SECONDS.TURN_TIMEOUT - elapsed));
        }

        if (gameObj.status === 'finished') {
          // respaldo robusto: si se perdió el tiempo real de game_events, recuperar motivo/ganador desde DB.
          const { data: finishEvent } = await supabase
            .from('game_events')
            .select('event_data')
            .eq('game_id', gameObj.id)
            .eq('event_type', 'game_finished')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const eventData = (finishEvent as any)?.event_data || {};
          const winnerId = eventData.winnerId || eventData.winner || gameObj.winner || null;
          const winnerUsername =
            eventData.winnerUsername ||
            playersArray.find((player) => player.user_id === winnerId || player.id === winnerId)?.username ||
            (winnerId === user?.id ? (user?.username || 'Tú') : null);
          const reason = typeof eventData.reason === 'string' ? eventData.reason : undefined;
          const countsAsWin = Boolean(eventData.countsAsWin ?? winnerId);
          const message =
            (typeof eventData.message === 'string' && eventData.message.trim())
              ? eventData.message
              : (winnerUsername
                ? `La partida terminó con victoria para ${winnerUsername}.`
                : 'La partida finalizó sin un ganador registrado.');

          announceFinishedGame({
            winnerId,
            winnerUsername,
            countsAsWin,
            reason,
            message,
          });
        }
      }
    } catch (error) {
      console.error('Error cargando juego:', error);
    } finally {
      loadGameDataInFlightRef.current = false;
      setLoading(false);

      if (loadGameDataQueuedRef.current) {
        loadGameDataQueuedRef.current = false;
        lastSilentLoadAtRef.current = 0;
        setTimeout(() => {
          void loadGameData(true);
        }, 0);
      }
    }
  }, [announceFinishedGame, setGame, setPlayers, spectateId, user, setMyPlayer, setCells, isSpectatorSession, navigateAwayFromGame, removeSpectatorSeat]);

  const debouncedLoadGameData = useCallback(() => {
    if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
    loadDebounceRef.current = setTimeout(() => loadGameData(true), 1000);
  }, [loadGameData]);

  const sendPresenceHeartbeat = useCallback(async (force = false) => {
    if (!game?.id || game.status !== 'in_progress' || isSpectatorSession || document.hidden) return;

    const now = Date.now();
    if (!force && now - presenceHeartbeatAtRef.current < 5000) return;

    presenceHeartbeatAtRef.current = now;

    try {
      const response = await authenticatedFetch('/api/game/heartbeat', { method: 'POST' });
      if (response.status === 401) {
        // Redirigir/refresco si la sesión murió de verdad
        const auth = useAuthStore.getState();
        await auth.checkAuth();
      }
      
      // AUTO-sincronizar PREVENTIVO: Si es mi turno y ha pasado un minuto, forzar chequeo de base de datos
      // para corregir cualquier desincronización de flags locale (ej. botones trabados)
      if (isMyTurn && now - lastDeepSyncRef.current > 60000) {
        lastDeepSyncRef.current = now;
        loadGameData(true);
      }
    } catch { }
  }, [authenticatedFetch, game?.id, game?.status, isSpectatorSession, isMyTurn, loadGameData]);

  const recordInteraction = useCallback((forceHeartbeat = false) => {
    const now = Date.now();

    if (forceHeartbeat || now - lastInteractionSyncRef.current >= 1000) {
      lastInteractionRef.current = now;
      lastInteractionSyncRef.current = now;
    }

    if (!isSpectatorSession && game?.status === 'in_progress' && !document.hidden) {
      void sendPresenceHeartbeat(forceHeartbeat);
    }
  }, [game?.status, isSpectatorSession, sendPresenceHeartbeat]);

  const showAfkRecoveredToast = useCallback(() => {
    if (!afkWarningShownRef.current) return;

    afkWarningShownRef.current = false;

    if (!game || game.status !== 'in_progress' || !isMyTurn || isSpectatorSession) return;

    sileo.success({
      title: 'Perfecto, seguimos en turno',
      description: 'Detectamos actividad nuevamente. Ya no estás en riesgo de AFK.',
      duration: 3500,
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
    });
  }, [game, isMyTurn, isSpectatorSession]);

  const showAfkPrompt = useCallback(() => {
    if (!game || game.status !== 'in_progress' || !isMyTurn || isSpectatorSession) return;
    if (afkWarningShownRef.current) return;

    afkWarningShownRef.current = true;

    sileo.warning({
      title: 'Te toca jugar 👀',
      description: `Si no interactúas en ${Math.ceil(AFK_WARNING_BEFORE_IDLE_MS / 1000)} segundos, perderás por inactividad.`,
      duration: 7000,
      icon: <Clock className="w-4 h-4 text-amber-400" />,
    });
  }, [game, isMyTurn, isSpectatorSession]);

  const handleAfkIdle = useCallback(async () => {
    afkWarningShownRef.current = false;
    if (!game || game.status !== 'in_progress' || !isMyTurn || isSpectatorSession) return;

    const afkTimeoutMinutes = GAME_TIMING.AFK_TIMEOUT_MS / 60000;

    try {
      const response = await authenticatedFetch('/api/game/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'afk' }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return;
      }

      if (payload?.skippedByPenalty) {
        sileo.info({
          title: 'Turno penalizado consumido',
          description: payload?.remainingSkips > 0
            ? `Te quedan ${payload.remainingSkips} turnos de penalización.`
            : 'Se consumió tu penalización pendiente.',
          duration: 4500,
        });
        void loadGameData(true);
        return;
      }

      sileo.error({
        title: 'Expulsado por inactividad',
        description: `No has interactuado con la página en ${afkTimeoutMinutes} minutos.`,
        duration: null,
      });
      setTimeout(() => router.replace('/lobby'), 4000);
    } catch {
      // Si falla la red, el hook volverá a notificar idle y se reintentará.
    }
  }, [authenticatedFetch, game, isMyTurn, isSpectatorSession, loadGameData, router]);

  const handleCameraPermissionDenied = useCallback(async () => {
    const cameraRequiredMessage = 'Lo siento, se necesita el permiso de la cámara para poder jugar a Parkeando.';
    setShowQRScanner(false);

    if (!game || game.status !== 'in_progress' || isSpectatorSession) {
      sileo.error({
        title: 'Cámara requerida para jugar',
        description: cameraRequiredMessage,
        duration: 7000,
        icon: '📷',
      });
      setTimeout(() => router.replace('/lobby'), 2600);
      return;
    }

    let shouldLeaveLobby = false;
    try {
      const response = await authenticatedFetch('/api/game/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'camera_permission_denied' }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo procesar la expulsión por cámara.');
      }

      const removed = Boolean(payload?.removed);
      const attempt = Number(payload?.attempt ?? 1);

      if (removed) {
        shouldLeaveLobby = true;
        sileo.error({
          title: 'Cámara requerida para jugar',
          description: cameraRequiredMessage,
          duration: 7000,
          icon: '📷',
        });
      } else {
        sileo.warning({
          title: `Permiso de cámara rechazado (${attempt}/2)`,
          description: 'Se saltó tu turno. Si lo rechazas otra vez serás expulsado.',
          duration: 6000,
          icon: '📷',
        });
        void loadGameData(true);
      }
    } catch {
      // respaldo: si el tiempo agotado no aplica (por carrera de turno), abandonar partida explícitamente.
      await authenticatedFetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      }).catch(() => null);

      shouldLeaveLobby = true;

      sileo.error({
        title: 'No se puede continuar sin cámara',
        description: cameraRequiredMessage,
        duration: 7000,
        icon: '📷',
      });
    } finally {
      if (!shouldLeaveLobby) {
        void loadGameData(true);
      } else {
        setTimeout(() => router.replace('/lobby'), 2600);
      }
    }
  }, [authenticatedFetch, game, isSpectatorSession, loadGameData, router]);

  useIdleTimer({
    timeout: GAME_TIMING.AFK_TIMEOUT_MS,
    promptBeforeIdle: AFK_WARNING_BEFORE_IDLE_MS,
    onPrompt: () => {
      showAfkPrompt();
    },
    onAction: () => {
      recordInteraction();
      showAfkRecoveredToast();
    },
    onActive: () => {
      recordInteraction(true);
      showAfkRecoveredToast();
    },
    onIdle: () => {
      void handleAfkIdle();
    },
    debounce: 500,
  });

  useEffect(() => {
    if (isMyTurn && game?.status === 'in_progress' && !isSpectatorSession) return;
    afkWarningShownRef.current = false;
  }, [game?.status, isMyTurn, isSpectatorSession]);

  // Carga inicial
  useEffect(() => {
    if (!isHydrated) return;
    if (!user && !spectateId) {
      navigateAwayFromGame('/auth/login');
      return;
    }
    loadGameData();
  }, [isHydrated, user, spectateId, loadGameData, navigateAwayFromGame]);

  // Suscripciones en tiempo real
  useEffect(() => {
    if (!isHydrated || !game?.id) return;

    console.log(`[Game] Suscribiendo a partida: ${game.id}`);

    const channel = supabase
      .channel(`game-${game.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${game.id}`
      }, (payload) => {
        // Verificación optimista: si es actualiza o INSERT, usa el payload de inmediato
        if (payload.new && Object.keys(payload.new).length > 0) {
          const updatedPlayer = payload.new as any;
          useGameStore.getState().updateSinglePlayer(updatedPlayer);
          
          // --- AUTO-sincronizar: Si mi jugador tiene una acción pendiente, abrir UI automáticamente ---
          if (updatedPlayer.user_id === user?.id) {
            if (updatedPlayer.pending_position) {
              setExpectedPosition(updatedPlayer.pending_position);
              // Solo abrir si es el turno actual (evitar UI ghost de turnos anteriores)
              if (game?.current_turn === user?.id) {
                setShowQRScanner(true);
              }
            }
            if (updatedPlayer.pending_card_id) {
              const pendingCard = GAME_CARDS.find(c => c.id === updatedPlayer.pending_card_id);
              if (pendingCard && game?.current_turn === user?.id) {
                setCurrentQuestion(pendingCard);
              }
            }
          }

          // --- DETECCIÓN PROACTIVA: Si un jugador cambió a inactive/disconnected, verificar si soy el último ---
          if (
            updatedPlayer.user_id !== user?.id &&
            (updatedPlayer.status === 'inactive' || updatedPlayer.status === 'disconnected')
          ) {
            const { players: storePlayers } = useGameStore.getState();
            const activePlayers = storePlayers.filter(p =>
              p.status === 'active' && p.id !== updatedPlayer.id
            );
            const meStillActive = activePlayers.some(p => p.user_id === user?.id);

            if (meStillActive && activePlayers.length <= 1) {
              // Soy el último jugador activo — forzar resync inmediato para detectar fin de partida
              console.log('[Game] Último jugador activo detectado — forzando resync');
              debouncedLoadGameData();
            } else {
              // Un jugador se fue pero aún quedan otros — resync para actualizar UI
              debouncedLoadGameData();
            }
          }
        } else {
          // Respaldo para DELETE o casos raros — resincronización inmediata
          debouncedLoadGameData();
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${game.id}`
      }, (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          useGameStore.getState().updateGameState(payload.new as any);

          if ((payload.new as any).status === 'finished') {
            // La partida terminó: actualizar datos completos (ganador, jugadores finales)
            loadGameData(true);
          }
        } else {
          debouncedLoadGameData();
        }
      })
      .subscribe();

    const eventsChannel = supabase
      .channel(`game_events:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `game_id=eq.${game.id}`,
        },
        async (payload) => {
          const event = payload.new;
          // Usar ref para evitar dependencia circular
          const isFromMe = event.player_id === myPlayerRef.current?.id;

          if (event.event_type === 'player_removed_by_admin') {
            const removalMessage = event.event_data?.message || 'Se aplicó una moderación administrativa en la partida.';
            const removedUserId = event.event_data?.removedUserId;

            if (removedUserId === user?.id) {
              sileo.error({
                title: 'Has sido retirado de la partida',
                description: removalMessage,
                duration: 8000,
                icon: <Ban className="w-4 h-4 text-rose-400" />,
              });
              setTimeout(() => { navigateAwayFromGame('/lobby'); }, 2500);
            } else {
              sileo.warning({
                title: 'Moderación aplicada',
                description: removalMessage,
                duration: 7000,
                icon: <Ban className="w-4 h-4 text-amber-400" />,
              });
            }

            loadGameData(true);
            return;
          }

          if (event.event_type === 'game_finished') {
            const winnerId = event.event_data?.winnerId || event.event_data?.winner;
            const winnerName =
              event.event_data?.winnerUsername ||
              players.find(p => p.user_id === winnerId || p.id === winnerId)?.username ||
              null;
            const summary = {
              message: event.event_data?.message || (winnerName ? `La partida terminó con victoria para ${winnerName}.` : 'La partida finalizó sin ganador.'),
              reason: event.event_data?.reason,
              winnerId: winnerId ?? null,
              winnerUsername: winnerName,
              countsAsWin: Boolean(event.event_data?.countsAsWin ?? winnerId),
            };

            // Forzar status='finished' en el store ANTES de loadGameData para que el capa
            // aparezca inmediatamente sin esperar el round-trip a Supabase
            useGameStore.getState().updateGameState({ status: 'finished' } as any);
            announceFinishedGame(summary);
            loadGameData(true); // Actualiza detalles completos (ganador, jugadores)
            return;
          }

          // --- Manejar abandono de jugador en tiempo real ---
          if (event.event_type === 'player_left') {
            const leftUsername = event.event_data?.username || 'Un jugador';
            if (event.event_data?.userId !== user?.id) {
              sileo.warning({
                title: `${leftUsername} abandonó la partida`,
                description: 'Verificando estado de la mesa…',
                duration: 5000,
                icon: '🚪',
              });
            }
            // Resync inmediato — el servidor puede haber terminado la partida
            debouncedLoadGameData();
            return;
          }

          // --- Manejar evento queue_inactive_kick en tiempo real ---
          if (event.event_type === 'queue_inactive_kick') {
            const kickedUsername = event.event_data?.username || 'Un jugador';
            if (event.event_data?.userId !== user?.id) {
              sileo.info({
                title: `${kickedUsername} fue removido por inactividad`,
                duration: 4000,
                icon: '⏰',
              });
            }
            debouncedLoadGameData();
            return;
          }

          if (!isFromMe && event.event_data?.message) {
            sileo.show({
              title: event.event_data.message,
              icon: (event.event_type === 'player_timeout' || event.event_type === 'turn_timeout') ? <Clock className="w-4 h-4 text-amber-500" /> :
                event.event_type === 'qr_scanned' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                  event.event_type === 'question_answered' ? (event.event_data.is_correct ? <Sparkles className="w-4 h-4 text-yellow-500" /> : <XCircle className="w-4 h-4 text-red-500" />) : <Gamepad2 className="w-4 h-4 text-blue-500" />,
            });

            if (event.event_type === 'position_changed' && event.event_data.type === 'dice_roll') {
              audio.playDiceRoll?.();
            }
            if (event.event_type === 'cell_effect') {
              if (event.event_data?.effect === 'carcel') audio.playJail?.();
              if (event.event_data?.bonusPoints && event.event_data.bonusPoints > 0) audio.playMoneyPlus?.();
            }
            if (event.event_type === 'question_answered') {
              if (event.event_data?.is_correct) audio.playMoneyPlus?.();
              else audio.playMoneyMinus?.();
            }
          }

          // --- Manejar expulsión en tiempo real ---
          if (
            event.event_type === 'player_timeout' &&
            (
              event.player_id === myPlayerRef.current?.id ||
              event.event_data?.timedOutUserId === user?.id ||
              event.event_data?.userId === user?.id
            )
          ) {
            const cameraDenied = event.event_data?.reason === 'camera_permission_denied';
            const repeatedAfkPattern = event.event_data?.reason === 'turn_timeout_pattern';
            const cameraDeniedAttempt = Number(event.event_data?.attempt ?? 2);

            if (cameraDenied && cameraDeniedAttempt < 2) {
              sileo.warning({
                title: `Permiso de cámara rechazado (${cameraDeniedAttempt}/2)`,
                description: 'Se saltó tu turno. Si lo rechazas otra vez serás expulsado.',
                duration: 5000,
                icon: '📷',
              });
              debouncedLoadGameData();
              return;
            }

            sileo.error({
              title: cameraDenied
                ? 'Cámara requerida para jugar'
                : repeatedAfkPattern
                  ? 'Expulsado por inactividad repetida'
                  : 'Has sido expulsado por inactividad',
              description: cameraDenied
                ? 'Lo siento, se necesita el permiso de la cámara para poder jugar a Parkeando.'
                : repeatedAfkPattern
                  ? 'Pasaste 2 turnos seguidos sin completar tu jugada. El sistema te marcó como AFK.'
                : undefined,
              duration: 7000,
              icon: cameraDenied ? '📷' : '🚪'
            });
            setShowQRScanner(false);
            setTimeout(() => { navigateAwayFromGame('/lobby'); }, 3000);
          }
          debouncedLoadGameData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(eventsChannel);
    };
  }, [announceFinishedGame, game?.id, loadGameData, debouncedLoadGameData, recalculateIsMyTurn, audio, isHydrated, navigateAwayFromGame]);

  // Mantener presencia viva solo cuando la pestaña está visible y abandonar limpio al cerrarla
  useEffect(() => {
    if (!game?.id || game.status !== 'in_progress' || isSpectatorSession) return;

    const handleVisiblePresence = () => {
      if (document.hidden) return;
      recordInteraction(true);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleVisiblePresence();
      } else if (game?.id && game.status === 'in_progress') {
        // La página pasó a estado oculto (móvil: navegador minimizado o cerrado).
        // Retrodatamos last_action_at para que el servidor detecte AFK más rápido.
        sendGoingAwayBeacon(game.id);
      }
    };

    const handleUnload = () => {
      if (!game?.id || game.status !== 'in_progress') return;
      sendLeaveBeacon(game.id);
    };

    const heartbeatInterval = window.setInterval(() => {
      if (!document.hidden) {
        void sendPresenceHeartbeat();
      }
    }, 20000);

    handleVisiblePresence();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener('focus', handleVisiblePresence);
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener('focus', handleVisiblePresence);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [game?.id, game?.status, isSpectatorSession, recordInteraction, sendGoingAwayBeacon, sendLeaveBeacon, sendPresenceHeartbeat]);

  const handleTimeout = useCallback(async (wasMyTurn: boolean) => {
    // Disparar solo una vez por turno mientras la petición está en curso.
    if (timeoutFiredRef.current) return;
    timeoutFiredRef.current = true;

    setTimeLeft(0);
    setShowQRScanner(false);

    try {
      const response = await authenticatedFetch('/api/game/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'turn' }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // Importante: liberar el latch para que otro cliente/intervalo pueda reintentar.
        timeoutFiredRef.current = false;
        return;
      }

      const noActiveGame = payload?.success === false && payload?.message === 'No hay partida activa';
      const alreadyProcessedByAnother = typeof payload?.message === 'string'
        && payload.message.toLowerCase().includes('procesado por otro cliente');

      if (noActiveGame || alreadyProcessedByAnother) {
        timeoutFiredRef.current = false;
        await loadGameData(true);
        return;
      }

      if (payload?.skippedByPenalty) {
        await loadGameData(true);
        sileo.info({
          title: 'Turno saltado por penalización',
          description: payload?.remainingSkips > 0
            ? `Aún tienes ${payload.remainingSkips} turnos de penalización.`
            : 'Se consumió la penalización pendiente.',
        });
        return;
      }

      // Forzar resincronización tras procesar tiempo agotado para no depender al 100% del tiempo real.
      await loadGameData(true);

      if (wasMyTurn) {
        sileo.error({ title: '¡Se acabó tu tiempo de turno!', description: 'Tu turno fue saltado automáticamente.' });
      } else {
        sileo.info({
          title: 'Se agotó el tiempo',
          description: payload?.message || 'El turno del rival fue saltado automáticamente.',
        });
      }
    } catch {
      // Network/transient failure: permitir retry on next tick.
      timeoutFiredRef.current = false;
    }
  }, [authenticatedFetch, loadGameData]);

  const calculateTimeLeft = useCallback(() => {
    if (!game || game.status !== 'in_progress') return GAME_TIMING_SECONDS.TURN_TIMEOUT;
    const turnStart = game.turn_start_time ? new Date(game.turn_start_time).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - turnStart) / 1000);
    return GAME_TIMING_SECONDS.TURN_TIMEOUT - elapsed;
  }, [game?.turn_start_time, game?.status]);

  // Temporizador de turno sincronizado con turn_start_time del servidor
  useEffect(() => {
    if (!game || game.status !== 'in_progress') {
      // Resetear el timer cuando la partida no esta activa (evita que quede en 0s)
      setTimeLeft(GAME_TIMING_SECONDS.TURN_TIMEOUT);
      return;
    }

    // Reiniciar la protección de tiempo agotado cada vez que cambia el turno
    timeoutFiredRef.current = false;

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const current = calculateTimeLeft();
      setTimeLeft(Math.max(0, current));

    // Efectos secundarios manejados FUERA del actualizador de setTimeLeft para evitar advertencias de React
      // Caso 1: Soy yo y se me acabó el tiempo (Inmediato)
      // No disparar tiempo agotado si el jugador está respondiendo una tarjeta o escaneando QR.
      if (current <= 0 && isMyTurn && !timeoutFiredRef.current && !currentQuestion && !showQRScanner) {
        handleTimeout(true);
      }

      // Caso 2: No soy yo y el turno rival ya venció; proceso avance para evitar que se congele la partida.
      if (current <= -GAME_TIMING.OPPONENT_FORCE_TIMEOUT_BUFFER_SECONDS && !isMyTurn && Boolean(myPlayer) && !timeoutFiredRef.current) {
        handleTimeout(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [game, myPlayer, isMyTurn, handleTimeout, calculateTimeLeft, currentQuestion, showQRScanner]);

  // Cerrar automáticamente el escáner QR cuando ya no sea nuestro turno (ej. otro jugador quedó en tiempo agotado)
  useEffect(() => {
    if (!isMyTurn && showQRScanner) {
      setShowQRScanner(false);
      sileo.show({ title: 'Turno cambiado', description: 'El escáner QR se cerró automáticamente' });
    }
  }, [isMyTurn, showQRScanner]);

  // Red de seguridad para caídas móviles/tiempo real: refrescar estado de juego mientras se espera a otro jugador.
  // ADAPTATIVO: sondeo más agresivo (3s) cuando el temporizador del oponente expiró.
  useEffect(() => {
    if (!game || game.status !== 'in_progress' || isMyTurn) return;
    const opponentTimerExpired = timeLeft <= 0;
    const intervalMs = opponentTimerExpired ? 3000 : 10000;
    const syncInterval = setInterval(() => {
      void loadGameData(true);
    }, intervalMs);
    return () => clearInterval(syncInterval);
  }, [game?.id, game?.status, isMyTurn, loadGameData, timeLeft]);

  // RESPALDO ROBUSTO: verificar periódicamente si la partida terminó.
  // Esto evita que el jugador tenga que refrescar si se pierde un evento tiempo real.
  useEffect(() => {
    if (!game || game.status !== 'in_progress' || isSpectatorSession) return;

    const checkIntervalMs = isMyTurn ? 10000 : 6000;

    let cancelled = false;
    const checkGameStatus = async () => {
      if (document.hidden) return;

      try {
        const response = await authenticatedFetch('/api/game/check', { method: 'GET' });
        if (!response.ok || cancelled) return;
        if (cancelled) return;
        const data = await response.json();

        if (!data.active && data.reason === 'finished' && data.finishData) {
          const fd = data.finishData;
          const { players: storePlayers } = useGameStore.getState();
          const winnerName = fd.winnerUsername ||
            storePlayers.find((p: any) => p.user_id === fd.winnerId || p.id === fd.winnerId)?.username ||
            null;

          useGameStore.getState().updateGameState({ status: 'finished' } as any);
          announceFinishedGame({
            winnerId: fd.winnerId,
            winnerUsername: winnerName,
            countsAsWin: fd.countsAsWin,
            reason: fd.reason,
            message: fd.message || (winnerName ? `La partida terminó con victoria para ${winnerName}.` : 'La partida finalizó.'),
          });
          await loadGameData(true);
          return;
        }

        // Si el endpoint reporta que ya no hay partida activa, resincroniza para
        // recuperar posible cierre reciente sin requerir refresco manual.
        if (!data.active) {
          await loadGameData(true);
        }
      } catch {
        // Network error — ignorar, se reintenta en el siguiente tick
      }
    };

    // Primer chequeo inmediato y luego respaldo moderado para bajar carga en BD.
    checkGameStatus();
    const checkInterval = setInterval(checkGameStatus, checkIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(checkInterval);
    };
  }, [game?.id, game?.status, isSpectatorSession, isMyTurn, authenticatedFetch, announceFinishedGame, loadGameData]);

  // Redirección automática al lobby cuando termina la partida (después de mostrar resumen)
  useEffect(() => {
    if (game?.status === 'finished' && finishSummary) {
      setShowQRScanner(false);
      setCurrentQuestion(null);
      setCurrentBattle(null);

      // Los espectadores deben salir rápido cuando termina la partida.
      const isLocalWinner = Boolean(finishSummary.winnerId && finishSummary.winnerId === user?.id);
      const redirectDelayMs = isSpectatorSession ? 1200 : (isLocalWinner ? 9000 : 6000);
      
      const t = setTimeout(() => {
        void removeSpectatorSeat(game.id).finally(() => navigateAwayFromGame());
      }, redirectDelayMs);
      return () => clearTimeout(t);
    }
  }, [finishSummary, game?.id, game?.status, isSpectatorSession, navigateAwayFromGame, removeSpectatorSeat, user?.id]);

  const handleRoll = useCallback(async (_value: number) => {
    // Verificación de seguridad: al intentar tirar, asegurar que el bloqueo de fin de turno esté limpio
    setWaitingForNextTurn(false);
    setLastDiceResult(null);

    try {
      const response = await authenticatedFetch('/api/game/roll', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Error al lanzar dado');

      setLastDiceResult(data.diceDetails ?? null);

      if (data.stayedInJail) {
        sileo.error({ title: data.message || 'Sigues en la cárcel. Necesitabas 3 y 5.' });
        setWaitingForNextTurn(true);
        return;
      }

      setExpectedPosition(data.finalPosition);

      if (data.battle) {
        setCurrentBattle(data.battle);
      }

      if (data.diceDetails && data.diceDetails[0] === data.diceDetails[1]) {
        sileo.success({ 
          title: `¡DOBLES! (${data.diceDetails[0]} y ${data.diceDetails[1]}) - Avanzas 14 casillas`,
          duration: 4000
        });
      } else {
        sileo.success({ title: `¡Avanza a la casilla ${data.finalPosition}!` });
      }

      if (data.tripleDoublesPenalty) {
        sileo.show({
          title: data.tripleDoublesMessage || 'Sacaste dobles 3 veces consecutivas. Pierdes tu próximo turno.',
          icon: '⚠️',
          duration: 5500,
        });
      }

      setShowQRScanner(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al lanzar dado';
      const normalizedMsg = msg.toLowerCase();

      if (normalizedMsg.includes('no hay partida activa') || normalizedMsg.includes('finaliz')) {
        sileo.info({ title: 'Sincronizando resultado final…' });
        void loadGameData(true);
        return;
      }

      sileo.error({ title: msg });
      
      // AUTO-RECOVERY: Si el servidor dado que ya lanzamos (pero el cliente no lo sabía),
      // forzar una resincronización para que aparezca el escáner QR.
      if (normalizedMsg.includes('lanzado') || normalizedMsg.includes('already') || normalizedMsg.includes('turno')) {
        void loadGameData(true);
      }
    }
  }, [authenticatedFetch, loadGameData]);

  // Efecto para reiniciar estado de espera cuando cambia el turno
  useEffect(() => {
    // Reiniciar cualquier estado que pueda bloquear un turno cuando el turno actual cambia oficialmente
    // incluso si se mantiene el mismo jugador (dobles turnos/saltos)
    setWaitingForNextTurn(false);
    setLastDiceResult(null);
  }, [game?.current_turn]);

  const handleQRScan = useCallback(async (rawQRValue: string): Promise<boolean> => {
    try {
      const response = await authenticatedFetch('/api/game/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: rawQRValue, expected_position: expectedPosition }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'QR inválido');
      }

      setShowQRScanner(false);
      setExpectedPosition(0);
      
      // Optimistic actualiza: clear pending_position en store inmediatamente
      if (myPlayer) {
        useGameStore.getState().updateSinglePlayer({
          id: myPlayer.id,
          pending_position: null,
          pending_card_id: null
        } as any);
      }

      audio.playCard?.();
      
      if (data.effect?.bonusPoints && data.effect.bonusPoints > 0) {
        audio.playMoneyPlus?.();
      }
      if (data.effect?.type === 'carcel') {
        audio.playJail?.();
      }
      if (data.card?.type === 'premio') {
        audio.playBuy?.();
      }

      // Actualizar a la posición FINAL calculada por el servidor (incluyendo teleports/batallas)
      if (myPlayer && data.position !== undefined) {
        updatePlayerPosition(myPlayer.id, data.position);
      }

      // Mostrar efectos especiales
      if (data.effect?.message) {
        sileo.show({ title: data.effect.message, icon: '✨', duration: 4000 });
      }

      if (data.battle?.message) {
        sileo.show({ title: data.battle.message, icon: '⚔️', duration: 5000 });
      }

      if (data.card || data.question) {
        setCurrentQuestion(data.card || data.question);
      } else if (data.isWinner) {
        sileo.success({ title: '¡HAS GANADO LA PARTIDA! 🏆', duration: 10000 });
      } else {
        sileo.success({ title: '¡Casilla confirmada!' });
      }

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al procesar QR';
      const normalizedMsg = errorMsg.toLowerCase();

      if (normalizedMsg.includes('no hay partida activa') || normalizedMsg.includes('finaliz')) {
        sileo.info({
          title: 'Sincronizando resultado final…',
          duration: 3000,
        });
        void loadGameData(true);
        return false;
      }
      
      // Mostrar el error exacto que viene del servidor (ej. "Este QR es de la casilla X, pero debes...")
      if (normalizedMsg.includes('inconsistencia')) {
        sileo.error({ 
          title: '¡Sincronización requerida!', 
          description: errorMsg + `. Si estás en la casilla correcta, intenta el botón de 'Resincronizar' en Ajustes.`,
          duration: 8000,
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />
        });
        // Auto-refrescar datos ante desajuste para asegurar la información más reciente de BD
        void loadGameData(true);
      } else {
        sileo.error({ 
          title: 'Error de QR', 
          description: errorMsg,
          duration: 5000,
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />
        });
      }

      return false;
    }
  }, [authenticatedFetch, expectedPosition, audio, myPlayer, updatePlayerPosition]);

  const handleAnswer = useCallback(async (answer: number, cardId?: string) => {
    try {
      const response = await authenticatedFetch('/api/game/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId ?? (currentQuestion as GameCard | null)?.id, answer }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'No se pudo responder la tarjeta');
      }
      
      if (data.is_correct) {
        audio.playMoneyPlus?.();
      } else {
        audio.playMoneyMinus?.();
      }

      setCurrentQuestion(null);
      setCurrentBattle(null);
      setExpectedPosition(0);
      setShowQRScanner(false);

      // Optimistic actualiza: clear pending_card_id en store
      if (myPlayer) {
        useGameStore.getState().updateSinglePlayer({
          id: myPlayer.id,
          pending_card_id: null
        } as any);
      }
      
      if (!data.extraTurn) {
        setWaitingForNextTurn(true);
        sileo.info({ title: "Turno finalizado. Esperando..." });
      } else {
        sileo.success({ title: "¡Tienes otro turno! Vuelve a tirar el dado.", duration: 5000 });
      }

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'No se pudo responder la tarjeta';
      const normalizedMsg = errorMsg.toLowerCase();

      if (normalizedMsg.includes('no hay partida activa') || normalizedMsg.includes('finaliz')) {
        sileo.info({ title: 'Sincronizando resultado final…', duration: 3000 });
        void loadGameData(true);
      } else {
        sileo.error({ title: errorMsg });
      }
      return { is_correct: false, points_earned: 0 };
    }
  }, [authenticatedFetch, currentQuestion, audio, myPlayer, loadGameData]);

  const handleCardComplete = useCallback(async (completed: boolean, cardId?: string) => {
    try {
      const response = await authenticatedFetch('/api/game/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId ?? (currentQuestion as GameCard | null)?.id, completed }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'No se pudo completar la tarjeta');
      }
      
      if (data.is_correct || data.success) {
        audio.playMoneyPlus?.();
      } else {
        audio.playMoneyMinus?.();
      }

      setCurrentQuestion(null);
      setCurrentBattle(null);
      setExpectedPosition(0);
      setShowQRScanner(false);
      
      // Optimistic actualiza: clear pending_card_id en store
      if (myPlayer) {
        useGameStore.getState().updateSinglePlayer({
          id: myPlayer.id,
          pending_card_id: null
        } as any);
      }
      
      if (!data.extraTurn) {
        setWaitingForNextTurn(true);
        sileo.info({ title: "Turno finalizado. Esperando..." });
      } else {
        sileo.success({ title: "¡Tienes otro turno! Vuelve a tirar el dado.", duration: 5000 });
      }

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'No se pudo completar la tarjeta';
      const normalizedMsg = errorMsg.toLowerCase();

      if (normalizedMsg.includes('no hay partida activa') || normalizedMsg.includes('finaliz')) {
        sileo.info({ title: 'Sincronizando resultado final…', duration: 3000 });
        void loadGameData(true);
      } else {
        sileo.error({ title: errorMsg });
      }
      return { success: false };
    }
  }, [authenticatedFetch, currentQuestion, audio, myPlayer, loadGameData]);

  // ── renderiza ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-panama-blue" />
          <p className="text-gray-500">Cargando partida...</p>
        </div>
      </div>
    );
  }

  if (!game || (!myPlayer && (!user || !game.spectators?.includes(user?.id || '')))) {
    if (finishSummary) {
      setTimeout(() => navigateAwayFromGame(), 4000);
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-lg w-full glass rounded-3xl border border-white/10 p-6 md:p-8">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl md:text-3xl font-black mb-2 text-white">¡Partida Finalizada!</h2>
            <p className="text-muted-foreground mb-2">{getFinishReasonLabel(finishSummary.reason)}</p>
            <p className="text-slate-200 wrap-break-word mb-5">
              {finishSummary.message || 'La partida terminó. Redirigiendo...'}
            </p>
            <button
              onClick={() => navigateAwayFromGame()}
              className="px-6 py-3 bg-panama-yellow text-black rounded-lg font-bold"
            >
              {returnNowLabel}
            </button>
          </div>
        </div>
      );
    }

    // Auto-redirect to lobby después 2 seconds
    setTimeout(() => navigateAwayFromGame(), 2000);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-2">No hay partida activa</h2>
          <p className="text-muted-foreground mb-4">Regresando al {exitDestinationLabel}...</p>
          <button onClick={() => navigateAwayFromGame()}
            className="px-6 py-3 bg-panama-blue text-white rounded-lg">
            {exitNowLabel}
          </button>
        </div>
      </div>
    );
  }

  // Derivar currentPlayerId desde jugadores actualizado + game.current_turn
  // (evita un join anidado obsoleta de game_players en el objeto game)
  const currentPlayerId = players.find(p => p.user_id === (game?.current_turn ?? ''))?.id
    ?? players[game?.current_player_index ?? 0]?.id
    ?? '';

  const currentTurnPlayer = players.find(p => p.user_id === (game?.current_turn ?? ''));
  const currentTurnUsername = currentTurnPlayer?.username || '';

  const mobileTurnLabel = !currentTurnUsername
    ? '...'
    : truncateSingleLineWithPretext(currentTurnUsername, {
      font: '700 12px ui-sans-serif, system-ui, sans-serif',
      maxWidth: 112,
      lineHeight: 16,
    });

  const waitingTurnLabel = !currentTurnUsername
    ? 'otro jugador'
    : truncateSingleLineWithPretext(currentTurnUsername, {
      font: '700 14px ui-sans-serif, system-ui, sans-serif',
      maxWidth: 180,
      lineHeight: 20,
    });

  const winnerUserId = finishSummary?.winnerId || game?.winner || null;
  const winnerName =
    finishSummary?.winnerUsername ||
    players.find(p => p.user_id === winnerUserId || p.id === winnerUserId)?.username ||
    null;
  const winnerColor = players.find(p => p.user_id === winnerUserId || p.id === winnerUserId)?.color || '#FCD116';
  const showWinner = Boolean(finishSummary?.countsAsWin && winnerName);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-20 md:pb-4">
      {/* Capa de fin de partida */}
      <AnimatePresence>
        {game?.status === 'finished' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-hidden"
          >
            {/* Animated Confetti fondo */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(60)].map((_, i) => (
                <m.div
                  key={i}
                  initial={{ 
                    top: "-10%", 
                    left: `${Math.random() * 100}%`,
                    rotate: 0,
                    scale: 0.5 + Math.random()
                  }}
                  animate={{ 
                    top: "110%",
                    left: `${(Math.random() * 100) + (Math.random() * 20 - 10)}%`,
                    rotate: 360 + Math.random() * 720,
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 4,
                    repeat: Infinity,
                    ease: "linear",
                    delay: Math.random() * 5
                  }}
                  className="absolute w-2 h-2 md:w-3 md:h-3 rounded-full md:rounded-sm"
                  style={{ 
                    backgroundColor: [
                      '#DA291C', // Panama Red
                      '#005293', // Panama Blue
                      '#FCD116', // Panama Yellow
                      '#FFFFFF', // White
                      '#009739', // Green
                    ][Math.floor(Math.random() * 5)]
                  }}
                />
              ))}
            </div>

            <m.div
              initial={{ scale: 0.8, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className="glass p-8 md:p-14 rounded-[40px] border-b-8 border-r-8 border-panama-yellow/30 max-w-lg w-full relative z-10"
            >
              {/* Decorative side accents */}
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-panama-yellow/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-panama-blue/20 rounded-full blur-3xl" />

              <m.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="relative inline-block mb-8"
              >
                <div className="absolute inset-0 bg-panama-yellow blur-2xl opacity-30 animate-pulse" />
                <Trophy className="w-20 h-20 text-panama-yellow mx-auto relative drop-shadow-[0_0_15px_rgba(252,209,22,0.5)]" />
              </m.div>

              <h1 className="text-4xl md:text-5xl font-black text-gradient-panama mb-3 tracking-tighter">
                {showWinner ? '¡VICTORIA TOTAL!' : 'PARTIDA CERRADA'}
              </h1>

              <div className="space-y-4 mb-10">
                {showWinner && (
                  <m.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center gap-3 bg-white/5 py-3 px-6 rounded-full border border-white/10"
                  >
                    <div 
                      className="w-4 h-4 rounded-full animate-pulse shadow-[0_0_8px_currentColor]"
                      style={{ color: winnerColor }}
                    />
                    <span className="text-xl font-bold text-white">
                      {winnerName}
                    </span>
                  </m.div>
                )}

                <p className="text-muted-foreground text-lg leading-snug">
                  {finishSummary?.message || (
                    showWinner
                      ? 'Felicidades por conquistar el tablero de Parkeando.'
                      : 'La partida ha concluido satisfactoriamente.'
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={() => navigateAwayFromGame()}
                  variant="panama"
                  size="xl"
                  className="w-full text-lg font-black h-16 shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  {returnNowLabel}
                </Button>
                
                <p className="text-sm font-medium text-muted-foreground/60 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin-slow" />
                  Regresando al {exitDestinationLabel} en <span className="text-panama-yellow font-bold">5 segundos</span>…
                </p>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Ambient fondo — warm Panama palette, no cold blue */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-panama-red/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-panama-yellow/4 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* ── ENCABEZADO FIJO MÓVIL ── */}
      {myPlayer && (
        <div className="sticky top-0 z-50 glass shadow-lg border-b border-white/5 md:hidden" role="status" aria-label="Estado del jugador">
          <div className="grid grid-cols-3 divide-x divide-white/10 px-2 py-3">
            <div className="flex flex-col leading-none items-center justify-center">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Posición</span>
              <span className="text-sm font-black text-white">[{myPlayer?.position}]</span>
            </div>
            <div className="flex flex-col leading-none items-center justify-center">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Balboa</span>
              <span className="text-sm font-black text-panama-green">B/. {myPlayer?.points}</span>
            </div>
            {isMyTurn ? (
              <div className="flex flex-col leading-none items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tiempo</span>
                <span
                  className={`text-sm font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-panama-red'}`}
                  role="timer"
                  aria-live="assertive"
                >
                  {Math.max(0, timeLeft)}s
                </span>
              </div>
            ) : (
              <div className="flex flex-col leading-none items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Turno</span>
                <span className="text-xs font-bold text-panama-yellow truncate w-full text-center px-1">
                  {mobileTurnLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── principal contenido ── */}
      <main id="main-content" className="relative z-10 max-w-[1800px] mx-auto px-3 md:px-6 lg:px-8 pt-3 md:pt-6 pb-6 flex flex-col gap-4 md:gap-5">

        {/* ── CENTRAL TIMER (Highly Visible) ── */}
        {game?.status === 'in_progress' && (
          <div className="flex justify-center -mt-2 mb-2">
            <div className={`glass px-6 py-2 rounded-full border-2 flex items-center gap-3 transition-colors ${
              isMyTurn ? (timeLeft <= 20 ? 'border-red-500 bg-red-500/10' : 'border-panama-blue bg-panama-blue/10') : 'border-white/10 opacity-70'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isMyTurn ? (timeLeft <= 20 ? 'bg-red-500 animate-ping' : 'bg-panama-green animate-pulse') : 'bg-white/30'}`} />
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Tiempo de Turno</span>
                <span className={`text-2xl font-black tabular-nums ${isMyTurn && timeLeft <= 20 ? 'text-red-400' : 'text-white'}`}>
                  {isMyTurn ? `${Math.max(0, timeLeft)}s` : '--'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Progress barra */}
        <ProgressBar players={players} maxCells={120} myPlayerId={myPlayer?.id} />

        {/* ── ESCRITORIO: diseño de dos columnas (tablero + lateral) / Móvil: apilado ── */}
        <div className="flex flex-col xl:flex-row gap-4 md:gap-5 items-start">

          {/* ── LEFT / principal: tablero ── */}
          <div className="w-full xl:flex-1">
            <Board cells={cells} players={players} currentPosition={myPlayer?.position ?? 0} />
          </div>

          {/* ── DERECHA: barra lateral (solo escritorio, abajo en móvil) ── */}
          <div className="w-full xl:w-[340px] 2xl:w-[380px] flex-shrink-0 flex flex-col gap-4">

            {/* ── Estadísticas rápidas de jugador (ocultas en móvil, visibles en encabezado fijo) ── */}
            {myPlayer && (
              <div className="glass rounded-2xl border border-white/8 p-4 hidden md:flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Posición</span>
                  <span className="text-2xl font-black text-white">Casilla {myPlayer.position}</span>
                </div>
                <div className="w-px h-10 bg-white/10 flex-shrink-0" />
                <div className="flex flex-col items-center">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Balboa</span>
                  <span className="text-2xl font-black text-panama-green">B/. {myPlayer.points}</span>
                </div>
                <div className="w-px h-10 bg-white/10 flex-shrink-0" />
                <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Comodines</span>
                  <span className="text-2xl font-black text-panama-yellow">{myPlayer.wildcards || 0}</span>
                </div>
              </div>
            )}

            {/* ── dado / Waiting area ── */}
            <div className="glass rounded-2xl border border-white/8 min-h-[220px] flex flex-col">
              {isMyTurn && myPlayer ? (
                <m.div
                  key="dice-area"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center gap-5 p-6 h-full flex-1"
                >
                  {/* Indicador de turno */}
                  <div className="flex items-center gap-2 bg-panama-green/10 border border-panama-green/25 rounded-xl px-4 py-2 w-full justify-center">
                    <div className="w-2 h-2 rounded-full bg-panama-green animate-pulse flex-shrink-0" />
                    <span className="text-sm font-bold text-panama-green/90">¡Es tu turno!</span>
                    {timeLeft > 0 && (
                      <span className={`ml-auto text-sm font-black tabular-nums ${timeLeft <= 20 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {Math.max(0, timeLeft)}s
                      </span>
                    )}
                  </div>

                  <Dice
                    onRoll={handleRoll}
                    disabled={showQRScanner || !!(myPlayer as any)?.pending_position || waitingForNextTurn}
                    serverResult={lastDiceResult}
                  />

                  <div className="w-full space-y-2">
                    {!showQRScanner && !!(myPlayer as any)?.pending_position && (
                      <Button
                        variant="panama"
                        size="lg"
                        className="w-full animate-pulse"
                        onClick={() => { setExpectedPosition((myPlayer as any).pending_position); setShowQRScanner(true); }}
                      >
                        <Gamepad2 className="w-5 h-5 mr-2" />
                        Escanear Casilla {(myPlayer as any).pending_position}
                      </Button>
                    )}
                    {!currentQuestion && !!(myPlayer as any)?.pending_card_id && (
                      <Button
                        variant="destructive"
                        size="lg"
                        className="w-full animate-pulse"
                        onClick={() => {
                          const cardId = (myPlayer as any).pending_card_id;
                          const pendingCard = GAME_CARDS.find(c => c.id === cardId);
                          if (pendingCard) setCurrentQuestion(pendingCard);
                        }}
                      >
                        <Flame className="w-5 h-5 mr-2" />
                        Resolver Reto Pendiente
                      </Button>
                    )}
                  </div>
                </m.div>
              ) : (
                <m.div
                  key="waiting-area"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center gap-3 p-6 h-full flex-1 text-center"
                >
                  <Clock className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Esperando el movimiento de{' '}
                    <span className="text-panama-yellow font-bold not-italic">
                      {waitingTurnLabel}
                    </span>
                    …
                  </p>
                  {!myPlayer && (
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                      <div className="px-4 py-1.5 rounded-full bg-panama-blue/15 border border-panama-blue/25 text-xs font-bold text-panama-blue uppercase tracking-widest">
                        Espectador
                      </div>
                      {isAdminSpectator ? (
                        <div className="px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-300 uppercase tracking-widest">
                          Admin observando
                        </div>
                      ) : null}
                    </div>
                  )}
                </m.div>
              )}
            </div>

            {/* ── Quick actions ── */}
            <div className="flex flex-wrap gap-2">
              {myPlayer && (
                <button
                  onClick={leaveCurrentGame}
                  disabled={leavingGame}
                  aria-label="Salir de la partida"
                  className="flex-1 min-w-[180px] glass rounded-xl p-3 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/15 transition-all border border-red-500/10 text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              )}
              {!myPlayer && isSpectatorSession && (
                <button
                  onClick={() => void leaveSpectatorMode('Has salido de la sesión de espectador.')}
                  disabled={leavingGame}
                  aria-label="Salir del modo espectador"
                  className="flex-1 min-w-[180px] glass rounded-xl p-3 flex items-center justify-center gap-2 text-cyan-300 hover:bg-cyan-500/10 transition-all border border-cyan-400/20 text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Salir de espectador</span>
                </button>
              )}
              {isAdminSpectator && game?.status === 'in_progress' && (
                <button
                  onClick={endGameFromSpectator}
                  disabled={leavingGame}
                  aria-label="Finalizar mesa como administrador"
                  className="flex-1 min-w-[180px] glass rounded-xl p-3 flex items-center justify-center gap-2 text-rose-300 hover:bg-rose-500/10 transition-all border border-rose-500/20 text-sm font-semibold"
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Finalizar mesa</span>
                </button>
              )}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                  className="glass rounded-xl p-3 flex items-center justify-center hover:bg-white/10 transition-all border border-white/8"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-panama-green" />}
                </button>
            </div>

            {/* ── jugadores list ── */}
            <div className="glass rounded-2xl border border-white/8 overflow-hidden flex-1">
              <PlayersList
                players={players}
                currentPlayerId={currentPlayerId}
                myPlayerId={myPlayer?.id ?? ''}
              />
            </div>
          </div>
        </div>
      </main>

      {showQRScanner && (
        <QRScanner
          expectedPosition={expectedPosition}
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          onCameraPermissionDenied={handleCameraPermissionDenied}
          timeLeft={timeLeft}
        />
      )}

      {currentQuestion && (
        <QuestionModal
          card={currentQuestion!}
          onAnswer={handleAnswer}
          onComplete={handleCardComplete}
          onClose={() => { setCurrentQuestion(null); setTimeLeft(GAME_TIMING_SECONDS.TURN_TIMEOUT); }}
        />
      )}

      {currentBattle && (
        <BattleModal
          battle={currentBattle!}
          isWinner={myPlayer?.id === currentBattle.winnerId}
          onClose={() => setCurrentBattle(null)}
        />
      )}

    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Cargando partida...</div>
      </div>
    }>
      <AuthGuard>
        <GameContent />
      </AuthGuard>
    </Suspense>
  );
}
