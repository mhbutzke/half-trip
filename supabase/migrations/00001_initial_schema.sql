-- Half Trip - Initial Database Schema
-- Migration: 00001_initial_schema
-- Description: Creates all core tables for the Half Trip application

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user profile information (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar in Supabase Storage';

-- ============================================================================
-- TRIPS TABLE
-- ============================================================================
-- Core trip entity containing trip metadata
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  cover_url TEXT,
  style TEXT CHECK (style IN ('adventure', 'relaxation', 'cultural', 'gastronomic', 'other')),
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMPTZ,

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE trips IS 'Trips created by users';
COMMENT ON COLUMN trips.style IS 'Trip style: adventure, relaxation, cultural, gastronomic, other';
COMMENT ON COLUMN trips.archived_at IS 'When set, trip is archived and hidden from active list';

-- ============================================================================
-- TRIP MEMBERS TABLE
-- ============================================================================
-- Junction table for trip participants with roles
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  invited_by UUID REFERENCES users(id),

  CONSTRAINT unique_trip_member UNIQUE(trip_id, user_id)
);

COMMENT ON TABLE trip_members IS 'Trip participants with their roles';
COMMENT ON COLUMN trip_members.role IS 'organizer has full control, participant can add/view content';

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
-- Itinerary activities for trips
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  location TEXT,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('transport', 'accommodation', 'tour', 'meal', 'event', 'other')),
  links JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE activities IS 'Itinerary activities for trips';
COMMENT ON COLUMN activities.links IS 'Array of {url, label} objects for related links';
COMMENT ON COLUMN activities.sort_order IS 'Order within the day for drag-drop reordering';

-- ============================================================================
-- ACTIVITY ATTACHMENTS TABLE
-- ============================================================================
-- File attachments for activities (tickets, reservations, etc.)
CREATE TABLE activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE activity_attachments IS 'File attachments for activities';
COMMENT ON COLUMN activity_attachments.file_type IS 'MIME type of the file';
COMMENT ON COLUMN activity_attachments.file_size IS 'File size in bytes';

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
-- Expense records for trips
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('accommodation', 'food', 'transport', 'tickets', 'shopping', 'other')),
  paid_by UUID REFERENCES users(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE expenses IS 'Expense records for trips';
COMMENT ON COLUMN expenses.paid_by IS 'User who paid for this expense';
COMMENT ON COLUMN expenses.currency IS 'ISO 4217 currency code (default BRL)';

-- ============================================================================
-- EXPENSE SPLITS TABLE
-- ============================================================================
-- How expenses are split among participants
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  percentage DECIMAL(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_expense_split UNIQUE(expense_id, user_id)
);

COMMENT ON TABLE expense_splits IS 'How expenses are split among participants';
COMMENT ON COLUMN expense_splits.amount IS 'Calculated share amount for this user';
COMMENT ON COLUMN expense_splits.percentage IS 'Percentage share (for percentage-based splits)';

-- ============================================================================
-- TRIP NOTES TABLE
-- ============================================================================
-- General notes for trips
CREATE TABLE trip_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE trip_notes IS 'General notes for trips';

-- ============================================================================
-- TRIP INVITES TABLE
-- ============================================================================
-- Invitation links and email invites
CREATE TABLE trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  email TEXT,
  invited_by UUID REFERENCES users(id) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE trip_invites IS 'Invitation links for trips';
COMMENT ON COLUMN trip_invites.code IS 'Short unique invite code for sharing';
COMMENT ON COLUMN trip_invites.email IS 'Optional email for direct email invites';

-- ============================================================================
-- SETTLEMENTS TABLE
-- ============================================================================
-- Tracks debt settlements between participants
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  from_user UUID REFERENCES users(id) NOT NULL,
  to_user UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT different_users CHECK (from_user != to_user)
);

COMMENT ON TABLE settlements IS 'Debt settlements between trip participants';
COMMENT ON COLUMN settlements.from_user IS 'User who owes money';
COMMENT ON COLUMN settlements.to_user IS 'User who is owed money';
COMMENT ON COLUMN settlements.settled_at IS 'When the settlement was marked as paid';

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_notes_updated_at
  BEFORE UPDATE ON trip_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HANDLE NEW USER FUNCTION
-- ============================================================================
-- Function to create a user profile when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
