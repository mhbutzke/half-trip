import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { AuthHeader } from './auth-header';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

describe('AuthHeader', () => {
  it('shows register CTA on login route', () => {
    vi.mocked(usePathname).mockReturnValue('/login');
    render(<AuthHeader />);

    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register');
  });

  it('shows login CTA on register route', () => {
    vi.mocked(usePathname).mockReturnValue('/register');
    render(<AuthHeader />);

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });
});
