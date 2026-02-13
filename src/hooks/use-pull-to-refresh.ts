'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // px to pull before triggering (default: 80)
  maxPull?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isRefreshing: boolean;
  pullDistance: number;
  pulling: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 140,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for prefers-reduced-motion
  const prefersReducedMotionRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = false;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      const deltaY = e.touches[0].clientY - startYRef.current;
      const deltaX = e.touches[0].clientX - startXRef.current;

      // Only start pulling if vertical movement > horizontal (avoid interfering with swipes)
      if (!isPullingRef.current && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isPullingRef.current = true;
        setPulling(true);
      }

      if (!isPullingRef.current) return;

      // Damped pull: halve the distance after threshold
      const damped = deltaY > threshold ? threshold + (deltaY - threshold) * 0.4 : deltaY;
      setPullDistance(Math.min(Math.max(0, damped), maxPull));
    },
    [disabled, isRefreshing, threshold, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && !disabled) {
      setIsRefreshing(true);
      // When reduced motion is preferred, snap immediately
      if (prefersReducedMotionRef.current) {
        setPullDistance(threshold);
      } else {
        setPullDistance(threshold);
      }
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, threshold, disabled, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const el = containerRef.current ?? document;
    el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', handleTouchEnd as EventListener);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchmove', handleTouchMove as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pulling, pullDistance, isRefreshing };
}
