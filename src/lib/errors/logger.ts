/**
 * Error logging system
 * Currently logs to console, can be extended to send to external services
 * (e.g., Sentry, LogRocket, etc.)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  tripId?: string;
  action?: string;
  [key: string]: unknown;
}

interface ParsedError {
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function serializeUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function parseError(error: unknown): ParsedError {
  if (error instanceof Error) {
    const details: Record<string, unknown> = {
      name: error.name,
    };
    const errorWithCause = error as Error & { cause?: unknown };
    if (errorWithCause.cause !== undefined) {
      details.cause = serializeUnknown(errorWithCause.cause);
    }

    return {
      message: error.message || error.name,
      stack: error.stack,
      details,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (isRecord(error)) {
    const details: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(error)) {
      if (key === 'message' || key === 'stack') continue;
      details[key] = serializeUnknown(value);
    }

    const message =
      typeof error.message === 'string' && error.message.trim().length > 0
        ? error.message
        : typeof error.error === 'string' && error.error.trim().length > 0
          ? error.error
          : 'Unknown error object';
    const stack = typeof error.stack === 'string' ? error.stack : undefined;

    return {
      message,
      stack,
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Log an error with context
 */
export function logError(error: unknown, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const parsedError = parseError(error);

  console.error(`[Error] ${parsedError.message}`, {
    timestamp,
    message: parsedError.message,
    stack: parsedError.stack,
    error: parsedError.details,
    context,
  });

  // In production, you would send this to an error tracking service
  // Example: Sentry.captureException(error, { contexts: { custom: context } })
}

/**
 * Log a warning with context
 */
export function logWarning(message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();

  console.warn('[Warning]', {
    timestamp,
    message,
    context,
  });
}

/**
 * Log an info message with context
 */
export function logInfo(message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();

  console.info('[Info]', {
    timestamp,
    message,
    context,
  });
}

/**
 * Log a debug message with context (only in development)
 */
export function logDebug(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();

    console.debug('[Debug]', {
      timestamp,
      message,
      context,
    });
  }
}

/**
 * Generic log function
 */
export function log(level: LogLevel, message: string, context?: LogContext): void {
  switch (level) {
    case 'debug':
      logDebug(message, context);
      break;
    case 'info':
      logInfo(message, context);
      break;
    case 'warn':
      logWarning(message, context);
      break;
    case 'error':
      logError(message, context);
      break;
  }
}

/**
 * Log action start
 */
export function logActionStart(action: string, context?: LogContext): void {
  logDebug(`Starting: ${action}`, context);
}

/**
 * Log action success
 */
export function logActionSuccess(action: string, context?: LogContext): void {
  logDebug(`Success: ${action}`, context);
}

/**
 * Log action failure
 */
export function logActionFailure(action: string, error: unknown, context?: LogContext): void {
  logError(error, { ...context, action });
}
