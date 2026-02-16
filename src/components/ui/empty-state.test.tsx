import { render, screen } from '@testing-library/react';
import { Plane } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('applies mobile bottom-nav safe spacing when enabled', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Plane}
        title="Nenhuma viagem"
        mobileBottomNavSafe
        action={{ label: 'Criar', onClick }}
      />
    );

    const heading = screen.getByRole('heading', { name: 'Nenhuma viagem' });
    const root = heading.closest('div');
    expect(root?.className).toContain('pb-[calc(7rem+env(safe-area-inset-bottom))]');
  });
});
