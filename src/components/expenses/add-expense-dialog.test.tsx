import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { AddExpenseDialog } from './add-expense-dialog';
import type { TripParticipantResolved } from '@/lib/supabase/participants';

vi.mock('@/components/ui/responsive-form-container', () => ({
  ResponsiveFormContainer: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    <div data-testid="responsive-form-container">{open ? children : null}</div>
  ),
}));

vi.mock('@/lib/supabase/expenses', () => ({
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
}));

vi.mock('@/lib/supabase/receipts', () => ({
  uploadReceipt: vi.fn(),
}));

describe('AddExpenseDialog trigger rendering', () => {
  it('does not render nested buttons when trigger is already a button', () => {
    const participants: TripParticipantResolved[] = [
      {
        id: 'participant-1',
        tripId: 'trip-1',
        type: 'member',
        userId: 'user-1',
        displayName: 'User One',
        displayEmail: 'user1@test.com',
        displayAvatar: null,
        groupId: null,
        role: 'organizer',
      },
    ];

    const { container } = render(
      <AddExpenseDialog
        tripId="trip-1"
        currentUserId="user-1"
        currentParticipantId="participant-1"
        baseCurrency="BRL"
        participants={participants}
        trigger={<Button className="hidden sm:flex">Adicionar</Button>}
      />
    );

    expect(container.querySelector('button button')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });
});
