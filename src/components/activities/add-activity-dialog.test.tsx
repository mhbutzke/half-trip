import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { AddActivityDialog } from './add-activity-dialog';

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => false,
}));

vi.mock('./activity-form-fields', () => ({
  ActivityFormFields: () => null,
}));

vi.mock('@/components/ui/responsive-form-container', () => ({
  ResponsiveFormContainer: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    <div data-testid="responsive-form-container">{open ? children : null}</div>
  ),
}));

vi.mock('@/lib/supabase/activities', () => ({
  createActivity: vi.fn(),
}));

describe('AddActivityDialog trigger rendering', () => {
  it('does not render nested buttons when trigger is already a button', () => {
    const { container } = render(
      <AddActivityDialog
        tripId="trip-1"
        defaultDate="2026-02-14"
        trigger={
          <Button size="sm" className="h-11 sm:h-9">
            Nova atividade
          </Button>
        }
      />
    );

    expect(container.querySelector('button button')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });
});
