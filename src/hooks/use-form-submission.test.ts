import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormSubmission } from './use-form-submission';

// Mock the sonner toast module
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import the mocked toast so we can assert on it
import { toast } from 'sonner';

const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFormSubmission', () => {
  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe('initial state', () => {
    it('isSubmitting is false initially', () => {
      const submitFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      expect(result.current.isSubmitting).toBe(false);
    });

    it('returns handleSubmit function', () => {
      const submitFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      expect(typeof result.current.handleSubmit).toBe('function');
    });
  });

  // ---------------------------------------------------------------------------
  // Successful submission
  // ---------------------------------------------------------------------------
  describe('successful submission', () => {
    it('calls submitFn with the provided data', async () => {
      const submitFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, { successMessage: 'Salvo!' })
      );

      await act(async () => {
        await result.current.handleSubmit({ name: 'Test' });
      });

      expect(submitFn).toHaveBeenCalledWith({ name: 'Test' });
    });

    it('shows success toast with successMessage', async () => {
      const submitFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, { successMessage: 'Despesa criada!' })
      );

      await act(async () => {
        await result.current.handleSubmit({ amount: 100 });
      });

      expect(mockedToastSuccess).toHaveBeenCalledWith('Despesa criada!');
    });

    it('calls onSuccess with the result', async () => {
      const resultData = { id: '123', error: null };
      const submitFn = vi.fn().mockResolvedValue(resultData);
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({ amount: 100 });
      });

      expect(onSuccess).toHaveBeenCalledWith(resultData);
    });

    it('calls closeDialog on success', async () => {
      const submitFn = vi.fn().mockResolvedValue({});
      const closeDialog = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          closeDialog,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(closeDialog).toHaveBeenCalledTimes(1);
    });

    it('calls resetForm on success', async () => {
      const submitFn = vi.fn().mockResolvedValue({});
      const resetForm = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          resetForm,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(resetForm).toHaveBeenCalledTimes(1);
    });

    it('sets isSubmitting to false after completion', async () => {
      const submitFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  describe('loading state', () => {
    it('sets isSubmitting to true during submission', async () => {
      let resolveSubmit: (value: Record<string, unknown>) => void;
      const submitFn = vi.fn(
        () =>
          new Promise<Record<string, unknown>>((resolve) => {
            resolveSubmit = resolve;
          })
      );
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      // Start submission but don't await
      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.handleSubmit({});
      });

      // isSubmitting should be true while pending
      expect(result.current.isSubmitting).toBe(true);

      // Resolve and finish
      await act(async () => {
        resolveSubmit!({});
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Error from submitFn result
  // ---------------------------------------------------------------------------
  describe('error from submitFn result', () => {
    it('shows error toast when result contains error', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: 'Despesa duplicada' });
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(mockedToastError).toHaveBeenCalledWith('Despesa duplicada');
    });

    it('does NOT show success toast on error result', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: 'Falha' });
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(mockedToastSuccess).not.toHaveBeenCalled();
    });

    it('does NOT call onSuccess on error result', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: 'Falha' });
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('calls onError callback with the error string', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: 'Valor inválido' });
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          onError,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(onError).toHaveBeenCalledWith('Valor inválido');
    });

    it('does NOT call closeDialog on error result', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: 'Falha' });
      const closeDialog = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          closeDialog,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(closeDialog).not.toHaveBeenCalled();
    });

    it('does NOT call resetForm on error result', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: 'Falha' });
      const resetForm = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          resetForm,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(resetForm).not.toHaveBeenCalled();
    });

    it('sets isSubmitting to false after error result', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: 'Falha' });
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Exception handling
  // ---------------------------------------------------------------------------
  describe('exception handling', () => {
    it('shows generic error toast when submitFn throws', async () => {
      const submitFn = vi.fn().mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(mockedToastError).toHaveBeenCalledWith('Erro inesperado. Tente novamente.');
    });

    it('shows custom errorMessage when provided and submitFn throws', async () => {
      const submitFn = vi.fn().mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          errorMessage: 'Falha na conexão',
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(mockedToastError).toHaveBeenCalledWith('Falha na conexão');
    });

    it('does NOT call onSuccess when exception occurs', async () => {
      const submitFn = vi.fn().mockRejectedValue(new Error('Boom'));
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('sets isSubmitting to false after exception', async () => {
      const submitFn = vi.fn().mockRejectedValue(new Error('Crash'));
      const { result } = renderHook(() => useFormSubmission(submitFn, { successMessage: 'OK' }));

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Result with null error (success)
  // ---------------------------------------------------------------------------
  describe('result with null error', () => {
    it('treats result.error = null as success', async () => {
      const submitFn = vi.fn().mockResolvedValue({ error: null, id: 'abc' });
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'Criado!',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handleSubmit({});
      });

      expect(mockedToastSuccess).toHaveBeenCalledWith('Criado!');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple submissions
  // ---------------------------------------------------------------------------
  describe('multiple submissions', () => {
    it('can handle consecutive submissions', async () => {
      let callCount = 0;
      const submitFn = vi.fn(async () => {
        callCount++;
        if (callCount === 1) return { error: 'First fails' };
        return { error: null };
      });
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useFormSubmission(submitFn, {
          successMessage: 'OK',
          onSuccess,
        })
      );

      // First call fails
      await act(async () => {
        await result.current.handleSubmit({ attempt: 1 });
      });

      expect(mockedToastError).toHaveBeenCalledWith('First fails');
      expect(onSuccess).not.toHaveBeenCalled();

      // Second call succeeds
      await act(async () => {
        await result.current.handleSubmit({ attempt: 2 });
      });

      expect(mockedToastSuccess).toHaveBeenCalledWith('OK');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
