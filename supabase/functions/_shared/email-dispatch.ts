type JsonLike = Record<string, unknown>;

interface EmailLogsClient {
  from: (table: 'email_logs') => {
    insert: (payload: JsonLike) => unknown;
  };
}

interface DispatchEmailInput {
  supabase: EmailLogsClient;
  resendApiKey: string;
  fromAddress: string;
  emailType: 'trip_reminder' | 'daily_summary';
  recipientEmail: string;
  recipientUserId: string;
  subject: string;
  html: string;
  metadata: JsonLike;
  fetchImpl?: typeof fetch;
}

interface DispatchResponse {
  success: boolean;
  resendEmailId: string | null;
}

async function tryParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function insertLog(supabase: EmailLogsClient, payload: JsonLike) {
  try {
    await supabase.from('email_logs').insert(payload);
  } catch (error) {
    console.error('Failed to persist email log:', error);
  }
}

export async function dispatchEmail(input: DispatchEmailInput): Promise<DispatchResponse> {
  const {
    supabase,
    resendApiKey,
    fromAddress,
    emailType,
    recipientEmail,
    recipientUserId,
    subject,
    html,
    metadata,
    fetchImpl = fetch,
  } = input;

  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmail,
        subject,
        html,
      }),
    });

    const responseData = await tryParseJson(response);
    const resendEmailId =
      responseData && typeof responseData === 'object' && 'id' in responseData
        ? String(responseData.id || '')
        : '';

    await insertLog(supabase, {
      email_type: emailType,
      recipient_email: recipientEmail,
      recipient_user_id: recipientUserId,
      subject,
      from_address: fromAddress,
      resend_email_id: resendEmailId || null,
      status: response.ok ? 'sent' : 'failed',
      error_message: response.ok ? null : JSON.stringify(responseData),
      metadata,
    });

    return {
      success: response.ok,
      resendEmailId: resendEmailId || null,
    };
  } catch (error) {
    await insertLog(supabase, {
      email_type: emailType,
      recipient_email: recipientEmail,
      recipient_user_id: recipientUserId,
      subject,
      from_address: fromAddress,
      status: 'failed',
      error_message: String(error),
      metadata,
    });

    return {
      success: false,
      resendEmailId: null,
    };
  }
}

interface TripReminderDispatchInput {
  supabase: EmailLogsClient;
  resendApiKey: string;
  recipientEmail: string;
  recipientUserId: string;
  subject: string;
  html: string;
  tripId: string;
  fetchImpl?: typeof fetch;
}

export async function dispatchTripReminderEmail(
  input: TripReminderDispatchInput
): Promise<DispatchResponse> {
  return dispatchEmail({
    supabase: input.supabase,
    resendApiKey: input.resendApiKey,
    fromAddress: 'Half Trip <lembretes@halftrip.com>',
    emailType: 'trip_reminder',
    recipientEmail: input.recipientEmail,
    recipientUserId: input.recipientUserId,
    subject: input.subject,
    html: input.html,
    metadata: { trip_id: input.tripId, days_until: 3 },
    fetchImpl: input.fetchImpl,
  });
}

interface DailySummaryDispatchInput {
  supabase: EmailLogsClient;
  resendApiKey: string;
  recipientEmail: string;
  recipientUserId: string;
  subject: string;
  html: string;
  tripId: string;
  fetchImpl?: typeof fetch;
}

export async function dispatchDailySummaryEmail(
  input: DailySummaryDispatchInput
): Promise<DispatchResponse> {
  return dispatchEmail({
    supabase: input.supabase,
    resendApiKey: input.resendApiKey,
    fromAddress: 'Half Trip <resumo@halftrip.com>',
    emailType: 'daily_summary',
    recipientEmail: input.recipientEmail,
    recipientUserId: input.recipientUserId,
    subject: input.subject,
    html: input.html,
    metadata: { trip_id: input.tripId },
    fetchImpl: input.fetchImpl,
  });
}
