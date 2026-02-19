-- Half Trip - Atomic RPC Functions
-- Migration: 20260219170000_atomic_rpc_functions
-- Description: Creates atomic RPC functions for expense+splits and group+members creation,
--              and a SUM function for expense totals.
--              Fixes non-atomic operations that used manual rollback (risk of orphaned data).

-- ============================================================================
-- 1. create_expense_with_splits: Atomic expense + splits creation
-- ============================================================================
CREATE OR REPLACE FUNCTION create_expense_with_splits(
  p_trip_id UUID,
  p_description TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'BRL',
  p_exchange_rate NUMERIC DEFAULT 1,
  p_date DATE DEFAULT CURRENT_DATE,
  p_category TEXT DEFAULT 'other',
  p_paid_by UUID DEFAULT NULL,
  p_paid_by_participant_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_activity_id UUID DEFAULT NULL,
  p_splits JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_expense_id UUID;
  v_split JSONB;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a member of the trip
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this trip';
  END IF;

  -- Insert expense
  INSERT INTO expenses (
    trip_id, description, amount, currency, exchange_rate,
    date, category, paid_by, paid_by_participant_id,
    created_by, notes, activity_id
  )
  VALUES (
    p_trip_id, p_description, p_amount, p_currency, p_exchange_rate,
    p_date, p_category, p_paid_by, p_paid_by_participant_id,
    v_user_id, p_notes, p_activity_id
  )
  RETURNING id INTO v_expense_id;

  -- Insert splits from JSONB array
  INSERT INTO expense_splits (expense_id, user_id, participant_id, amount, percentage)
  SELECT
    v_expense_id,
    (elem->>'user_id')::UUID,
    (elem->>'participant_id')::UUID,
    (elem->>'amount')::NUMERIC,
    (elem->>'percentage')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS elem;

  RETURN v_expense_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_expense_with_splits TO authenticated;


-- ============================================================================
-- 2. create_group_with_members: Atomic group + participant assignment
-- ============================================================================
CREATE OR REPLACE FUNCTION create_group_with_members(
  p_trip_id UUID,
  p_name TEXT,
  p_participant_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_group_id UUID;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is an organizer of the trip
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = v_user_id AND role = 'organizer'
  ) THEN
    RAISE EXCEPTION 'Only organizers can create groups';
  END IF;

  -- Create the group
  INSERT INTO trip_groups (trip_id, name, created_by)
  VALUES (p_trip_id, p_name, v_user_id)
  RETURNING id INTO v_group_id;

  -- Assign participants to the group
  UPDATE trip_participants
  SET group_id = v_group_id
  WHERE trip_id = p_trip_id
    AND id = ANY(p_participant_ids);

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_group_with_members TO authenticated;


-- ============================================================================
-- 3. get_trip_expenses_total: Server-side SUM instead of fetching all rows
-- ============================================================================
CREATE OR REPLACE FUNCTION get_trip_expenses_total(p_trip_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_total NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify membership
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = v_user_id
  ) THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(amount * exchange_rate), 0)
  INTO v_total
  FROM expenses
  WHERE trip_id = p_trip_id;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trip_expenses_total TO authenticated;


-- ============================================================================
-- 4. Trigger: touch trip_polls.updated_at when a vote is cast
--    This allows the realtime listener on trip_polls to detect vote changes,
--    eliminating the need for an unfiltered poll_votes listener.
-- ============================================================================
CREATE OR REPLACE FUNCTION touch_poll_on_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE trip_polls
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.poll_id, OLD.poll_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_poll_votes_touch_poll
AFTER INSERT OR DELETE ON poll_votes
FOR EACH ROW
EXECUTE FUNCTION touch_poll_on_vote();


-- ============================================================================
-- 5. Trigger: auto-populate legacy user FK columns from participant_id
--    Eliminates the need for dual-write in application code.
--    When participant_id is set, derives user_id from trip_participants.
-- ============================================================================

-- For expenses: derive paid_by from paid_by_participant_id
CREATE OR REPLACE FUNCTION sync_expense_legacy_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.paid_by_participant_id IS NOT NULL AND NEW.paid_by IS NULL THEN
    SELECT user_id INTO NEW.paid_by
    FROM trip_participants
    WHERE id = NEW.paid_by_participant_id AND type = 'member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expenses_sync_legacy_user
BEFORE INSERT OR UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION sync_expense_legacy_user();

-- For expense_splits: derive user_id from participant_id
CREATE OR REPLACE FUNCTION sync_expense_split_legacy_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.participant_id IS NOT NULL AND NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id
    FROM trip_participants
    WHERE id = NEW.participant_id AND type = 'member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_splits_sync_legacy_user
BEFORE INSERT OR UPDATE ON expense_splits
FOR EACH ROW
EXECUTE FUNCTION sync_expense_split_legacy_user();

-- For settlements: derive from_user/to_user from participant_ids
CREATE OR REPLACE FUNCTION sync_settlement_legacy_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.from_participant_id IS NOT NULL AND NEW.from_user IS NULL THEN
    SELECT user_id INTO NEW.from_user
    FROM trip_participants
    WHERE id = NEW.from_participant_id AND type = 'member';
  END IF;
  IF NEW.to_participant_id IS NOT NULL AND NEW.to_user IS NULL THEN
    SELECT user_id INTO NEW.to_user
    FROM trip_participants
    WHERE id = NEW.to_participant_id AND type = 'member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_settlements_sync_legacy_users
BEFORE INSERT OR UPDATE ON settlements
FOR EACH ROW
EXECUTE FUNCTION sync_settlement_legacy_users();
