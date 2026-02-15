import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TripOverview } from './trip-overview';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const Noop = () => null;
    return Noop;
  },
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/use-trip-realtime', () => ({
  useTripRealtime: () => undefined,
}));

vi.mock('@/components/itinerary/trip-itinerary-preview', () => ({
  TripItineraryPreview: () => null,
}));

vi.mock('@/lib/supabase/activities', () => ({
  getTripActivitiesIndex: vi.fn().mockResolvedValue({}),
  getTripActivitiesByDate: vi.fn().mockResolvedValue([]),
}));

describe('TripOverview readiness hub', () => {
  const baseTrip = {
    id: 'trip-1',
    name: 'Viagem Teste',
    destination: 'Lisboa',
    description: null,
    start_date: '2099-01-10',
    end_date: '2099-01-12',
    base_currency: 'BRL',
    cover_url: null,
    archived_at: null,
    transport_type: 'plane',
    style: 'other',
    trip_members: [],
    memberCount: 1,
  };

  it('shows the readiness hub before the trip starts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-09T12:00:00'));

    render(
      <TripOverview
        trip={baseTrip as never}
        userRole="organizer"
        currentUserId="user-1"
        dashboard={
          {
            userBalance: 0,
            balanceDescription: 'Sem despesas ainda',
            totalExpenses: 0,
            expenseCount: 0,
            activityCountTotal: 0,
            checklistCount: 0,
            nextActivity: null,
            pendingSettlements: { count: 0, totalAmount: 0 },
            tripProgress: { currentDay: 0, totalDays: 3 },
            budgetUsed: null,
            budgetTotal: null,
            baseCurrency: 'BRL',
          } as never
        }
        initialPolls={[]}
        initialRecapData={null}
        participants={[]}
      />
    );

    expect(screen.getByText('Preparação da viagem')).toBeInTheDocument();

    // CTAs for missing essentials
    const hub =
      screen.getByText('Preparação da viagem').closest('[data-slot="card"]') ??
      screen.getByText('Preparação da viagem').parentElement;
    expect(hub).toBeTruthy();

    const scope = within(hub as HTMLElement);
    expect(scope.getByRole('button', { name: 'Convidar' })).toBeInTheDocument();
    expect(scope.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
    expect(scope.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
    expect(scope.getByRole('button', { name: 'Definir' })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not show the readiness hub when the trip is already in progress', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-11T12:00:00'));

    render(
      <TripOverview
        trip={{ ...baseTrip, memberCount: 2 } as never}
        userRole="organizer"
        currentUserId="user-1"
        dashboard={
          {
            userBalance: 0,
            balanceDescription: 'Tudo certo!',
            totalExpenses: 0,
            expenseCount: 0,
            activityCountTotal: 0,
            checklistCount: 0,
            nextActivity: null,
            pendingSettlements: { count: 0, totalAmount: 0 },
            tripProgress: { currentDay: 1, totalDays: 3 },
            budgetUsed: null,
            budgetTotal: null,
            baseCurrency: 'BRL',
          } as never
        }
        initialPolls={[]}
        initialRecapData={null}
        participants={[]}
      />
    );

    expect(screen.queryByText('Preparação da viagem')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
