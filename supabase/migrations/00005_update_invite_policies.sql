-- Half Trip - Update Invite Policies
-- Migration: 00005_update_invite_policies
-- Description: Updates trip_invites policies to allow any member to create invites
--              and allow invite creators to revoke their own invites

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "trip_invites_insert" ON trip_invites;
DROP POLICY IF EXISTS "trip_invites_delete" ON trip_invites;

-- ============================================================================
-- CREATE NEW POLICIES
-- ============================================================================

-- Any trip member can create invites (collaborative invitation feature)
-- This allows participants to also share invite links with friends/family
CREATE POLICY "trip_invites_insert"
  ON trip_invites FOR INSERT
  WITH CHECK (
    is_trip_member(trip_id)
    AND invited_by = auth.uid()
  );

-- Organizers can delete any invite, or creators can delete their own invites
CREATE POLICY "trip_invites_delete"
  ON trip_invites FOR DELETE
  USING (
    is_trip_organizer(trip_id)
    OR invited_by = auth.uid()
  );
