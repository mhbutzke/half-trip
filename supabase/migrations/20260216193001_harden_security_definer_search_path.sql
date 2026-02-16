-- Harden SECURITY DEFINER functions by fixing search_path.
-- This prevents search_path hijacking for privileged helpers used in RLS and triggers.

CREATE OR REPLACE FUNCTION public.is_trip_member(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = trip_id
      AND trip_members.user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_trip_organizer(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'organizer'
  );
END;
$$;

-- Ensure authenticated users can execute helpers referenced by RLS policies.
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_organizer(uuid) TO authenticated;

-- Trigger helper to create user profiles on signup (SECURITY DEFINER hardening).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

