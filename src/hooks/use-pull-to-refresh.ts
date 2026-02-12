'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (refreshing) return;
      const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = false;
    },
    [refreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (refreshing) return;
      const deltaY = e.touches[0].clientY - startYRef.current;
      const deltaX = e.touches[0].clientX - startXRef.current;

      // Only start pulling if vertical > horizontal
      if (!isPullingRef.current && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isPullingRef.current = true;
        setPulling(true);
      }

      if (!isPullingRef.current) return;

      // Damped pull: halve the distance after threshold
      const damped = deltaY > threshold ? threshold + (deltaY - threshold) * 0.4 : deltaY;
      setPullDistance(Math.min(Math.max(0, damped), maxPull));
    },
    [refreshing, threshold, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }

    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const el = containerRef.current ?? document;
    el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', handleTouchEnd as EventListener);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchmove', handleTouchMove as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pulling, pullDistance, refreshing };
}
