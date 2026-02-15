import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './header';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));

vi.mock('next-view-transitions', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Header', () => {
  it('shows only Entrar action when user is logged out', async () => {
    render(<Header user={null} />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument();
  });
});
