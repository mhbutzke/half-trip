'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface SubmitOptions<TResult> {
  successMessage: string;
  errorMessage?: string;
  onSuccess?: (result: TResult) => void;
  onError?: (error: string) => void;
  resetForm?: () => void;
  closeDialog?: () => void;
}

export function useFormSubmission<TData, TResult extends { error?: string | null }>(
  submitFn: (data: TData) => Promise<TResult>,
  options: SubmitOptions<TResult>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (data: TData) => {
      setIsSubmitting(true);
      try {
        const result = await submitFn(data);
        if (result.error) {
          toast.error(result.error);
          options.onError?.(result.error);
          return;
        }
        toast.success(options.successMessage);
        options.closeDialog?.();
        options.resetForm?.();
        options.onSuccess?.(result);
      } catch {
        toast.error(options.errorMessage ?? 'Erro inesperado. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [submitFn, options]
  );

  return { isSubmitting, handleSubmit };
}
