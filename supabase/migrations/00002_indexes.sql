-- Half Trip - Database Indexes
-- Migration: 00002_indexes
-- Description: Creates indexes for common query patterns

-- ============================================================================
-- USERS INDEXES
-- ============================================================================
-- Email lookups (unique constraint already creates an index)
-- No additional indexes needed

-- ============================================================================
-- TRIPS INDEXES
-- ============================================================================
-- Filter trips by creator
CREATE INDEX idx_trips_created_by ON trips(created_by);
-- Filter active vs archived trips
CREATE INDEX idx_trips_archived_at ON trips(archived_at) WHERE archived_at IS NULL;
-- Sort trips by date
CREATE INDEX idx_trips_start_date ON trips(start_date DESC);
-- ============================================================================
-- TRIP MEMBERS INDEXES
-- ============================================================================
-- Get all members of a trip (most common query)
CREATE INDEX idx_trip_members_trip_id ON trip_members(trip_id);
-- Get all trips for a user (for trips list page)
CREATE INDEX idx_trip_members_user_id ON trip_members(user_id);
-- Filter by role (find organizers)
CREATE INDEX idx_trip_members_role ON trip_members(trip_id, role);
-- ============================================================================
-- ACTIVITIES INDEXES
-- ============================================================================
-- Get all activities for a trip (main itinerary query)
CREATE INDEX idx_activities_trip_id ON activities(trip_id);
-- Sort activities by date and order within day
CREATE INDEX idx_activities_trip_date_order ON activities(trip_id, date, sort_order);
-- Filter by category
CREATE INDEX idx_activities_category ON activities(trip_id, category);
-- ============================================================================
-- ACTIVITY ATTACHMENTS INDEXES
-- ============================================================================
-- Get all attachments for an activity
CREATE INDEX idx_activity_attachments_activity_id ON activity_attachments(activity_id);
-- ============================================================================
-- EXPENSES INDEXES
-- ============================================================================
-- Get all expenses for a trip (main expenses list query)
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
-- Sort expenses by date
CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, date DESC);
-- Filter by who paid
CREATE INDEX idx_expenses_paid_by ON expenses(trip_id, paid_by);
-- Filter by category
CREATE INDEX idx_expenses_category ON expenses(trip_id, category);
-- ============================================================================
-- EXPENSE SPLITS INDEXES
-- ============================================================================
-- Get all splits for an expense
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
-- Get all splits for a user (for balance calculation)
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
-- ============================================================================
-- TRIP NOTES INDEXES
-- ============================================================================
-- Get all notes for a trip
CREATE INDEX idx_trip_notes_trip_id ON trip_notes(trip_id);
-- Sort notes by creation date
CREATE INDEX idx_trip_notes_created_at ON trip_notes(trip_id, created_at DESC);
-- ============================================================================
-- TRIP INVITES INDEXES
-- ============================================================================
-- Look up invite by code (most common for invite acceptance)
CREATE INDEX idx_trip_invites_code ON trip_invites(code) WHERE accepted_at IS NULL;
-- Get all invites for a trip
CREATE INDEX idx_trip_invites_trip_id ON trip_invites(trip_id);
-- Check for existing email invites
CREATE INDEX idx_trip_invites_email ON trip_invites(trip_id, email) WHERE email IS NOT NULL;
-- ============================================================================
-- SETTLEMENTS INDEXES
-- ============================================================================
-- Get all settlements for a trip
CREATE INDEX idx_settlements_trip_id ON settlements(trip_id);
-- Get settlements for a user (debts they owe)
CREATE INDEX idx_settlements_from_user ON settlements(trip_id, from_user);
-- Get settlements for a user (money owed to them)
CREATE INDEX idx_settlements_to_user ON settlements(trip_id, to_user);
-- Filter unsettled debts
CREATE INDEX idx_settlements_unsettled ON settlements(trip_id) WHERE settled_at IS NULL;
