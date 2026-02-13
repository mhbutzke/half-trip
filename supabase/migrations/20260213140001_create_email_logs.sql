-- Email delivery logs
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email_type TEXT NOT NULL CHECK (email_type IN ('invite', 'trip_reminder', 'daily_summary', 'welcome')),
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  resend_email_id TEXT,

  subject TEXT NOT NULL,
  from_address TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'complained', 'failed')),
  error_message TEXT,

  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,

  retry_count INTEGER DEFAULT 0 NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE email_logs IS 'Logs all email send attempts and delivery status';

-- Indexes
CREATE INDEX idx_email_logs_recipient_user_id ON email_logs(recipient_user_id);
CREATE INDEX idx_email_logs_resend_email_id ON email_logs(resend_email_id);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Reuse existing updated_at trigger
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
