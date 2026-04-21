import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { isTransientNetworkError, summarizeUnknownError } from './network-errors';

const SALT_ROUNDS = 12;
const TOKEN_CLEANUP_MIN_INTERVAL_MS = 5 * 60 * 1000;

let lastTokenCleanupAttemptAt = 0;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ---------------------------------------------------------------------------
// Email Encryption & Hashing
// ---------------------------------------------------------------------------
const IV_LENGTH = 16;

const getNormalizedEncryptionKey = (rawKey?: string | null): string | null => {
  if (!rawKey) return null;
  if (rawKey.length === 32) return rawKey;
  return crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 32);
};

const getEncryptionKeyCandidates = (): string[] => {
  const uniqueKeys = new Set<string>();
  const rawCandidates = [
    process.env.APP_ENCRYPTION_KEY,
    process.env.DB_ENCRYPTION_KEY,
    process.env.LEGACY_APP_ENCRYPTION_KEY,
  ];

  for (const candidate of rawCandidates) {
    const normalized = getNormalizedEncryptionKey(candidate);
    if (normalized) {
      uniqueKeys.add(normalized);
    }
  }

  return Array.from(uniqueKeys);
};

const getPrimaryEncryptionKey = (): string => {
  const primaryRaw = process.env.APP_ENCRYPTION_KEY ?? process.env.DB_ENCRYPTION_KEY;
  const normalized = getNormalizedEncryptionKey(primaryRaw);

  if (normalized) {
    return normalized;
  }

  throw new Error('[Security] APP_ENCRYPTION_KEY o DB_ENCRYPTION_KEY es requerido.');
};

export const hashEmail = (email: string): string => {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
};

export const encryptEmail = (email: string): string => {
  const encryptionKey = getPrimaryEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'utf-8'), iv);
  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decryptEmail = (encryptedStr: string): string => {
  if (!encryptedStr) return '';
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) return encryptedStr; // respaldo para unencrypted datos

  const [ivHex, authTagHex, encryptedHex] = parts;
  for (const key of getEncryptionKeyCandidates()) {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'utf-8'),
        Buffer.from(ivHex, 'hex')
      );
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      continue;
    }
  }

  // respaldo silencioso para usuarios creados por scripts legacy o con una clave diferente.
  return encryptedStr;
};


// ---------------------------------------------------------------------------
// distribuido tasa limitación (DB) con en memoria respaldo.
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimitInMemory = (
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) return false;

  record.count++;
  return true;
};

export const checkRateLimit = async (
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): Promise<boolean> => {
  if (!identifier || maxRequests <= 0 || windowMs <= 0) {
    return false;
  }

  try {
    const { getServiceSupabase } = await import('./supabase');
    const supabaseAdmin = getServiceSupabase();

    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_max_requests: maxRequests,
      p_window_ms: windowMs,
    });

    if (!error && typeof data === 'boolean') {
      return data;
    }

    if (error) {
      console.warn(
        '[Security] Falling back to in-memory rate limit due to DB RPC error:',
        summarizeUnknownError(error)
      );
    }
  } catch (error) {
    console.warn(
      '[Security] Falling back to in-memory rate limit due to unexpected error:',
      summarizeUnknownError(error)
    );
  }

  return checkRateLimitInMemory(identifier, maxRequests, windowMs);
};

// ---------------------------------------------------------------------------
// Verificar hCaptcha (llamada a API externa)
// ---------------------------------------------------------------------------
export const verifyHCaptcha = async (token: string): Promise<boolean> => {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn('[hCaptcha] HCAPTCHA_SECRET_KEY no configurada — saltando verificación en dev');
    return process.env.NODE_ENV !== 'production';
  }
  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `response=${token}&secret=${secret}`,
    });
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Generar ID de juego con crypto — sin Math.aleatorio()
// ---------------------------------------------------------------------------
export const generateGameId = (): string => {
  return `game_${crypto.randomUUID()}`;
};

// ---------------------------------------------------------------------------
// seguridad limpieza automatización
// ---------------------------------------------------------------------------
export const cleanupExpiredTokens = async (): Promise<void> => {
  const now = Date.now();
  if (now - lastTokenCleanupAttemptAt < TOKEN_CLEANUP_MIN_INTERVAL_MS) {
    return;
  }
  lastTokenCleanupAttemptAt = now;

  const { getServiceSupabase } = await import('./supabase');
  const supabaseAdmin = getServiceSupabase();

  try {
    const { error } = await supabaseAdmin.rpc('cleanup_expired_tokens');
    if (!error) return;

    if (isTransientNetworkError(error)) {
      console.warn(
        '[Security] Token cleanup skipped due to transient network issue:',
        summarizeUnknownError(error)
      );
      return;
    }

    console.error('[Security] Error cleaning up tokens:', error);
  } catch (e) {
    if (isTransientNetworkError(e)) {
      console.warn(
        '[Security] Token cleanup skipped due to transient network issue:',
        summarizeUnknownError(e)
      );
      return;
    }

    console.error('[Security] Unexpected error during token cleanup:', e);
  }
};

// Función `sanitizeInput` movida a validation.ts — re-exportamos por compatibilidad
export { sanitizeInput } from './validation';
