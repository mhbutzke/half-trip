import { z } from 'zod';

export const emailPreferencesSchema = z.object({
  inviteEmails: z.boolean(),
  tripReminderEmails: z.boolean(),
  dailySummaryEmails: z.boolean(),
  welcomeEmails: z.boolean(),
});

export type EmailPreferencesFormData = z.infer<typeof emailPreferencesSchema>;
