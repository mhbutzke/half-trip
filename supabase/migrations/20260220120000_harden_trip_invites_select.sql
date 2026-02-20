-- Half Trip - Harden trip_invites SELECT policy
-- Migration: 20260220120000_harden_trip_invites_select
-- Description: Restricts trip_invites SELECT from USING (true) to trip members only.
--              Creates SECURITY DEFINER RPC for non-member invite lookups (accept flow).
--
-- SECURITY FIX: Previously, any authenticated user could read ALL invites from ALL trips,
-- exposing trip_ids, email addresses, invite codes, and inviter info.

-- ============================================================================
-- 1. REPLACE PERMISSIVE SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "trip_invites_select_by_code" ON trip_invites;

-- Only trip members can list/view invites for their trips
CREATE POLICY "trip_invites_select_members"
  ON trip_invites FOR SELECT
  USING (is_trip_member(trip_id));

-- ============================================================================
-- 2. CREATE SECURITY DEFINER RPC FOR INVITE LOOKUP BY CODE
-- ============================================================================

-- This function allows non-members to look up an invite by code (for the accept flow).
-- Returns invite + trip + inviter info as JSONB. Returns NULL if not found.
-- SECURITY: Only exposes minimal data needed for the invite page. Does NOT expose
-- other invites, invite codes, or sensitive trip data.
CREATE OR REPLACE FUNCTION get_invite_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', ti.id,
    'trip_id', ti.trip_id,
    'code', ti.code,
    'email', ti.email,
    'invited_by', ti.invited_by,
    'expires_at', ti.expires_at,
    'accepted_at', ti.accepted_at,
    'accepted_by', ti.accepted_by,
    'created_at', ti.created_at,
    'trip', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'destination', t.destination,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'cover_url', t.cover_url
    ),
    'inviter', jsonb_build_object(
      'id', u.id,
      'name', u.name,
      'avatar_url', u.avatar_url
    )
  ) INTO result
  FROM trip_invites ti
  JOIN trips t ON t.id = ti.trip_id
  JOIN users u ON u.id = ti.invited_by
  WHERE ti.code = p_code
  LIMIT 1;

  RETURN result;
END;
$$;
