import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from './service';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from './resend';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('./resend', () => ({
  getResendClient: vi.fn(),
}));

vi.mock('@/lib/errors/logger', () => ({
  logError: vi.fn(),
  logWarning: vi.fn(),
}));

const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedGetResendClient = vi.mocked(getResendClient);

function createAdminClientMock() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));

  return {
    client: { from },
    insert,
  };
}

describe('email service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to onboarding sender when domain is not verified', async () => {
    const adminMock = createAdminClientMock();
    mockedCreateAdminClient.mockReturnValue(adminMock.client as never);

    const sendMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            'The halftrip.com domain is not verified. Please, add and verify your domain on https://resend.com/domains',
        },
      })
      .mockResolvedValueOnce({
        data: { id: 'email_123' },
        error: null,
      });

    mockedGetResendClient.mockReturnValue({
      emails: { send: sendMock },
    } as never);

    const resultPromise = sendEmail({
      emailType: 'confirmation',
      recipientEmail: 'new.user@example.com',
      subject: 'Confirme seu email',
      htmlContent: '<p>Teste</p>',
      checkPreferences: false,
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ success: true, emailId: 'email_123' });
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({
      from: 'Half Trip <confirme@halftrip.com>',
    });
    expect(sendMock.mock.calls[1]?.[0]).toMatchObject({
      from: 'Half Trip <onboarding@resend.dev>',
    });
    expect(adminMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        from_address: 'Half Trip <onboarding@resend.dev>',
      })
    );
  });
});
