-- Half Trip - Create Trip RPC Function
-- Migration: 00007_create_trip_rpc
-- Description: Creates an RPC function to create trips with proper authentication

-- Function to create a trip and add the creator as organizer in a single transaction
-- Uses SECURITY DEFINER to bypass RLS and ensure atomic operation
CREATE OR REPLACE FUNCTION create_trip_with_member(
  p_name TEXT,
  p_destination TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_description TEXT DEFAULT NULL,
  p_style TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_trip_id UUID;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user exists in public.users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    -- Auto-create user profile from auth.users
    INSERT INTO users (id, email, name)
    SELECT id, email, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
    FROM auth.users
    WHERE id = v_user_id;
  END IF;

  -- Create the trip
  INSERT INTO trips (name, destination, start_date, end_date, description, style, created_by)
  VALUES (p_name, p_destination, p_start_date, p_end_date, p_description, p_style, v_user_id)
  RETURNING id INTO v_trip_id;

  -- Add creator as organizer
  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'organizer');

  RETURN v_trip_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_trip_with_member TO authenticated;
