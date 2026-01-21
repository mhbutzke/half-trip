-- Half Trip - Row Level Security Policies
-- Migration: 00003_rls_policies
-- Description: Creates RLS policies for all tables to enforce access control

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is a member of a trip
CREATE OR REPLACE FUNCTION is_trip_member(trip_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = trip_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is an organizer of a trip
CREATE OR REPLACE FUNCTION is_trip_organizer(trip_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = trip_uuid
    AND user_id = auth.uid()
    AND role = 'organizer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can view profiles of people in their trips
CREATE POLICY "users_select_trip_members"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm1
      JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = users.id
    )
  );

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- TRIPS POLICIES
-- ============================================================================

-- Members can view trips they belong to
CREATE POLICY "trips_select_member"
  ON trips FOR SELECT
  USING (is_trip_member(id));

-- Any authenticated user can create a trip
CREATE POLICY "trips_insert"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only organizers can update trips
CREATE POLICY "trips_update_organizer"
  ON trips FOR UPDATE
  USING (is_trip_organizer(id))
  WITH CHECK (is_trip_organizer(id));

-- Only organizers can delete trips
CREATE POLICY "trips_delete_organizer"
  ON trips FOR DELETE
  USING (is_trip_organizer(id));

-- ============================================================================
-- TRIP MEMBERS POLICIES
-- ============================================================================

-- Members can view other members of their trips
CREATE POLICY "trip_members_select"
  ON trip_members FOR SELECT
  USING (is_trip_member(trip_id));

-- Only organizers can add members (or self-join via invite)
CREATE POLICY "trip_members_insert"
  ON trip_members FOR INSERT
  WITH CHECK (
    -- Organizers can add anyone
    is_trip_organizer(trip_id)
    OR
    -- Users can add themselves (via invite flow)
    (user_id = auth.uid())
  );

-- Only organizers can update member roles
CREATE POLICY "trip_members_update"
  ON trip_members FOR UPDATE
  USING (is_trip_organizer(trip_id))
  WITH CHECK (is_trip_organizer(trip_id));

-- Organizers can remove members, users can remove themselves
CREATE POLICY "trip_members_delete"
  ON trip_members FOR DELETE
  USING (
    is_trip_organizer(trip_id)
    OR user_id = auth.uid()
  );

-- ============================================================================
-- ACTIVITIES POLICIES
-- ============================================================================

-- Members can view activities
CREATE POLICY "activities_select"
  ON activities FOR SELECT
  USING (is_trip_member(trip_id));

-- Members can create activities
CREATE POLICY "activities_insert"
  ON activities FOR INSERT
  WITH CHECK (
    is_trip_member(trip_id)
    AND created_by = auth.uid()
  );

-- Members can update activities (collaborative editing)
CREATE POLICY "activities_update"
  ON activities FOR UPDATE
  USING (is_trip_member(trip_id))
  WITH CHECK (is_trip_member(trip_id));

-- Only creator or organizers can delete activities
CREATE POLICY "activities_delete"
  ON activities FOR DELETE
  USING (
    created_by = auth.uid()
    OR is_trip_organizer(trip_id)
  );

-- ============================================================================
-- ACTIVITY ATTACHMENTS POLICIES
-- ============================================================================

-- Members can view attachments
CREATE POLICY "activity_attachments_select"
  ON activity_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_attachments.activity_id
      AND is_trip_member(activities.trip_id)
    )
  );

-- Members can add attachments
CREATE POLICY "activity_attachments_insert"
  ON activity_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_attachments.activity_id
      AND is_trip_member(activities.trip_id)
    )
  );

-- Members can delete attachments (or restrict to creator/organizer if needed)
CREATE POLICY "activity_attachments_delete"
  ON activity_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_attachments.activity_id
      AND is_trip_member(activities.trip_id)
    )
  );

-- ============================================================================
-- EXPENSES POLICIES
-- ============================================================================

-- Members can view expenses
CREATE POLICY "expenses_select"
  ON expenses FOR SELECT
  USING (is_trip_member(trip_id));

-- Members can create expenses
CREATE POLICY "expenses_insert"
  ON expenses FOR INSERT
  WITH CHECK (
    is_trip_member(trip_id)
    AND created_by = auth.uid()
  );

-- Creator or organizers can update expenses
CREATE POLICY "expenses_update"
  ON expenses FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_trip_organizer(trip_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR is_trip_organizer(trip_id)
  );

-- Creator or organizers can delete expenses
CREATE POLICY "expenses_delete"
  ON expenses FOR DELETE
  USING (
    created_by = auth.uid()
    OR is_trip_organizer(trip_id)
  );

-- ============================================================================
-- EXPENSE SPLITS POLICIES
-- ============================================================================

-- Members can view splits
CREATE POLICY "expense_splits_select"
  ON expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id
      AND is_trip_member(expenses.trip_id)
    )
  );

-- Expense creator can manage splits
CREATE POLICY "expense_splits_insert"
  ON expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id
      AND (expenses.created_by = auth.uid() OR is_trip_organizer(expenses.trip_id))
    )
  );

-- Expense creator or organizers can update splits
CREATE POLICY "expense_splits_update"
  ON expense_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id
      AND (expenses.created_by = auth.uid() OR is_trip_organizer(expenses.trip_id))
    )
  );

-- Expense creator or organizers can delete splits
CREATE POLICY "expense_splits_delete"
  ON expense_splits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id
      AND (expenses.created_by = auth.uid() OR is_trip_organizer(expenses.trip_id))
    )
  );

-- ============================================================================
-- TRIP NOTES POLICIES
-- ============================================================================

-- Members can view notes
CREATE POLICY "trip_notes_select"
  ON trip_notes FOR SELECT
  USING (is_trip_member(trip_id));

-- Members can create notes
CREATE POLICY "trip_notes_insert"
  ON trip_notes FOR INSERT
  WITH CHECK (
    is_trip_member(trip_id)
    AND created_by = auth.uid()
  );

-- Only creator can update their notes
CREATE POLICY "trip_notes_update"
  ON trip_notes FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Creator or organizers can delete notes
CREATE POLICY "trip_notes_delete"
  ON trip_notes FOR DELETE
  USING (
    created_by = auth.uid()
    OR is_trip_organizer(trip_id)
  );

-- ============================================================================
-- TRIP INVITES POLICIES
-- ============================================================================

-- Public: Anyone can view an invite by code (for accept flow)
CREATE POLICY "trip_invites_select_by_code"
  ON trip_invites FOR SELECT
  USING (true);

-- Only organizers can create invites
CREATE POLICY "trip_invites_insert"
  ON trip_invites FOR INSERT
  WITH CHECK (
    is_trip_organizer(trip_id)
    AND invited_by = auth.uid()
  );

-- Anyone can update an invite (to mark as accepted)
CREATE POLICY "trip_invites_update"
  ON trip_invites FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only organizers can delete invites
CREATE POLICY "trip_invites_delete"
  ON trip_invites FOR DELETE
  USING (is_trip_organizer(trip_id));

-- ============================================================================
-- SETTLEMENTS POLICIES
-- ============================================================================

-- Members can view settlements
CREATE POLICY "settlements_select"
  ON settlements FOR SELECT
  USING (is_trip_member(trip_id));

-- Members can create settlements
CREATE POLICY "settlements_insert"
  ON settlements FOR INSERT
  WITH CHECK (is_trip_member(trip_id));

-- Involved parties can update settlements (mark as settled)
CREATE POLICY "settlements_update"
  ON settlements FOR UPDATE
  USING (
    from_user = auth.uid()
    OR to_user = auth.uid()
    OR is_trip_organizer(trip_id)
  );

-- Organizers can delete settlements
CREATE POLICY "settlements_delete"
  ON settlements FOR DELETE
  USING (is_trip_organizer(trip_id));

-- ============================================================================
-- STORAGE POLICIES (for Supabase Storage buckets)
-- ============================================================================
-- Note: These need to be created via Supabase dashboard or storage API
-- They are included here for documentation purposes

-- Bucket: avatars (user profile pictures)
-- SELECT: public
-- INSERT: authenticated, file path must match user id
-- UPDATE: authenticated, file path must match user id
-- DELETE: authenticated, file path must match user id

-- Bucket: trip-covers (trip cover images)
-- SELECT: authenticated, must be trip member
-- INSERT: authenticated, must be trip organizer
-- UPDATE: authenticated, must be trip organizer
-- DELETE: authenticated, must be trip organizer

-- Bucket: attachments (activity attachments)
-- SELECT: authenticated, must be trip member
-- INSERT: authenticated, must be trip member
-- DELETE: authenticated, must be trip member or organizer

-- Bucket: receipts (expense receipts)
-- SELECT: authenticated, must be trip member
-- INSERT: authenticated, must be trip member
-- DELETE: authenticated, expense creator or organizer
