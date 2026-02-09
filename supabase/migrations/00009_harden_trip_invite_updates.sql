-- Half Trip - Harden trip invite updates
-- Migration: 00009_harden_trip_invite_updates
-- Description: Restricts invite updates to acceptance-only operations

-- Replace permissive update policy with acceptance-only constraints
DROP POLICY IF EXISTS "trip_invites_update" ON trip_invites;
DROP POLICY IF EXISTS "trip_invites_update_accept" ON trip_invites;

CREATE POLICY "trip_invites_update_accept"
  ON trip_invites FOR UPDATE
  USING (
    accepted_at IS NULL
    AND accepted_by IS NULL
    AND expires_at > NOW()
  )
  WITH CHECK (
    accepted_by = auth.uid()
    AND accepted_at IS NOT NULL
    AND expires_at > NOW()
  );

-- Ensure only acceptance fields can change during UPDATE
CREATE OR REPLACE FUNCTION enforce_trip_invite_accept_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.accepted_at IS NOT NULL OR OLD.accepted_by IS NOT NULL THEN
    RAISE EXCEPTION 'Invite acceptance is immutable once set';
  END IF;

  IF NEW.accepted_at IS NULL OR NEW.accepted_by IS NULL THEN
    RAISE EXCEPTION 'Invite update must include accepted_at and accepted_by';
  END IF;

  IF NEW.trip_id <> OLD.trip_id
     OR NEW.code <> OLD.code
     OR COALESCE(NEW.email, '') <> COALESCE(OLD.email, '')
     OR NEW.invited_by <> OLD.invited_by
     OR NEW.expires_at <> OLD.expires_at
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only invite acceptance fields can be updated';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_trip_invite_accept_update ON trip_invites;

CREATE TRIGGER validate_trip_invite_accept_update
  BEFORE UPDATE ON trip_invites
  FOR EACH ROW
  EXECUTE FUNCTION enforce_trip_invite_accept_update();
