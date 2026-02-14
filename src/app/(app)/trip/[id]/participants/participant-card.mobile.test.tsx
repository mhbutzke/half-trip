import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParticipantCard } from './participant-card';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    canManageMember: () => true,
  }),
}));

vi.mock('@/lib/supabase/trips', () => ({
  removeParticipant: vi.fn().mockResolvedValue({ error: null }),
  promoteToOrganizer: vi.fn().mockResolvedValue({ error: null }),
}));

describe('ParticipantCard mobile UI', () => {
  it('should preserve readable layout for long identity values and touch-sized actions', () => {
    render(
      <ParticipantCard
        member={
          {
            id: 'member-1',
            trip_id: 'trip-1',
            user_id: 'user-1',
            role: 'organizer',
            joined_at: new Date().toISOString(),
            users: {
              id: 'user-1',
              name: 'Mobile Audit Extremely Long Name',
              email:
                'halftrip.mobile.audit.very.long.email.address.for.ui.regression.testing@example.com',
              avatar_url: null,
            },
          } as never
        }
        userRole="organizer"
        currentUserId="user-1"
        tripId="trip-1"
        onLeaveClick={vi.fn()}
      />
    );

    const email = screen.getByText(
      'halftrip.mobile.audit.very.long.email.address.for.ui.regression.testing@example.com'
    );
    expect(email.className).toContain('break-all');

    const actionsButton = screen.getByRole('button', { name: 'Ações' });
    expect(actionsButton.className).toContain('h-11');
    expect(actionsButton.className).toContain('w-11');
  });
});
