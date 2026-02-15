-- Add 'password_reset' to the email_type check constraint on email_logs
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN ('invite', 'trip_reminder', 'daily_summary', 'welcome', 'confirmation', 'password_reset'));
