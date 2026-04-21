/**
 * Error Handling Pattern implementation para Parkeando.
 * resultado types para explicit error handling, providing functional y type-safe
 * responses para APIs, actions, y services without silent failures.
 */

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Standard Application Error
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    // Mantiene el rastro estándar de la cadena de prototipos de V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, "NOT_FOUND", 404, { resource, id });
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", 503);
  }
}

export function normalizeNetworkErrorMessage(error: unknown): string {
  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : "";

  if (!rawMessage) {
    return "No se pudo conectar con el servidor. Verifica tu conexion e intentalo nuevamente.";
  }

  const lowerMessage = rawMessage.toLowerCase();
  const looksLikeFetchFailure =
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("load failed") ||
    lowerMessage.includes("fetch");

  if (looksLikeFetchFailure) {
    return "No se pudo conectar con el servidor. Verifica tu conexion e intentalo nuevamente.";
  }

  return rawMessage;
}

/**
 * Wraps async calls into a safe resultado tuple
 */
export async function safeFetch<T>(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Result<T, ApplicationError>> {
    try {
        const response = await fetch(input, init);
        if (!response.ok) {
            let serverErrorMsg = `HTTP ${response.status}`;
            try {
                const data = await response.json();
                serverErrorMsg = data.error || serverErrorMsg;
            } catch {}
            
            return Err(new ApplicationError(serverErrorMsg, "FETCH_ERROR", response.status));
        }
        const data = await response.json();
        return Ok(data as T);
    } catch (e: unknown) {
      return Err(new NetworkError(normalizeNetworkErrorMessage(e)));
    }
}
