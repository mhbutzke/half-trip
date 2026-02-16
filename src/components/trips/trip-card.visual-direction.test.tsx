import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TripCard } from './trip-card';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('TripCard visual direction (balanced)', () => {
  it('applies the balanced layered card surface', () => {
    render(
      <TripCard
        trip={
          {
            id: 'trip-1',
            name: 'Lisboa 2026',
            destination: 'Lisboa',
            description: null,
            start_date: '2099-01-10',
            end_date: '2099-01-12',
            base_currency: 'BRL',
            cover_url: null,
            archived_at: null,
            style: 'other',
            transport_type: 'plane',
            trip_members: [],
            memberCount: 1,
          } as never
        }
        userRole={null}
      />
    );

    const title = screen.getByRole('heading', { name: 'Lisboa 2026' });
    const card = title.closest('[data-slot="card"]');
    expect(card).toHaveClass('border-border/70');
  });
});
