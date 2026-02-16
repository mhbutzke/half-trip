import { render, screen } from '@testing-library/react';
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

vi.mock('@/hooks/use-trip-realtime', () => ({
  useTripRealtime: () => undefined,
}));

vi.mock('@/components/itinerary/trip-itinerary-preview', () => ({
  TripItineraryPreview: () => null,
}));

describe('TripOverview visual direction (balanced)', () => {
  it('uses the balanced spacing cadence on the overview canvas', () => {
    render(
      <TripOverview
        trip={
          {
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
          } as never
        }
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

    const root = screen.getByTestId('trip-overview-root');
    expect(root).toHaveClass('space-y-6');
  });
});
