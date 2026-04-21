// Valores canónicos de tiempo de juego compartidos por backend y frontend.
// Mantén aquí centralizados todos los umbrales de turno/AFK para evitar desajustes.

export const GAME_TIMING = {
  TURN_TIMEOUT_MS: 60_000,
  TURN_TIMEOUT_GRACE_MS: 1_000,
  AFK_TIMEOUT_MS: 120_000,
  OPPONENT_FORCE_TIMEOUT_BUFFER_SECONDS: 5,
  /**
   * Período de gracia después del beacon de "going-away" antes de marcar al jugador como AFK.
   * Cuando la página pasa a oculto (navegador móvil en segundo plano/cerrado), este beacon
   * retrocede `last_action_at` para que `removeInactivePlayers` dispare después de
   * DISCONNECT_GRACE_MS en lugar de esperar todo AFK_TIMEOUT_MS.
   * Debe ser menor que AFK_TIMEOUT_MS.
   */
  DISCONNECT_GRACE_MS: 45_000,
  /**
   * Período de gracia para beacons de "going-away" en el lobby (sala de espera).
   * Cuando un usuario móvil deja la app en segundo plano estando en el lobby,
   * `last_action_at` se retrocede para expulsarlo tras LOBBY_DISCONNECT_GRACE_MS
   * en lugar de esperar todo WAITING_PLAYER_TIMEOUT_MS (5 min).
   * Debe ser menor que WAITING_PLAYER_TIMEOUT_MS (300 000 ms).
   */
  LOBBY_DISCONNECT_GRACE_MS: 60_000,
} as const;

export const GAME_TIMING_SECONDS = {
  TURN_TIMEOUT: Math.floor(GAME_TIMING.TURN_TIMEOUT_MS / 1000),
  AFK_TIMEOUT: Math.floor(GAME_TIMING.AFK_TIMEOUT_MS / 1000),
  OPPONENT_FORCE_TIMEOUT:
    Math.floor(GAME_TIMING.TURN_TIMEOUT_MS / 1000) + GAME_TIMING.OPPONENT_FORCE_TIMEOUT_BUFFER_SECONDS,
} as const;
