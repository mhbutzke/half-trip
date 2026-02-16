import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('Login visual direction (balanced)', () => {
  it('applies the balanced card surface treatment', () => {
    render(<LoginPage />);

    const title = screen.getByRole('heading', { name: 'Entrar' });
    const card = title.closest('[data-slot="card"]');
    expect(card).toHaveClass('border-border/70');
  });
});
