/**
 * Game Manager - Gestión centralizada de partidas
 * Maneja una única partida activa a la vez con sistema de espera
 */

import { getServiceSupabase } from './supabase';
import { GAME_TIMING } from './game-timing';

const db = () => getServiceSupabase();

// Constantes del juego
export const GAME_CONSTANTS = {
  MAX_PLAYERS: 6,
  MIN_PLAYERS: 2,
  PLAYER_TIMEOUT_MS: GAME_TIMING.AFK_TIMEOUT_MS, // 2 minutos sin acción
  WAITING_PLAYER_TIMEOUT_MS: 300000, // 5 minutos sin presencia visible en sala de espera
  TOTAL_CELLS: 120, // Posición máxima válida (0-120)
  TURN_TIME_LIMIT_MS: GAME_TIMING.TURN_TIMEOUT_MS, // 60 segundos por turno
  WIN_POSITION: 120, // La posición para ganar
} as const;

// Estados de la partida
export enum GameStatus {
  WAITING = 'waiting', // Esperando jugadores
  IN_PROGRESS = 'in_progress', // Partida en curso
  FINISHED = 'finished', // Partida terminada
}

// Estados del jugador
export enum PlayerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', // tiempo agotado
  DISCONNECTED = 'disconnected',
  FINISHED = 'finished', // Llegó a la meta
}

export interface GameState {
  id: string;
  status: GameStatus;
  currentTurn: string; // jugador ID
  turnStartTime: Date;
  players: GamePlayer[];
  startedAt?: Date;
  finishedAt?: Date;
  winner?: string;
  spectators: string[]; // User IDs esperando
  queue?: any; // JSONB dict para isReady
}

export interface GamePlayer {
  id: string;
  userId: string;
  username: string;
  position: number; // 0-120
  points: number;
  status: PlayerStatus;
  lastActionAt: Date;
  joinedAt: Date;
  color: string;
  wildcards: number;
  failed_attempts: number;
  pending_position: number | null;
  pending_dice: number | null;
  pending_card_id: string | null;
  in_jail: boolean;
  skip_next_turn: boolean;
  skip_turns_remaining: number;
  penalty_shields: number;
  consecutive_doubles: number;
  jail_visits: number;
}

export type GameEndReason =
  | 'winner'
  | 'no_players'
  | 'manual'
  | 'player_left'
  | 'player_timeout'
  | 'admin_ban'
  | 'admin_kick';

export interface GameParticipantRef {
  userId?: string | null;
  username?: string | null;
}

export interface GameActorRef {
  userId?: string | null;
  username?: string | null;
}

export interface GameEndOptions {
  reason: GameEndReason;
  winnerUserId?: string | null;
  countWin?: boolean;
  awardWinnerPoints?: boolean;
  message?: string;
  removedPlayer?: GameParticipantRef;
  actor?: GameActorRef;
  adminReason?: string | null;
}

export interface TurnAdvanceOptions {
  reason?: Extract<GameEndReason, 'player_left' | 'player_timeout' | 'admin_ban' | 'admin_kick'>;
  expectedCurrentTurn?: string;
  removedPlayer?: GameParticipantRef;
  actor?: GameActorRef;
  adminReason?: string | null;
}

export interface GameEndSummary {
  winnerUserId: string | null;
  winnerUsername: string | null;
  reason: GameEndReason;
  countsAsWin: boolean;
  message: string;
}

/**
 * Función auxiliar para mapear los datos de la DB al estado de la partida
 */
function mapGameData(data: any): GameState {
  return {
    id: data.id,
    status: data.status,
    currentTurn: data.current_turn,
    turnStartTime: new Date(data.turn_start_time || data.created_at),
    players: (data.players || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      username: p.username,
      position: p.position,
      points: p.points,
      status: p.status,
      lastActionAt: new Date(p.last_action_at || p.joined_at),
      joinedAt: new Date(p.joined_at),
      color: p.color,
      wildcards: p.wildcards || 0,
      failed_attempts: p.failed_attempts || 0,
      pending_position: p.pending_position,
      pending_dice: p.pending_dice,
      pending_card_id: p.pending_card_id || null,
      in_jail: p.in_jail || false,
      skip_next_turn: p.skip_next_turn || false,
      skip_turns_remaining: p.skip_turns_remaining || 0,
      penalty_shields: p.penalty_shields || 0,
      consecutive_doubles: p.consecutive_doubles || 0,
      jail_visits: p.jail_visits || 0,
    })),
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    finishedAt: data.finished_at ? new Date(data.finished_at) : undefined,
    winner: data.winner,
    spectators: data.spectators || [],
    queue: data.queue || {},
  };
}

function resolvePlayerByUserId(game: GameState, userId?: string | null): GamePlayer | null {
  if (!userId) return null;
  return game.players.find((player) => player.userId === userId) ?? null;
}

function buildGameFinishedMessage(
  reason: GameEndReason,
  winnerUsername: string | null,
  options: GameEndOptions
): string {
  const removedName = options.removedPlayer?.username || 'Un jugador';
  const actorName = options.actor?.username || 'Administración';
  const adminReason = options.adminReason?.trim();

  switch (reason) {
    case 'manual':
      return adminReason
        ? `${actorName} finalizó la partida: ${adminReason}. No se registró ganador.`
        : `${actorName} finalizó la partida desde el panel. No se registró ganador.`;
    case 'player_left':
      return winnerUsername
        ? `${removedName} abandonó la partida. ${winnerUsername} gana por permanencia.`
        : `${removedName} abandonó la partida. No quedaron jugadores suficientes para continuar.`;
    case 'player_timeout':
      return winnerUsername
        ? `${removedName} fue expulsado por inactividad. ${winnerUsername} gana por permanencia.`
        : `${removedName} fue expulsado por inactividad. No quedaron jugadores suficientes para continuar.`;
    case 'admin_ban':
      return winnerUsername
        ? `${removedName} fue suspendido por ${actorName}${adminReason ? `: ${adminReason}` : ''}. ${winnerUsername} gana por quedar como único jugador.`
        : `${removedName} fue suspendido por ${actorName}${adminReason ? `: ${adminReason}` : ''}. La partida terminó sin ganador.`;
    case 'admin_kick':
      return winnerUsername
        ? `${removedName} fue expulsado de la mesa por ${actorName}${adminReason ? `: ${adminReason}` : ''}. ${winnerUsername} gana por quedar como único jugador.`
        : `${removedName} fue expulsado de la mesa por ${actorName}${adminReason ? `: ${adminReason}` : ''}. La partida terminó sin ganador.`;
    case 'no_players':
      return 'La partida finalizó porque no quedaron jugadores activos.';
    case 'winner':
    default:
      return winnerUsername
        ? `¡Partida finalizada! Ganador: ${winnerUsername}.`
        : 'La partida finalizó sin un ganador válido.';
  }
}

/**
 * Obtener la partida activa de un usuario específico
 */
export async function getGameForUser(userId: string): Promise<GameState | null> {
  // Consolidamos la query: usamos un INNER JOIN (via !inner) aliasing para filtrar los juegos
  // donde este usuario participa (y está activo/desconectado), y a la vez solicitamos *todos* 
  // los jugadores de ese juego en el array 'jugadores'.
  const { data, error } = await db()
    .from('games')
    .select(`
      *,
      filter:game_players!inner(user_id, status),
      players:game_players(*)
    `)
    .eq('filter.user_id', userId)
    .in('filter.status', [PlayerStatus.ACTIVE, PlayerStatus.DISCONNECTED])
    .in('status', [GameStatus.WAITING, GameStatus.IN_PROGRESS])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return mapGameData(data);
}

/**
 * Obtener una partida específica por ID con todos sus jugadores
 */
export async function getGameById(gameId: string): Promise<GameState | null> {
  const { data, error } = await db()
    .from('games')
    .select(`
      *,
      players:game_players(*)
    `)
    .eq('id', gameId)
    .order('joined_at', { foreignTable: 'game_players', ascending: true })
    .single();

  if (error || !data) return null;

  return mapGameData(data);
}

/**
 * Obtener la partida activa más reciente (global)
 */
export async function getActiveGame(): Promise<GameState | null> {
  const { data, error } = await db()
    .from('games')
    .select(`
      *,
      players:game_players(*)
    `)
    .in('status', [GameStatus.WAITING, GameStatus.IN_PROGRESS])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return mapGameData(data);
}

/**
 * Verificar si un jugador está inactivo (tiempo agotado)
 */
export function isPlayerInactive(player: GamePlayer): boolean {
  const now = Date.now();
  const lastAction = player.lastActionAt.getTime();
  return now - lastAction > GAME_CONSTANTS.PLAYER_TIMEOUT_MS;
}

export function isWaitingPlayerInactive(player: GamePlayer): boolean {
  const now = Date.now();
  const lastAction = player.lastActionAt.getTime();
  return now - lastAction > GAME_CONSTANTS.WAITING_PLAYER_TIMEOUT_MS;
}

/**
 * Verificar si el turno ha expirado
 */
export function isTurnExpired(game: GameState): boolean {
  const now = Date.now();
  const turnStart = game.turnStartTime.getTime();
  return now - turnStart > GAME_CONSTANTS.TURN_TIME_LIMIT_MS;
}

/**
 * Remover jugadores inactivos
 */
export async function removeInactivePlayers(gameId: string): Promise<string[]> {
  const game = await getGameById(gameId);
  if (!game) return [];

  const inactivePlayers: string[] = [];

  const currentTurnPlayer = game.players.find(
    (p) => p.status === PlayerStatus.ACTIVE && p.userId === game.currentTurn
  );

  const scheduledPenaltySkips = Math.max(
    currentTurnPlayer?.skip_turns_remaining ?? 0,
    currentTurnPlayer?.skip_next_turn ? 1 : 0
  );

  // Si el turno actual corresponde a una penalización pendiente, consumirla primero.
  // Esto evita marcar AFK a jugadores que debían saltar turno por regla de juego.
  if (currentTurnPlayer && scheduledPenaltySkips > 0) {
    const remainingSkips = Math.max(0, scheduledPenaltySkips - 1);

    await db()
      .from('game_players')
      .update({
        skip_turns_remaining: remainingSkips,
        skip_next_turn: remainingSkips > 0,
        failed_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentTurnPlayer.id);

    await db()
      .from('game_events')
      .insert({
        game_id: gameId,
        player_id: currentTurnPlayer.id,
        event_type: 'turn_ended',
        event_data: {
          reason: 'scheduled_skip_penalty',
          userId: currentTurnPlayer.userId,
          username: currentTurnPlayer.username,
          remainingSkips,
          message: `${currentTurnPlayer.username} pierde turno por penalización pendiente.`,
        },
      });

    await nextTurn(gameId, {
      expectedCurrentTurn: game.currentTurn,
    });

    return inactivePlayers;
  }

  const inactivePlayerIds = game.players
    .filter((p) => p.status === PlayerStatus.ACTIVE && isPlayerInactive(p))
    .map((p) => p.id);

  if (inactivePlayerIds.length > 0) {
    // Marcar todos como inactivos en un solo lote (actualización por lotes)
    await db()
      .from('game_players')
      .update({
        status: PlayerStatus.INACTIVE,
        updated_at: new Date().toISOString(),
      })
      .in('id', inactivePlayerIds);

    inactivePlayers.push(...inactivePlayerIds);
  }

  if (inactivePlayerIds.length > 0) {
    const remainingActivePlayers = game.players.filter(
      (player) => player.status === PlayerStatus.ACTIVE && !inactivePlayerIds.includes(player.id)
    );

    if (remainingActivePlayers.length <= 1) {
      const timedOutPlayer = game.players.find((player) => inactivePlayerIds.includes(player.id));
      await endGame(gameId, {
        reason: 'player_timeout',
        winnerUserId: remainingActivePlayers[0]?.userId ?? null,
        removedPlayer: {
          userId: timedOutPlayer?.userId ?? null,
          username: timedOutPlayer?.username ?? null,
        },
      });
      return inactivePlayers;
    }
  }

  // Si el jugador actual está inactivo, pasar turno
  const timedOutCurrentPlayer = game.players.find(
    (player) => inactivePlayerIds.includes(player.id) && player.userId === game.currentTurn
  );

  if (timedOutCurrentPlayer) {
    await nextTurn(gameId, {
      reason: 'player_timeout',
      removedPlayer: {
        userId: timedOutCurrentPlayer.userId,
        username: timedOutCurrentPlayer.username,
      },
    });
  }

  return inactivePlayers;
}

export async function removeInactiveWaitingPlayers(gameId: string): Promise<string[]> {
  const game = await getGameById(gameId);
  if (!game || game.status !== GameStatus.WAITING) return [];

  const stalePlayers = game.players.filter(
    (player) => player.status === PlayerStatus.ACTIVE && isWaitingPlayerInactive(player)
  );

  if (stalePlayers.length === 0) return [];

  const stalePlayerIds = stalePlayers.map((player) => player.id);
  const staleUserIds = stalePlayers.map((player) => player.userId);

  await db()
    .from('game_players')
    .delete()
    .in('id', stalePlayerIds);

  const { data: waitingGame } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .maybeSingle();

  const queueState = waitingGame?.queue;
  if (queueState && typeof queueState === 'object' && !Array.isArray(queueState)) {
    const nextQueue = { ...queueState } as Record<string, any>;

    for (const userId of staleUserIds) {
      delete nextQueue[userId];
    }

    delete nextQueue._startCountdownAt;

    await db()
      .from('games')
      .update({
        queue: nextQueue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);
  }

  const events = stalePlayers.map((player) => ({
    game_id: gameId,
    player_id: player.id,
    event_type: 'queue_inactive_kick',
    event_data: {
      userId: player.userId,
      username: player.username,
      reason: 'hidden_or_stale_presence',
      message: `${player.username} fue removido de la sala de espera por inactividad.`,
    },
  }));

  if (events.length > 0) {
    await db().from('game_events').insert(events);
  }

  return staleUserIds;
}

/**
 * Pasar al siguiente turno
 */
export async function nextTurn(gameId: string, options: TurnAdvanceOptions = {}): Promise<string | null> {
  // IMPORTANTE: resolver la partida exacta por id.
  // Usar la última partida activa global puede apuntar a otra mesa y congelar turnos.
  const game = await getGameById(gameId);
  if (!game || game.status !== GameStatus.IN_PROGRESS) return null;

  // Protección anti-carrera: evita avanzar turno dos veces si otro cliente ya lo procesó.
  if (options.expectedCurrentTurn && game.currentTurn !== options.expectedCurrentTurn) {
    return null;
  }

  // Obtener jugadores activos ordenados por ingreso para asegurar orden de turno consistente
  const activePlayers = [...game.players]
    .filter((p) => p.status === PlayerStatus.ACTIVE)
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

  if (activePlayers.length <= 1) {
    const winnerId = activePlayers.length === 1 ? activePlayers[0].userId : null;
    await endGame(gameId, {
      reason: options.reason ?? (winnerId ? 'winner' : 'no_players'),
      winnerUserId: winnerId,
      removedPlayer: options.removedPlayer,
      actor: options.actor,
      adminReason: options.adminReason,
    });
    return null;
  }

  const currentIndex = activePlayers.findIndex(
    (p) => p.userId === game.currentTurn
  );
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  const nextPlayer = activePlayers[nextIndex];

  // 1. Actualizar el turno en la partida
  await db()
    .from('games')
    .update({
      current_turn: nextPlayer.userId,
      turn_start_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  // 2. Limpiar estados de movimiento del NUEVO jugador.
  // IMPORTANTE: NO se resetea last_action_at aquí. Los jugadores activos actualizan su
  // last_action_at periódicamente vía heartbeat (cada 20s). Resetearlo en nextTurn provocaba
  // que los jugadores desconectados (que cerraron el navegador sin beacon) nunca fueran
  // detectados como AFK, ya que su timer se reiniciaba cada vez que empezaba su turno.
  await db()
    .from('game_players')
    .update({
      pending_position: null,
      pending_dice: null,
      updated_at: new Date().toISOString(),
    })
    .match({ game_id: gameId, user_id: nextPlayer.userId });

  // 3. Limpiar estados para el resto de los jugadores
  await db()
    .from('game_players')
    .update({
      pending_position: null,
      pending_dice: null,
      updated_at: new Date().toISOString(),
    })
    .eq('game_id', gameId)
    .neq('user_id', nextPlayer.userId);

  // 4. Registrar evento de inicio de turno
  await db()
    .from('game_events')
    .insert({
      game_id: gameId,
      player_id: nextPlayer.id,
      event_type: 'turn_started',
      event_data: {
        userId: nextPlayer.userId,
        username: nextPlayer.username,
        message: `Es el turno de ${nextPlayer.username}`
      }
    });

  return nextPlayer.id;
}
export function checkWinner(game: GameState): GamePlayer | null {
  const finishedPlayers = game.players.filter(
    (p) => p.position >= GAME_CONSTANTS.WIN_POSITION
  );

  if (finishedPlayers.length === 0) return null;

  // El primero en llegar gana
  return finishedPlayers.sort(
    (a, b) => a.lastActionAt.getTime() - b.lastActionAt.getTime()
  )[0];
}

/**
 * Terminar partida
 */
export async function endGame(
  gameId: string,
  options: GameEndOptions
): Promise<GameEndSummary | null> {
  const game = await getGameById(gameId);
  if (!game) return null;

  const winner =
    resolvePlayerByUserId(game, options.winnerUserId) ??
    (options.reason === 'winner' ? checkWinner(game) : null);

  const winnerUserId = winner?.userId ?? null;
  const winnerUsername = winner?.username ?? null;
  const countsAsWin = options.countWin ?? Boolean(winnerUserId && !['manual', 'no_players'].includes(options.reason));
  const awardWinnerPoints = options.awardWinnerPoints ?? countsAsWin;
  const message = options.message ?? buildGameFinishedMessage(options.reason, winnerUsername, options);

  await db()
    .from('games')
    .update({
      status: GameStatus.FINISHED,
      finished_at: new Date().toISOString(),
      winner: winnerUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  // Registrar evento de partida finalizada
  await db()
    .from('game_events')
    .insert({
      game_id: gameId,
      event_type: 'game_finished',
      event_data: {
        winnerId: winnerUserId,
        winnerUsername,
        reason: options.reason,
        countsAsWin,
        awardWinnerPoints,
        removedPlayerId: options.removedPlayer?.userId ?? null,
        removedPlayerUsername: options.removedPlayer?.username ?? null,
        actorId: options.actor?.userId ?? null,
        actorUsername: options.actor?.username ?? null,
        adminReason: options.adminReason ?? null,
        message,
      }
    });

  // Actualizar estadísticas de jugadores
  if (winner) {
    // Usar llamadas RPC separadas y correctas
    try {
      if (countsAsWin) {
        await db().rpc('increment_user_wins', { u_id: winner.userId });
      }
      if (awardWinnerPoints) {
        await db().rpc('increment_user_points', { u_id: winner.userId, amount: winner.points });
      }
    } catch (e) {
      console.error("[GameManager] Error updating winner stats:", e);
    }
  }

  return {
    winnerUserId,
    winnerUsername,
    reason: options.reason,
    countsAsWin,
    message,
  };
}

export interface AdminPlayerRemovalOptions {
  userId: string;
  action: 'kick' | 'ban';
  adminUserId?: string | null;
  adminUsername?: string | null;
  adminReason?: string | null;
}

export interface AdminPlayerRemovalResult {
  removed: boolean;
  gameId: string | null;
  endedGame: boolean;
  winnerUserId: string | null;
  winnerUsername: string | null;
  message: string;
}

export async function removePlayerByAdmin(
  options: AdminPlayerRemovalOptions
): Promise<AdminPlayerRemovalResult> {
  const { data: playerRow, error } = await db()
    .from('game_players')
    .select('id, game_id, user_id, username, games!inner(status)')
    .eq('user_id', options.userId)
    .in('games.status', [GameStatus.WAITING, GameStatus.IN_PROGRESS])
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!playerRow) {
    return {
      removed: false,
      gameId: null,
      endedGame: false,
      winnerUserId: null,
      winnerUsername: null,
      message: 'El usuario no está en una partida activa.',
    };
  }

  const game = await getGameById(playerRow.game_id);
  if (!game) {
    return {
      removed: false,
      gameId: playerRow.game_id,
      endedGame: false,
      winnerUserId: null,
      winnerUsername: null,
      message: 'No se pudo resolver la partida del usuario.',
    };
  }

  const removedPlayer =
    game.players.find((player) => player.id === playerRow.id || player.userId === options.userId) ??
    null;

  const actorName = options.adminUsername || 'Administración';
  const removedName = removedPlayer?.username || playerRow.username || 'Un jugador';
  const removalVerb = options.action === 'ban' ? 'suspendido' : 'expulsado de la mesa';
  const removalMessage = `${removedName} fue ${removalVerb} por ${actorName}${options.adminReason?.trim() ? `: ${options.adminReason.trim()}` : '.'}`;

  const { error: deleteError } = await db()
    .from('game_players')
    .delete()
    .eq('id', playerRow.id);

  if (deleteError) throw deleteError;

  await db().from('game_events').insert({
    game_id: playerRow.game_id,
    event_type: 'player_removed_by_admin',
    event_data: {
      action: options.action,
      adminId: options.adminUserId ?? null,
      adminUsername: options.adminUsername ?? null,
      adminReason: options.adminReason ?? null,
      removedUserId: options.userId,
      removedUsername: removedName,
      message: removalMessage,
    },
  });

  if (game.status !== GameStatus.IN_PROGRESS) {
    return {
      removed: true,
      gameId: playerRow.game_id,
      endedGame: false,
      winnerUserId: null,
      winnerUsername: null,
      message: removalMessage,
    };
  }

  const refreshedGame = await getGameById(playerRow.game_id);
  const activePlayers = refreshedGame?.players.filter((player) => player.status === PlayerStatus.ACTIVE) ?? [];

  if (activePlayers.length <= 1) {
    const summary = await endGame(playerRow.game_id, {
      reason: options.action === 'ban' ? 'admin_ban' : 'admin_kick',
      winnerUserId: activePlayers[0]?.userId ?? null,
      removedPlayer: {
        userId: removedPlayer?.userId ?? options.userId,
        username: removedName,
      },
      actor: {
        userId: options.adminUserId ?? null,
        username: options.adminUsername ?? null,
      },
      adminReason: options.adminReason ?? null,
    });

    return {
      removed: true,
      gameId: playerRow.game_id,
      endedGame: true,
      winnerUserId: summary?.winnerUserId ?? null,
      winnerUsername: summary?.winnerUsername ?? null,
      message: summary?.message ?? removalMessage,
    };
  }

  if (game.currentTurn === options.userId) {
    await nextTurn(playerRow.game_id, {
      reason: options.action === 'ban' ? 'admin_ban' : 'admin_kick',
      removedPlayer: {
        userId: removedPlayer?.userId ?? options.userId,
        username: removedName,
      },
      actor: {
        userId: options.adminUserId ?? null,
        username: options.adminUsername ?? null,
      },
      adminReason: options.adminReason ?? null,
    });
  }

  return {
    removed: true,
    gameId: playerRow.game_id,
    endedGame: false,
    winnerUserId: null,
    winnerUsername: null,
    message: removalMessage,
  };
}

/**
 * Agregar espectador
 */
export async function addSpectator(
  gameId: string,
  userId: string
): Promise<boolean> {
  const game = await getGameById(gameId);
  if (!game || game.status !== GameStatus.IN_PROGRESS) return false;

  const spectators = Array.from(new Set([...(game.spectators || []), userId]));

  const { error } = await db()
    .from('games')
    .update({
      spectators,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  return !error;
}

/**
 * Remover espectador
 */
export async function removeSpectator(
  gameId: string,
  userId: string
): Promise<boolean> {
  const game = await getGameById(gameId);
  if (!game) return false;

  const spectators = (game.spectators || []).filter((id) => id !== userId);

  const { error } = await db()
    .from('games')
    .update({
      spectators,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  return !error;
}

/**
 * Actualizar última acción del jugador
 */
export async function updatePlayerAction(playerId: string): Promise<void> {
  await db()
    .from('game_players')
    .update({
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);
}

/**
 * Mover jugador a nueva posición
 */
export async function movePlayer(
  playerId: string,
  newPosition: number
): Promise<boolean> {
  // Validar posición
  if (newPosition < 0 || newPosition > GAME_CONSTANTS.TOTAL_CELLS) {
    return false;
  }

  const { error } = await db()
    .from('game_players')
    .update({
      position: newPosition,
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  return !error;
}

/**
 * Actualizar puntos del jugador
 */
export async function updatePlayerPoints(
  playerId: string,
  points: number
): Promise<boolean> {
  const { error } = await db().rpc('increment_player_points', {
    p_id: playerId,
    amount: points,
  });

  return !error;
}
