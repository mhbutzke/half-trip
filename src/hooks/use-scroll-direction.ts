'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = currentScrollY - lastScrollY.current;

          // Asymmetric: easy to show (2px up), harder to hide (threshold down)
          const effectiveThreshold = diff < 0 ? 2 : threshold;

          if (Math.abs(diff) > effectiveThreshold) {
            setDirection(diff > 0 ? 'down' : 'up');
            lastScrollY.current = currentScrollY;
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return direction;
}
