import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── Getters diferidos: se validan en runtime (no en la inicialización del módulo) ──
// Esto permite que `next build` funcione sin .env.local configurado.
// En producción los errores se lanzan en la primera llamada a las funciones.

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('[JWT] JWT_SECRET no está configurado. Añádelo a .env.local');
  return secret;
};

const getJwtRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('[JWT] JWT_REFRESH_SECRET no está configurado. Añádelo a .env.local');
  return secret;
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}

export interface RefreshTokenPayload extends JWTPayload {
  /** JWT ID único para lista de permitidos en BD — evita reutilización de tokens robados */
  jti: string;
}

// ── Token generation ───────────────────────────────────────────────────────────

/**
 * Access token de 30 minutos.
 * Extendido desde 15 min para evitar expiración durante una partida activa.
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30m' });
};

/**
 * Token de actualización de 7 días con jti único para lista de permitidos en BD.
 * Usa crypto.randomUUID() — no Math.random().
 */
export const generateRefreshToken = (
  payload: JWTPayload
): { token: string; jti: string } => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti }, getJwtRefreshSecret(), { expiresIn: '7d' });
  return { token, jti };
};

// ── Token verification ─────────────────────────────────────────────────────────

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, getJwtRefreshSecret()) as RefreshTokenPayload;
  } catch {
    return null;
  }
};

/**
 * Retorna los segundos que faltan para que el token expire.
 * Retorna negativo si ya expiró.
 */
export const tokenSecondsRemaining = (token: string): number => {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return -1;
    return decoded.exp - Math.floor(Date.now() / 1000);
  } catch {
    return -1;
  }
};
