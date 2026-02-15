/**
 * Animation Constants
 * 
 * Centralized animation timings and easings for consistency across the app.
 * Use these values instead of hardcoding durations and easings.
 */

export const ANIMATION = {
  /**
   * Duration constants (in milliseconds)
   */
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
  },

  /**
   * Easing functions for smooth animations
   */
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /**
   * Common transition classes for Tailwind
   */
  transition: {
    all: 'transition-all duration-300 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
    transform: 'transition-transform duration-300 ease-out',
    opacity: 'transition-opacity duration-200 ease-in-out',
    smooth: 'transition-all duration-500 ease-spring',
  },

  /**
   * Fade in/out variants
   */
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  /**
   * Slide variants
   */
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },

  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },

  /**
   * Scale variants
   */
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  /**
   * Stagger children animation
   */
  stagger: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.1,
        },
      },
    },
    item: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
  },
} as const;

/**
 * CSS custom properties for animations
 * Can be used in CSS/Tailwind for consistent timing
 */
export const ANIMATION_CSS_VARS = {
  '--animation-fast': `${ANIMATION.duration.fast}ms`,
  '--animation-normal': `${ANIMATION.duration.normal}ms`,
  '--animation-slow': `${ANIMATION.duration.slow}ms`,
  '--easing-in': ANIMATION.easing.easeIn,
  '--easing-out': ANIMATION.easing.easeOut,
  '--easing-in-out': ANIMATION.easing.easeInOut,
} as const;
