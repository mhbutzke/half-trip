-- User email notification preferences
CREATE TABLE user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  invite_emails BOOLEAN NOT NULL DEFAULT true,
  trip_reminder_emails BOOLEAN NOT NULL DEFAULT true,
  daily_summary_emails BOOLEAN NOT NULL DEFAULT true,
  welcome_emails BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE user_email_preferences IS 'User email notification preferences per email type';

-- RLS
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email preferences"
  ON user_email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON user_email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences"
  ON user_email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_email_preferences_user_id ON user_email_preferences(user_id);

-- Reuse existing updated_at trigger function
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON user_email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
