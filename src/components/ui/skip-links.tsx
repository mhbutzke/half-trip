/**
 * SkipLinks Component
 * 
 * Provides keyboard navigation shortcuts to skip to main content areas.
 * Improves accessibility for keyboard and screen reader users.
 * Links are visually hidden but appear on focus.
 */

'use client';

import { cn } from '@/lib/utils';

interface SkipLink {
  href: string;
  label: string;
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'Pular para conteúdo principal' },
  { href: '#navigation', label: 'Pular para navegação' },
  { href: '#footer', label: 'Pular para rodapé' },
];

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

export function SkipLinks({ links = defaultLinks, className }: SkipLinksProps) {
  return (
    <div
      className={cn(
        'sr-only focus-within:not-sr-only',
        'fixed top-0 left-0 z-[9999] bg-background border-b',
        'focus-within:flex focus-within:flex-col focus-within:gap-2',
        'focus-within:p-4 focus-within:shadow-lg',
        className
      )}
    >
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            'inline-block px-4 py-2 text-sm font-medium',
            'rounded-md bg-primary text-primary-foreground',
            'hover:bg-primary/90 focus:outline-none focus:ring-2',
            'focus:ring-ring focus:ring-offset-2 transition-colors'
          )}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
