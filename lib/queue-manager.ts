/**
 * Queue Manager - Gestión de cola de espera y sistema de listo
 */

import { getServiceSupabase } from './supabase';

const db = () => getServiceSupabase();

export interface QueuePlayer {
  userId: string;
  username: string;
  joinedAt: Date;
  ready: boolean;
  icon: string; // Icono asignado
}

// Tiempo máximo para dar listo antes de ser expulsado de la cola (2 minutos)
export const QUEUE_READY_TIMEOUT_MS = 2 * 60 * 1000;

// Iconos disponibles para jugadores
export const PLAYER_ICONS = [
  '🚗', // Carro
  '🚕', // Taxi
  '🚙', // SUV
  '🚌', // Bus
  '🚎', // Trolley
  '🏎️', // Carro de carreras
];

/**
 * Agregar jugador a la cola
 */
export async function addToQueue(
  gameId: string,
  userId: string,
  username: string
): Promise<{ success: boolean; position: number; icon: string }> {
  const { data: game, error } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .single();

  if (error || !game) {
    return { success: false, position: -1, icon: '' };
  }

  const queue: QueuePlayer[] = game.queue || [];

  // Verificar si ya está en la cola
  if (queue.some((p) => p.userId === userId)) {
    const position = queue.findIndex((p) => p.userId === userId);
    return { success: true, position, icon: queue[position].icon };
  }

  // Asignar icono
  const icon = PLAYER_ICONS[queue.length % PLAYER_ICONS.length];

  // Agregar a la cola
  const newPlayer: QueuePlayer = {
    userId,
    username,
    joinedAt: new Date(),
    ready: false,
    icon,
  };

  queue.push(newPlayer);

  const { error: updateError } = await db()
    .from('games')
    .update({ queue, updated_at: new Date().toISOString() })
    .eq('id', gameId);

  if (updateError) {
    return { success: false, position: -1, icon: '' };
  }

  return { success: true, position: queue.length - 1, icon };
}

/**
 * Remover jugador de la cola
 */
export async function removeFromQueue(
  gameId: string,
  userId: string
): Promise<boolean> {
  const { data: game, error } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .single();

  if (error || !game) return false;

  const queue: QueuePlayer[] = game.queue || [];
  const newQueue = queue.filter((p) => p.userId !== userId);

  const { error: updateError } = await db()
    .from('games')
    .update({ queue: newQueue, updated_at: new Date().toISOString() })
    .eq('id', gameId);

  return !updateError;
}

/**
 * Marcar jugador como listo
 */
export async function setPlayerReady(
  gameId: string,
  userId: string,
  ready: boolean
): Promise<boolean> {
  const { data: game, error } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .single();

  if (error || !game) return false;

  const queue: QueuePlayer[] = game.queue || [];
  const playerIndex = queue.findIndex((p) => p.userId === userId);

  if (playerIndex === -1) return false;

  queue[playerIndex].ready = ready;

  const { error: updateError } = await db()
    .from('games')
    .update({ queue, updated_at: new Date().toISOString() })
    .eq('id', gameId);

  return !updateError;
}

/**
 * Verificar si todos están listos
 */
export async function checkAllReady(gameId: string): Promise<{
  allReady: boolean;
  readyCount: number;
  totalCount: number;
}> {
  const { data: game, error } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .single();

  if (error || !game) {
    return { allReady: false, readyCount: 0, totalCount: 0 };
  }

  const queue: QueuePlayer[] = game.queue || [];
  const readyCount = queue.filter((p) => p.ready).length;
  const totalCount = queue.length;

  // Todos listos si hay al menos 2 jugadores y todos están listos
  const allReady = totalCount >= 2 && readyCount === totalCount;

  return { allReady, readyCount, totalCount };
}

/**
 * Iniciar partida desde la cola
 */
export async function startGameFromQueue(gameId: string): Promise<boolean> {
  const { data: game, error } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .single();

  if (error || !game) return false;

  const queue: QueuePlayer[] = game.queue || [];

  // Verificar que todos estén listo
  const { allReady } = await checkAllReady(gameId);
  if (!allReady) return false;

  // Crear jugadores en la partida
  const players = queue.map((qp, index) => ({
    game_id: gameId,
    user_id: qp.userId,
    username: qp.username,
    position: 0,
    points: 0,
    status: 'active',
    color: getPlayerColor(index),
    icon: qp.icon,
    joined_at: qp.joinedAt.toISOString(),
    last_action_at: new Date().toISOString(),
  }));

  const { data: createdPlayers, error: playersError } = await db()
    .from('game_players')
    .insert(players)
    .select();

  if (playersError || !createdPlayers) return false;

  // Actualizar estado del juego
  const { error: updateError } = await db()
    .from('games')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      current_turn: createdPlayers[0].user_id,
      turn_start_time: new Date().toISOString(),
      queue: [], // Limpiar cola
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  return !updateError;
}

/**
 * Obtener cola actual
 */
export async function getQueue(gameId: string): Promise<QueuePlayer[]> {
  const { data: game, error } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .single();

  if (error || !game) return [];

  return game.queue || [];
}

/**
 * Limpiar jugadores inactivos de la cola (tiempo agotado sin dar listo)
 * Retorna los IDs de usuarios expulsados para poder notificarlos
 */
export async function cleanupInactiveQueue(
  gameId: string
): Promise<{ removed: number; kickedUserIds: string[]; kickedUsernames: string[] }> {
  const { data: game, error } = await db()
    .from('games')
    .select('queue')
    .eq('id', gameId)
    .single();

  if (error || !game) return { removed: 0, kickedUserIds: [], kickedUsernames: [] };

  const queue: QueuePlayer[] = game.queue || [];
  const now = Date.now();

  const kickedUserIds: string[] = [];
  const kickedUsernames: string[] = [];

  const activeQueue = queue.filter((p) => {
    const joinedTime = new Date(p.joinedAt).getTime();
    const elapsed = now - joinedTime;

    // Expulsar si NO está listo Y ha superado el límite de tiempo de inactividad
    if (!p.ready && elapsed >= QUEUE_READY_TIMEOUT_MS) {
      kickedUserIds.push(p.userId);
      kickedUsernames.push(p.username);
      return false;
    }
    return true;
  });

  const removed = kickedUserIds.length;

  if (removed > 0) {
    await db()
      .from('games')
      .update({ queue: activeQueue, updated_at: new Date().toISOString() })
      .eq('id', gameId);

    // Insertar eventos de notificación para cada jugador expulsado
    const events = kickedUserIds.map((userId, i) => ({
      game_id: gameId,
      player_id: null,
      event_type: 'queue_inactive_kick',
      event_data: {
        userId,
        username: kickedUsernames[i],
        reason: 'inactive_no_ready',
        message: `${kickedUsernames[i]} fue removido de la cola por inactividad (no dio ready a tiempo).`,
      },
    }));

    await db().from('game_events').insert(events);
  }

  return { removed, kickedUserIds, kickedUsernames };
}

// Colores para los jugadores
function getPlayerColor(index: number): string {
  const colors = [
    '#DA291C', // Rojo Panamá
    '#0033A0', // Azul Panamá
    '#FFD100', // Amarillo Panamá
    '#00A651', // Verde Panamá
    '#FF6B35', // Naranja
    '#9B59B6', // Púrpura
  ];
  return colors[index % colors.length];
}
