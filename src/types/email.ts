export type EmailType =
  | 'invite'
  | 'trip_reminder'
  | 'daily_summary'
  | 'welcome'
  | 'confirmation'
  | 'password_reset';

export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';

export interface SendEmailParams {
  emailType: EmailType;
  recipientEmail: string;
  recipientUserId?: string;
  subject: string;
  htmlContent: string;
  metadata?: Record<string, unknown>;
  /** Whether to check user preferences before sending. Default: true */
  checkPreferences?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export interface UserEmailPreferences {
  id: string;
  userId: string;
  inviteEmails: boolean;
  tripReminderEmails: boolean;
  dailySummaryEmails: boolean;
  welcomeEmails: boolean;
  createdAt: string;
  updatedAt: string;
}
