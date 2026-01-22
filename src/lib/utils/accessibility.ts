/**
 * Accessibility Utilities
 *
 * Helper functions for managing ARIA attributes and accessibility features
 */

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix = 'a11y'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Format screen reader announcements
 */
export function formatAnnouncement(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): {
  message: string;
  'aria-live': 'polite' | 'assertive';
  'aria-atomic': 'true';
} {
  return {
    message,
    'aria-live': priority,
    'aria-atomic': 'true',
  };
}

/**
 * Get proper aria-label for external links
 */
export function getExternalLinkLabel(linkText: string): string {
  return `${linkText} (abre em nova aba)`;
}

/**
 * Get proper aria-label for file size
 */
export function getFileSizeLabel(bytes: number): string {
  const kb = bytes / 1024;
  const mb = kb / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)} megabytes`;
  }
  if (kb >= 1) {
    return `${kb.toFixed(0)} kilobytes`;
  }
  return `${bytes} bytes`;
}

/**
 * Get proper aria-label for count with Portuguese pluralization
 */
export function getCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Common aria-hidden prop for decorative icons
 */
export const DECORATIVE_ICON = { 'aria-hidden': 'true' as const };

/**
 * Announce to screen readers using a live region
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  // Create temporary live region
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.textContent = message;

  document.body.appendChild(liveRegion);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get keyboard navigation help text
 */
export const KEYBOARD_HINTS = {
  dialog: 'Pressione Escape para fechar',
  dropdown: 'Use as setas para navegar, Enter para selecionar',
  tabs: 'Use as setas esquerda e direita para navegar entre abas',
  dragDrop: 'Pressione espaço para pegar, use as setas para mover, espaço para soltar',
} as const;
