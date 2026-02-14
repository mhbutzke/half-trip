import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { AddExpenseDialog } from './add-expense-dialog';
import type { TripMemberWithUser } from '@/lib/supabase/trips';

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
    const members = [
      {
        user_id: 'user-1',
        users: { name: 'User One', avatar_url: null },
      },
    ] as unknown as TripMemberWithUser[];

    const { container } = render(
      <AddExpenseDialog
        tripId="trip-1"
        currentUserId="user-1"
        baseCurrency="BRL"
        members={members}
        trigger={<Button className="hidden sm:flex">Adicionar</Button>}
      />
    );

    expect(container.querySelector('button button')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });
});
