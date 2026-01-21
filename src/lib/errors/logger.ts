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

/**
 * Log an error with context
 */
export function logError(error: unknown, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('[Error]', {
    timestamp,
    message: errorMessage,
    stack: errorStack,
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
