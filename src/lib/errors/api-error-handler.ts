import { PostgrestError } from '@supabase/supabase-js';
import { ERROR_MESSAGES, isNetworkError } from './error-messages';
import { logError } from './logger';

/**
 * Standard API error response
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: string;
  statusCode?: number;
}

/**
 * Handle errors from Supabase/API calls and convert to user-friendly messages
 */
export function handleApiError(error: unknown): ApiError {
  logError(error, { action: 'api-error' });

  // Network errors
  if (isNetworkError(error)) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
    };
  }

  // Supabase PostgrestError
  if (isPostgrestError(error)) {
    return handlePostgrestError(error);
  }

  // Standard Error object
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.includes('Invalid login credentials')) {
      return {
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        code: 'INVALID_CREDENTIALS',
      };
    }

    if (error.message.includes('Email not confirmed')) {
      return {
        message: ERROR_MESSAGES.EMAIL_NOT_CONFIRMED,
        code: 'EMAIL_NOT_CONFIRMED',
      };
    }

    if (error.message.includes('User not found')) {
      return {
        message: ERROR_MESSAGES.USER_NOT_FOUND,
        code: 'USER_NOT_FOUND',
      };
    }

    if (error.message.includes('not authorized') || error.message.includes('unauthorized')) {
      return {
        message: ERROR_MESSAGES.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
      };
    }

    if (error.message.includes('session')) {
      return {
        message: ERROR_MESSAGES.SESSION_EXPIRED,
        code: 'SESSION_EXPIRED',
      };
    }

    // Return the error message if it's user-friendly
    return {
      message: error.message,
      code: 'ERROR',
    };
  }

  // Unknown error
  return {
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Type guard for PostgrestError
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Handle Supabase PostgrestError specifically
 */
function handlePostgrestError(error: PostgrestError): ApiError {
  // Map common Postgres error codes to user-friendly messages
  switch (error.code) {
    case '23505': // unique_violation
      return {
        message: ERROR_MESSAGES.DUPLICATE_ENTRY,
        code: 'DUPLICATE_ENTRY',
        details: error.details,
      };

    case '23503': // foreign_key_violation
      return {
        message: ERROR_MESSAGES.FOREIGN_KEY_VIOLATION,
        code: 'FOREIGN_KEY_VIOLATION',
        details: error.details,
      };

    case 'PGRST116': // not found
      return {
        message: ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND',
      };

    case '42501': // insufficient_privilege
    case 'PGRST301': // RLS policy violation
      return {
        message: ERROR_MESSAGES.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
      };

    default:
      return {
        message: error.message || ERROR_MESSAGES.SERVER_ERROR,
        code: error.code,
        details: error.details,
      };
  }
}

/**
 * Format API error for toast notifications
 */
export function formatErrorForToast(error: unknown): string {
  const apiError = handleApiError(error);
  return apiError.message;
}

/**
 * Check if error should be retried
 */
export function shouldRetryError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return true;
  }

  if (isPostgrestError(error)) {
    // Don't retry validation or permission errors
    return !['23505', '23503', '42501', 'PGRST301'].includes(error.code);
  }

  return false;
}
