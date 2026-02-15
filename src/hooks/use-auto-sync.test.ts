import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSync } from './use-auto-sync';

const { processQueueMock, getPendingCountMock } = vi.hoisted(() => ({
  processQueueMock: vi.fn(),
  getPendingCountMock: vi.fn(),
}));

vi.mock('./use-online-status', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('@/lib/sync', () => ({
  syncEngine: {
    processQueue: processQueueMock,
    getPendingCount: getPendingCountMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/notifications', () => ({
  notifications: {
    syncCompleted: vi.fn(),
    syncFailed: vi.fn(),
  },
}));

vi.mock('@/lib/errors/logger', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
}));

describe('useAutoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPendingCountMock.mockResolvedValue(0);
  });

  it('prevents concurrent queue processing across multiple hook instances', async () => {
    const resolvers: Array<() => void> = [];
    processQueueMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(() =>
            resolve({
              success: true,
              processedCount: 0,
              errorCount: 0,
              errors: [],
            })
          );
        })
    );

    const hookA = renderHook(() => useAutoSync({ enabled: true, syncOnMount: false }));
    const hookB = renderHook(() => useAutoSync({ enabled: true, syncOnMount: false }));

    let promiseA: Promise<void>;
    let promiseB: Promise<void>;

    act(() => {
      promiseA = hookA.result.current.sync();
      promiseB = hookB.result.current.sync();
    });

    expect(processQueueMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvers.forEach((resolve) => resolve());
      await Promise.all([promiseA!, promiseB!]);
    });
  });
});
