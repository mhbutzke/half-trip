import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyDisplay } from './money-display';

vi.mock('@/lib/utils/accessibility', () => ({ prefersReducedMotion: () => true }));

describe('MoneyDisplay', () => {
  it('renders formatted currency', () => {
    render(<MoneyDisplay amount={100} currency="BRL" />);
    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });

  it('shows positive color when colorBySign', () => {
    const { container } = render(<MoneyDisplay amount={50} colorBySign />);
    expect(container.firstChild).toHaveClass('text-positive');
  });

  it('shows negative color when colorBySign', () => {
    const { container } = render(<MoneyDisplay amount={-50} colorBySign />);
    expect(container.firstChild).toHaveClass('text-negative');
  });

  it('renders tooltip when convertedAmount provided', () => {
    render(
      <MoneyDisplay amount={100} currency="USD" convertedAmount={578} convertedCurrency="BRL" />
    );
    expect(screen.getByText(/US\$/)).toBeInTheDocument();
  });
});
