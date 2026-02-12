-- Google Calendar integration tables
-- Stores OAuth tokens per user and event mapping for idempotent sync

CREATE TABLE google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  google_email TEXT,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE google_calendar_connections IS 'OAuth credentials for Google Calendar per user';
COMMENT ON COLUMN google_calendar_connections.refresh_token IS 'Google OAuth refresh token used to mint access tokens';

CREATE TABLE google_calendar_activity_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT google_calendar_activity_syncs_user_activity_unique UNIQUE(user_id, activity_id)
);

COMMENT ON TABLE google_calendar_activity_syncs IS 'Maps local activities to Google Calendar events by user';

CREATE INDEX idx_google_calendar_activity_syncs_user_id
  ON google_calendar_activity_syncs(user_id);
CREATE INDEX idx_google_calendar_activity_syncs_activity_id
  ON google_calendar_activity_syncs(activity_id);

CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_activity_syncs_updated_at
  BEFORE UPDATE ON google_calendar_activity_syncs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_activity_syncs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_calendar_connections_select_own"
  ON google_calendar_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "google_calendar_connections_insert_own"
  ON google_calendar_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "google_calendar_connections_update_own"
  ON google_calendar_connections FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "google_calendar_connections_delete_own"
  ON google_calendar_connections FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "google_calendar_activity_syncs_select_own"
  ON google_calendar_activity_syncs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "google_calendar_activity_syncs_insert_own"
  ON google_calendar_activity_syncs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "google_calendar_activity_syncs_update_own"
  ON google_calendar_activity_syncs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "google_calendar_activity_syncs_delete_own"
  ON google_calendar_activity_syncs FOR DELETE
  USING (user_id = auth.uid());
