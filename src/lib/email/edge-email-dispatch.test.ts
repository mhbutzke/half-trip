import { describe, it, expect, vi } from 'vitest';
import {
  dispatchDailySummaryEmail,
  dispatchTripReminderEmail,
} from '../../../supabase/functions/_shared/email-dispatch';

function createSupabaseMock() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));

  return {
    client: { from },
    insert,
  };
}

describe('edge email dispatch integration', () => {
  it('dispatchTripReminderEmail should call Resend and persist sent log', async () => {
    const supabase = createSupabaseMock();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'resend_1' }), { status: 200 }));

    const result = await dispatchTripReminderEmail({
      supabase: supabase.client,
      resendApiKey: 'test-key',
      recipientEmail: 'traveler@example.com',
      recipientUserId: 'user-1',
      subject: 'Trip starts soon',
      html: '<p>Body</p>',
      tripId: 'trip-1',
      fetchImpl: fetchMock,
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(payload).toMatchObject({
      from: 'Half Trip <lembretes@halftrip.app>',
      to: 'traveler@example.com',
      subject: 'Trip starts soon',
    });

    expect(supabase.client.from).toHaveBeenCalledWith('email_logs');
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_type: 'trip_reminder',
        status: 'sent',
        resend_email_id: 'resend_1',
      })
    );
  });

  it('dispatchDailySummaryEmail should persist failed log when Resend returns non-2xx', async () => {
    const supabase = createSupabaseMock();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'invalid recipient' }), { status: 400 })
      );

    const result = await dispatchDailySummaryEmail({
      supabase: supabase.client,
      resendApiKey: 'test-key',
      recipientEmail: 'traveler@example.com',
      recipientUserId: 'user-1',
      subject: 'Daily summary',
      html: '<p>Body</p>',
      tripId: 'trip-1',
      fetchImpl: fetchMock,
    });

    expect(result.success).toBe(false);
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_type: 'daily_summary',
        status: 'failed',
      })
    );
  });

  it('dispatchDailySummaryEmail should persist failed log when fetch throws', async () => {
    const supabase = createSupabaseMock();
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('network down'));

    const result = await dispatchDailySummaryEmail({
      supabase: supabase.client,
      resendApiKey: 'test-key',
      recipientEmail: 'traveler@example.com',
      recipientUserId: 'user-1',
      subject: 'Daily summary',
      html: '<p>Body</p>',
      tripId: 'trip-1',
      fetchImpl: fetchMock,
    });

    expect(result.success).toBe(false);
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_type: 'daily_summary',
        status: 'failed',
        error_message: expect.stringContaining('network down'),
      })
    );
  });
});
