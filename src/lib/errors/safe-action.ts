import { handleApiError, ApiError } from './api-error-handler';

/**
 * Result type for safe actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

/**
 * Wrap an async server action with error handling
 * Catches errors and returns a standardized result
 */
export async function safeAction<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    const apiError = handleApiError(error);
    return { success: false, error: apiError };
  }
}

/**
 * Assert that an action result is successful
 * Throws the error if not successful
 */
export function assertSuccess<T>(result: ActionResult<T>): T {
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * Unwrap an action result, returning null on error
 */
export function unwrapResult<T>(result: ActionResult<T>): T | null {
  return result.success ? result.data : null;
}
