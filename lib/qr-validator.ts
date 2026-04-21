/**
 * QR Validator - Validación de códigos QR con formato específico
 * Formato: PARKEANDO:{cellNumber}:{hasQuestion}:{hmac}
 *
 * Usa HMAC-SHA256 con QR_SECRET del entorno.
 * NO tiene respaldo — si QR_SECRET no está configurado el servidor lanza error.
 */

import crypto from 'crypto';

// Formato del QR: PARKEANDO:{cellNumber}:{hasQuestion}:{hmac-hex-64}
const QR_REGEX = /^PARKEANDO:(\d+):(true|false):([a-f0-9]{64})$/i;
const QR_MAX_LENGTH = 120; // Longitud máxima para prevenir DoS
const QR_MIN_CELL = 1;
const QR_MAX_CELL = 120; // Tablero 0-120 (se escanean posiciones 1-120)

function getQRSecret(): string {
  const secret = process.env.QR_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      '[QR Validator] La variable de entorno QR_SECRET no está configurada. ' +
      'Añádela a .env.local antes de ejecutar el servidor.'
    );
  }
  return secret;
}

export interface QRData {
  cellNumber: number;
  hasQuestion: boolean;
  hash: string;
  isValid: boolean;
}

/**
 * Generar HMAC-SHA256 para validación de QR.
 * El secreto siempre viene del entorno — nunca hardcodeado.
 */
export function generateQRHash(
  cellNumber: number,
  hasQuestion: boolean,
  secret?: string
): string {
  const key = secret ?? getQRSecret();
  const data = `${cellNumber}:${hasQuestion}`;
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Generar código QR completo
 */
export function generateQRCode(
  cellNumber: number,
  hasQuestion: boolean
): string {
  const hash = generateQRHash(cellNumber, hasQuestion);
  return `PARKEANDO:${cellNumber}:${hasQuestion}:${hash}`;
}

/**
 * Parsear código QR
 */
export function parseQRCode(qrCode: string): QRData | null {
  // Guardia: longitud máxima para prevenir DoS
  if (!qrCode || qrCode.length > QR_MAX_LENGTH) {
    return null;
  }

  // Sanitizar entrada (solo mayúsculas, sin espacios)
  const sanitized = qrCode.trim().toUpperCase();

  // Validar que solo contiene caracteres esperados antes del regex
  if (!/^[A-Z0-9:]+$/.test(sanitized)) {
    return null;
  }

  // Validar formato con regex
  const match = sanitized.match(QR_REGEX);
  if (!match) {
    return null;
  }

  const [, cellNumberStr, hasQuestionStr, hash] = match;
  const cellNumber = parseInt(cellNumberStr, 10);
  const hasQuestion = hasQuestionStr === 'TRUE';

  // Validar rango de casilla
  if (cellNumber < QR_MIN_CELL || cellNumber > QR_MAX_CELL) {
    return null;
  }

  return {
    cellNumber,
    hasQuestion,
    hash: hash.toLowerCase(), // Normalizar para comparación
    isValid: false, // Se validará después
  };
}

/**
 * Validar código QR completo
 */
export function validateQRCode(qrCode: string): QRData | null {
  const parsed = parseQRCode(qrCode);
  if (!parsed) return null;

  // Generar hash esperado
  const expectedHash = generateQRHash(parsed.cellNumber, parsed.hasQuestion);

  // Comparar hashes de forma segura (timing-safe)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(parsed.hash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );

  return {
    ...parsed,
    isValid,
  };
}

/**
 * Validar que el QR corresponde a la posición esperada
 */
export function validateQRPosition(
  qrCode: string,
  expectedPosition: number
): {
  valid: boolean;
  error?: string;
  data?: QRData;
} {
  // Validar formato y hash
  const qrData = validateQRCode(qrCode);

  if (!qrData) {
    return {
      valid: false,
      error: 'Código QR inválido o corrupto',
    };
  }

  if (!qrData.isValid) {
    return {
      valid: false,
      error: 'Código QR no auténtico',
    };
  }

  // Validar que corresponde a la posición esperada
  if (qrData.cellNumber !== expectedPosition) {
    return {
      valid: false,
      error: `Este QR es de la casilla ${qrData.cellNumber}, pero debes estar en la casilla ${expectedPosition}`,
      data: qrData,
    };
  }

  return {
    valid: true,
    data: qrData,
  };
}

/**
 * Generar todos los QR codes para el juego
 */
export function generateAllQRCodes(): Array<{
  cellNumber: number;
  hasQuestion: boolean;
  qrCode: string;
}> {
  // Importa dinámicamente casillas con cartas desde game-cards
  let cellsWithCards: number[];
  try {
    const { GAME_CARDS } = require('@/data/game-cards');
    const positions = GAME_CARDS.map((c: any) => Number(c.cellPosition));
    cellsWithCards = Array.from(new Set<number>(positions));
  } catch {
    // Respaldo: las casillas jugables con carta son 1..QR_MAX_CELL
    cellsWithCards = Array.from({ length: QR_MAX_CELL }, (_, i) => i + 1);
  }

  const qrCodes: Array<{
    cellNumber: number;
    hasQuestion: boolean;
    qrCode: string;
  }> = [];

  for (let i = QR_MIN_CELL; i <= QR_MAX_CELL; i++) {
    const hasQuestion = cellsWithCards.includes(i);
    const qrCode = generateQRCode(i, hasQuestion);

    qrCodes.push({
      cellNumber: i,
      hasQuestion,
      qrCode,
    });
  }

  return qrCodes;
}

/**
 * Sanitizar entrada de QR (prevenir inyecciones)
 */
export function sanitizeQRInput(input: string): string {
  // Solo recorta espacios — el regex en QR_REGEX ya impone el formato estricto
  return input.trim().substring(0, 120);
}

/**
 * Validar que el jugador puede escanear (no ha escaneado recientemente)
 */
export function canScanQR(lastScanTime: Date | null): {
  canScan: boolean;
  waitTime?: number;
} {
  if (!lastScanTime) {
    return { canScan: true };
  }

  const now = Date.now();
  const lastScan = lastScanTime.getTime();
  const timeSinceLastScan = now - lastScan;
  const minTimeBetweenScans = 3000; // 3 segundos

  if (timeSinceLastScan < minTimeBetweenScans) {
    return {
      canScan: false,
      waitTime: Math.ceil((minTimeBetweenScans - timeSinceLastScan) / 1000),
    };
  }

  return { canScan: true };
}

/**
 * Logging de intentos de escaneo (para detectar fraude)
 */
export interface ScanAttempt {
  userId: string;
  qrCode: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

const scanAttempts: ScanAttempt[] = [];

export function logScanAttempt(attempt: ScanAttempt): void {
  scanAttempts.push(attempt);

  // Mantener solo los últimos 1000 intentos
  if (scanAttempts.length > 1000) {
    scanAttempts.shift();
  }
}

/**
 * Detectar intentos sospechosos de escaneo
 */
export function detectSuspiciousActivity(userId: string): {
  suspicious: boolean;
  reason?: string;
} {
  const userAttempts = scanAttempts.filter((a) => a.userId === userId);

  // Verificar intentos en los últimos 60 segundos
  const now = Date.now();
  const recentAttempts = userAttempts.filter(
    (a) => now - a.timestamp.getTime() < 60000
  );

  // Más de 10 intentos en 1 minuto es sospechoso
  if (recentAttempts.length > 10) {
    return {
      suspicious: true,
      reason: 'Demasiados intentos de escaneo en poco tiempo',
    };
  }

  // Más de 5 intentos fallidos consecutivos
  const lastFive = userAttempts.slice(-5);
  if (lastFive.length === 5 && lastFive.every((a) => !a.success)) {
    return {
      suspicious: true,
      reason: 'Múltiples intentos fallidos consecutivos',
    };
  }

  return { suspicious: false };
}
