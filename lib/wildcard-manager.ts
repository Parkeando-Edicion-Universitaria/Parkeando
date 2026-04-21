/**
 * Wildcard Manager - Sistema de comodines para jugadores atascados
 */

import { getServiceSupabase } from './supabase';

const db = () => getServiceSupabase();

// Configuración de comodines
export const WILDCARD_CONFIG = {
  MAX_WILDCARDS: 5, // Máximo de comodines que puede tener un jugador
  FAILED_ATTEMPTS_FOR_WILDCARD: 3, // Intentos fallidos para dar comodín
  WILDCARD_TYPES: {
    SKIP_QUESTION: 'skip_question', // Saltar pregunta actual
    CHANGE_QUESTION: 'change_question', // Cambiar por otra pregunta
    FIFTY_FIFTY: 'fifty_fifty', // Eliminar 2 opciones incorrectas
    EXTRA_TIME: 'extra_time', // 30 segundos extra
  },
} as const;

export type WildcardType = typeof WILDCARD_CONFIG.WILDCARD_TYPES[keyof typeof WILDCARD_CONFIG.WILDCARD_TYPES];

/**
 * Verificar si el jugador debe recibir un comodín
 */
export async function checkForWildcardGrant(
  playerId: string
): Promise<{ shouldGrant: boolean; reason?: string }> {
  const { data: player, error } = await db()
    .from('game_players')
    .select('failed_attempts, wildcards, current_question_id')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    return { shouldGrant: false };
  }

  // Ya tiene el máximo de comodines
  if (player.wildcards >= WILDCARD_CONFIG.MAX_WILDCARDS) {
    return { shouldGrant: false, reason: 'max_wildcards_reached' };
  }

  // Ha fallado suficientes veces en la misma pregunta
  if (player.failed_attempts >= WILDCARD_CONFIG.FAILED_ATTEMPTS_FOR_WILDCARD) {
    return {
      shouldGrant: true,
      reason: `Has fallado ${player.failed_attempts} veces. ¡Te damos un comodín!`,
    };
  }

  return { shouldGrant: false };
}

/**
 * Otorgar comodín al jugador
 */
export async function grantWildcard(playerId: string): Promise<boolean> {
  const { data: player, error } = await db()
    .from('game_players')
    .select('wildcards')
    .eq('id', playerId)
    .single();

  if (error || !player) return false;

  // Verificar límite
  if (player.wildcards >= WILDCARD_CONFIG.MAX_WILDCARDS) {
    return false;
  }

  // Incrementar comodines y resetear intentos fallidos
  const { error: updateError } = await db()
    .from('game_players')
    .update({
      wildcards: player.wildcards + 1,
      failed_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  return !updateError;
}

/**
 * Usar comodín
 */
export async function useWildcard(
  playerId: string,
  wildcardType: WildcardType
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const { data: player, error } = await db()
    .from('game_players')
    .select('wildcards, current_question_id, game_id')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    return { success: false, error: 'Jugador no encontrado' };
  }

  // Verificar que tiene comodines
  if (player.wildcards <= 0) {
    return { success: false, error: 'No tienes comodines disponibles' };
  }

  let result: any = {};

  switch (wildcardType) {
    case WILDCARD_CONFIG.WILDCARD_TYPES.SKIP_QUESTION:
      // Saltar pregunta - avanzar sin responder
      result = await skipQuestion(playerId);
      break;

    case WILDCARD_CONFIG.WILDCARD_TYPES.CHANGE_QUESTION:
      // Cambiar pregunta - obtener nueva pregunta
      result = await changeQuestion(playerId);
      break;

    case WILDCARD_CONFIG.WILDCARD_TYPES.FIFTY_FIFTY:
      // 50/50 - eliminar 2 opciones incorrectas
      result = await fiftyFifty(player.current_question_id);
      break;

    case WILDCARD_CONFIG.WILDCARD_TYPES.EXTRA_TIME:
      // Tiempo extra - dar 30 segundos más
      result = { extraTime: 30 };
      break;

    default:
      return { success: false, error: 'Tipo de comodín inválido' };
  }

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Decrementar comodines
  const { error: updateError } = await db()
    .from('game_players')
    .update({
      wildcards: player.wildcards - 1,
      failed_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  if (updateError) {
    return { success: false, error: 'Error al usar comodín' };
  }

  // Log del evento
  await db().from('game_events').insert({
    game_id: player.game_id,
    player_id: playerId,
    event_type: 'wildcard_used',
    event_data: { type: wildcardType },
  });

  return { success: true, result: result.data };
}

/**
 * Saltar pregunta actual
 */
async function skipQuestion(playerId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  // Resetear pregunta actual y permitir avanzar
  const { error } = await db()
    .from('game_players')
    .update({
      current_question_id: null,
      failed_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  if (error) {
    return { success: false, error: 'Error al saltar pregunta' };
  }

  return {
    success: true,
    data: { message: 'Pregunta saltada. Puedes avanzar.' },
  };
}

/**
 * Cambiar pregunta actual por otra
 */
async function changeQuestion(playerId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const { data: player, error: playerError } = await db()
    .from('game_players')
    .select('current_question_id')
    .eq('id', playerId)
    .single();

  if (playerError || !player) {
    return { success: false, error: 'Jugador no encontrado' };
  }

  // Obtener nueva pregunta (diferente a la actual)
  const { data: newQuestion, error: questionError } = await db()
    .from('questions')
    .select('id')
    .eq('is_active', true)
    .neq('id', player.current_question_id || '')
    .limit(1)
    .single();

  if (questionError || !newQuestion) {
    return { success: false, error: 'No hay preguntas disponibles' };
  }

  // Actualizar pregunta actual
  const { error: updateError } = await db()
    .from('game_players')
    .update({
      current_question_id: newQuestion.id,
      failed_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  if (updateError) {
    return { success: false, error: 'Error al cambiar pregunta' };
  }

  // Obtener pregunta descifrada
  const { data: question, error: decryptError } = await db().rpc(
    'get_decrypted_question',
    { question_id: newQuestion.id }
  );

  if (decryptError || !question || question.length === 0) {
    return { success: false, error: 'Error al obtener pregunta' };
  }

  return {
    success: true,
    data: {
      message: 'Pregunta cambiada',
      question: question[0],
    },
  };
}

/**
 * 50/50 - Eliminar 2 opciones incorrectas
 */
async function fiftyFifty(questionId: string | null): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  if (!questionId) {
    return { success: false, error: 'No hay pregunta actual' };
  }

  // Obtener pregunta con opciones
  const { data: question, error } = await db().rpc(
    'get_decrypted_question',
    { question_id: questionId }
  );

  if (error || !question || question.length === 0) {
    return { success: false, error: 'Error al obtener pregunta' };
  }

  const q = question[0];
  const options = q.options as string[];

  // Obtener respuesta correcta (sin exponerla al cliente)
  const { data: correctData, error: correctError } = await db()
    .from('questions')
    .select('correct_answer_encrypted')
    .eq('id', questionId)
    .single();

  if (correctError || !correctData) {
    return { success: false, error: 'Error al verificar respuesta' };
  }

  // Descifrar respuesta correcta (solo en servidor)
  const { data: decrypted } = await db().rpc('decrypt_data', {
    encrypted: correctData.correct_answer_encrypted,
  });

  const correctAnswer = decrypted;

  // Encontrar índices de opciones incorrectas
  const incorrectIndices = options
    .map((opt, idx) => (opt !== correctAnswer ? idx : -1))
    .filter((idx) => idx !== -1);

  // Seleccionar 2 opciones incorrectas al azar para eliminar
  const toRemove = incorrectIndices
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return {
    success: true,
    data: {
      message: '50/50 activado',
      removedIndices: toRemove,
    },
  };
}

/**
 * Incrementar intentos fallidos
 */
export async function incrementFailedAttempts(
  playerId: string
): Promise<{ shouldGrantWildcard: boolean; failedAttempts: number }> {
  const { data: player, error } = await db()
    .from('game_players')
    .select('failed_attempts, wildcards')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    return { shouldGrantWildcard: false, failedAttempts: 0 };
  }

  const newFailedAttempts = player.failed_attempts + 1;

  await db()
    .from('game_players')
    .update({
      failed_attempts: newFailedAttempts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  // Verificar si debe recibir comodín
  const shouldGrant =
    newFailedAttempts >= WILDCARD_CONFIG.FAILED_ATTEMPTS_FOR_WILDCARD &&
    player.wildcards < WILDCARD_CONFIG.MAX_WILDCARDS;

  if (shouldGrant) {
    await grantWildcard(playerId);
  }

  return {
    shouldGrantWildcard: shouldGrant,
    failedAttempts: newFailedAttempts,
  };
}

/**
 * Resetear intentos fallidos (cuando responde correctamente)
 */
export async function resetFailedAttempts(playerId: string): Promise<boolean> {
  const { error } = await db()
    .from('game_players')
    .update({
      failed_attempts: 0,
      current_question_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  return !error;
}

/**
 * Obtener información de comodines del jugador
 */
export async function getWildcardInfo(playerId: string): Promise<{
  wildcards: number;
  failedAttempts: number;
  attemptsUntilWildcard: number;
}> {
  const { data: player, error } = await db()
    .from('game_players')
    .select('wildcards, failed_attempts')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    return { wildcards: 0, failedAttempts: 0, attemptsUntilWildcard: 3 };
  }

  const attemptsUntilWildcard = Math.max(
    0,
    WILDCARD_CONFIG.FAILED_ATTEMPTS_FOR_WILDCARD - player.failed_attempts
  );

  return {
    wildcards: player.wildcards,
    failedAttempts: player.failed_attempts,
    attemptsUntilWildcard,
  };
}
