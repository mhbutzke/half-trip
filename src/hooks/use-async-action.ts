import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface AsyncActionState {
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
}

interface AsyncActionOptions {
  onSuccess?: (data?: unknown) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export function useAsyncAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: AsyncActionOptions = {}
) {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage = 'Ocorreu um erro. Tente novamente.',
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  const [state, setState] = useState<AsyncActionState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      setState({ isLoading: true, error: null, isSuccess: false });

      try {
        const result = await action(...args);

        setState({ isLoading: false, error: null, isSuccess: true });

        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        setState({ isLoading: false, error: err, isSuccess: false });

        if (showErrorToast) {
          toast.error(errorMessage);
        }

        if (onError) {
          onError(err);
        }

        return null;
      }
    },
    [action, onSuccess, onError, successMessage, errorMessage, showSuccessToast, showErrorToast]
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, isSuccess: false });
  }, []);

  return {
    execute,
    reset,
    ...state,
  };
}
