/**
 * Skip Navigation Link
 *
 * Allows keyboard users to skip directly to main content
 * bypassing the header navigation.
 *
 * WCAG 2.1 Criterion 2.4.1: Bypass Blocks
 */

'use client';

export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Pular para o conteúdo principal
    </a>
  );
}
