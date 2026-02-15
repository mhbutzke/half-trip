'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  triggerOnce?: boolean;
  threshold?: number;
}

/**
 * FadeIn Component
 *
 * Animates children with fade-in effect when they enter the viewport.
 * Uses Intersection Observer for performance.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 500,
  direction = 'up',
  triggerOnce = true,
  threshold = 0.1,
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [triggerOnce, threshold]);

  const getTransform = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up':
          return 'translateY(20px)';
        case 'down':
          return 'translateY(-20px)';
        case 'left':
          return 'translateX(20px)';
        case 'right':
          return 'translateX(-20px)';
        default:
          return 'none';
      }
    }
    return 'none';
  };

  return (
    <div
      ref={ref}
      className={cn('transition-all', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stagger children animations
 */
interface FadeInStaggerProps {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeInStagger({
  children,
  className,
  staggerDelay = 100,
  direction = 'up',
}: FadeInStaggerProps) {
  return (
    <>
      {children.map((child, index) => (
        <FadeIn
          key={index}
          delay={index * staggerDelay}
          direction={direction}
          className={className}
        >
          {child}
        </FadeIn>
      ))}
    </>
  );
}
