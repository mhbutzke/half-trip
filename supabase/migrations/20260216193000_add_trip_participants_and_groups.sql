-- Add trip_groups + trip_participants to support guests and group splitting.
-- Also add participant-based foreign keys for expenses/splits/settlements.
--
-- NOTE: These tables/functions exist in the production schema (see src/types/database.ts),
-- but were missing from migrations, causing drift for fresh deployments.

-- ============================================================================
-- TRIP GROUPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trip_groups_unique_name_per_trip UNIQUE (trip_id, name)
);

ALTER TABLE public.trip_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view groups"
  ON public.trip_groups FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Organizers can manage groups"
  ON public.trip_groups FOR ALL
  USING (public.is_trip_organizer(trip_id))
  WITH CHECK (public.is_trip_organizer(trip_id));

-- ============================================================================
-- TRIP PARTICIPANTS (members + guests)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  guest_name text,
  guest_email text,
  guest_avatar_url text,
  type text NOT NULL CHECK (type IN ('member', 'guest')),
  group_id uuid REFERENCES public.trip_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only one "member" participant per (trip_id, user_id)
CREATE UNIQUE INDEX IF NOT EXISTS trip_participants_unique_member
  ON public.trip_participants(trip_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id
  ON public.trip_participants(trip_id, created_at);

CREATE INDEX IF NOT EXISTS idx_trip_participants_group_id
  ON public.trip_participants(group_id)
  WHERE group_id IS NOT NULL;

ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view participants"
  ON public.trip_participants FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Organizers can manage participants"
  ON public.trip_participants FOR ALL
  USING (public.is_trip_organizer(trip_id))
  WITH CHECK (public.is_trip_organizer(trip_id));

-- ============================================================================
-- Keep trip_participants in sync with trip_members (member rows only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_trip_participant_for_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_participants (trip_id, user_id, type, created_at)
  VALUES (NEW.trip_id, NEW.user_id, 'member', COALESCE(NEW.joined_at, now()))
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_trip_participant_for_member ON public.trip_members;
CREATE TRIGGER trg_ensure_trip_participant_for_member
  AFTER INSERT ON public.trip_members
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_trip_participant_for_member();

-- Backfill existing members into trip_participants
INSERT INTO public.trip_participants (trip_id, user_id, type, created_at)
SELECT tm.trip_id, tm.user_id, 'member', tm.joined_at
FROM public.trip_members tm
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- RPC: Link an existing guest participant to a newly registered user (invite flow)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_guest_to_user(
  p_trip_id uuid,
  p_user_id uuid,
  p_user_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_id uuid;
BEGIN
  -- If the member participant already exists, return it.
  SELECT id INTO v_participant_id
  FROM public.trip_participants
  WHERE trip_id = p_trip_id
    AND user_id = p_user_id
  LIMIT 1;

  IF v_participant_id IS NOT NULL THEN
    RETURN v_participant_id;
  END IF;

  -- Find at most one matching guest by email and claim it.
  WITH candidate AS (
    SELECT id
    FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND type = 'guest'
      AND user_id IS NULL
      AND guest_email IS NOT NULL
      AND lower(guest_email) = lower(p_user_email)
    ORDER BY created_at ASC
    LIMIT 1
  )
  UPDATE public.trip_participants tp
  SET user_id = p_user_id,
      type = 'member'
  FROM candidate
  WHERE tp.id = candidate.id
  RETURNING tp.id INTO v_participant_id;

  IF v_participant_id IS NOT NULL THEN
    RETURN v_participant_id;
  END IF;

  -- No guest found; create member participant (will also be created by trip_members trigger later).
  INSERT INTO public.trip_participants (trip_id, user_id, type)
  VALUES (p_trip_id, p_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING
  RETURNING id INTO v_participant_id;

  RETURN v_participant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_guest_to_user(uuid, uuid, text) TO authenticated;

-- ============================================================================
-- Participant-based finance columns (guests support)
-- ============================================================================

-- expenses: paid_by can be NULL for guests; paid_by_participant_id references trip_participants
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS paid_by_participant_id uuid REFERENCES public.trip_participants(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ALTER COLUMN paid_by DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_participant_id
  ON public.expenses(trip_id, paid_by_participant_id)
  WHERE paid_by_participant_id IS NOT NULL;

-- Backfill paid_by_participant_id for existing expenses
INSERT INTO public.trip_participants (trip_id, user_id, type)
SELECT DISTINCT e.trip_id, e.paid_by, 'member'
FROM public.expenses e
WHERE e.paid_by IS NOT NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

UPDATE public.expenses e
SET paid_by_participant_id = tp.id
FROM public.trip_participants tp
WHERE tp.trip_id = e.trip_id
  AND tp.user_id = e.paid_by
  AND e.paid_by_participant_id IS NULL
  AND e.paid_by IS NOT NULL;

ALTER TABLE public.expenses
  ALTER COLUMN paid_by_participant_id SET NOT NULL;

-- expense_splits: participant_id is the primary identity (supports guests)
ALTER TABLE public.expense_splits
  ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES public.trip_participants(id) ON DELETE CASCADE;

ALTER TABLE public.expense_splits
  ALTER COLUMN user_id DROP NOT NULL;

-- Backfill participant_id for existing rows using (trip_id, user_id)
INSERT INTO public.trip_participants (trip_id, user_id, type)
SELECT DISTINCT e.trip_id, es.user_id, 'member'
FROM public.expense_splits es
JOIN public.expenses e ON e.id = es.expense_id
WHERE es.user_id IS NOT NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

UPDATE public.expense_splits es
SET participant_id = tp.id
FROM public.expenses e
JOIN public.trip_participants tp
  ON tp.trip_id = e.trip_id
 AND tp.user_id = es.user_id
WHERE es.expense_id = e.id
  AND es.participant_id IS NULL
  AND es.user_id IS NOT NULL;

ALTER TABLE public.expense_splits
  ALTER COLUMN participant_id SET NOT NULL;

ALTER TABLE public.expense_splits
  DROP CONSTRAINT IF EXISTS unique_expense_split;

ALTER TABLE public.expense_splits
  ADD CONSTRAINT expense_splits_unique_participant UNIQUE (expense_id, participant_id);

CREATE INDEX IF NOT EXISTS idx_expense_splits_participant_id
  ON public.expense_splits(participant_id);

-- settlements: from_user/to_user can be NULL for guests; participant IDs are the primary identity
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS from_participant_id uuid REFERENCES public.trip_participants(id) ON DELETE SET NULL;
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS to_participant_id uuid REFERENCES public.trip_participants(id) ON DELETE SET NULL;

ALTER TABLE public.settlements
  ALTER COLUMN from_user DROP NOT NULL;
ALTER TABLE public.settlements
  ALTER COLUMN to_user DROP NOT NULL;

-- Backfill from/to participant IDs for existing settlements
INSERT INTO public.trip_participants (trip_id, user_id, type)
SELECT DISTINCT s.trip_id, s.from_user, 'member'
FROM public.settlements s
WHERE s.from_user IS NOT NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

INSERT INTO public.trip_participants (trip_id, user_id, type)
SELECT DISTINCT s.trip_id, s.to_user, 'member'
FROM public.settlements s
WHERE s.to_user IS NOT NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

UPDATE public.settlements s
SET from_participant_id = tp.id
FROM public.trip_participants tp
WHERE tp.trip_id = s.trip_id
  AND tp.user_id = s.from_user
  AND s.from_participant_id IS NULL
  AND s.from_user IS NOT NULL;

UPDATE public.settlements s
SET to_participant_id = tp.id
FROM public.trip_participants tp
WHERE tp.trip_id = s.trip_id
  AND tp.user_id = s.to_user
  AND s.to_participant_id IS NULL
  AND s.to_user IS NOT NULL;

ALTER TABLE public.settlements
  ALTER COLUMN from_participant_id SET NOT NULL;
ALTER TABLE public.settlements
  ALTER COLUMN to_participant_id SET NOT NULL;

ALTER TABLE public.settlements
  DROP CONSTRAINT IF EXISTS different_users;

ALTER TABLE public.settlements
  ADD CONSTRAINT settlements_different_participants
    CHECK (
      (from_participant_id IS NULL OR to_participant_id IS NULL)
      OR (from_participant_id <> to_participant_id)
    );

CREATE INDEX IF NOT EXISTS idx_settlements_from_participant_id
  ON public.settlements(trip_id, from_participant_id)
  WHERE from_participant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settlements_to_participant_id
  ON public.settlements(trip_id, to_participant_id)
  WHERE to_participant_id IS NOT NULL;
