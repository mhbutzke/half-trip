-- Half Trip - Sync Existing Users
-- Migration: 00006_sync_existing_users
-- Description: Inserts existing auth.users into public.users table

-- Insert any existing auth users that don't have a profile yet
INSERT INTO public.users (id, email, name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
