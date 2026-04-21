const TRANSIENT_NETWORK_ERROR_MARKERS = [
  'fetch failed',
  'connect timeout',
  'und_err_connect_timeout',
  'econnreset',
  'etimedout',
  'eai_again',
  'enotfound',
  'networkerror',
  'socket hang up',
  'aborterror',
  'connection reset',
];

const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
};

export const summarizeUnknownError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const record = asRecord(error);
  if (!record) {
    return typeof error === 'string' ? error : 'unknown_error';
  }

  const message = readString(record.message);
  const details = readString(record.details);
  const hint = readString(record.hint);
  const code = readString(record.code);

  const parts = [message, details, hint, code].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : 'unknown_error';
};

export const isTransientNetworkError = (error: unknown): boolean => {
  const normalized = summarizeUnknownError(error).toLowerCase();
  return TRANSIENT_NETWORK_ERROR_MARKERS.some((marker) => normalized.includes(marker));
};
