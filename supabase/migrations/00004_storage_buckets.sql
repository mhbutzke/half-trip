-- Half Trip - Storage Buckets and Policies
-- Migration: 00004_storage_buckets
-- Description: Creates storage buckets and RLS policies for file uploads

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Avatars bucket (user profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket for avatar URLs
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- Trip covers bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-covers',
  'trip-covers',
  true,  -- Public for easy sharing
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- Activity attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,  -- Private bucket
  20971520,  -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- Receipts bucket (expense receipts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,  -- Private bucket
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- ============================================================================
-- AVATARS BUCKET POLICIES
-- ============================================================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
-- Users can upload their own avatar (folder must match user id)
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- Users can update their own avatar
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- Users can delete their own avatar
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- ============================================================================
-- TRIP COVERS BUCKET POLICIES
-- ============================================================================

-- Anyone can view trip covers (public bucket)
CREATE POLICY "trip_covers_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-covers');
-- Trip organizers can upload covers (folder must be trip_id)
CREATE POLICY "trip_covers_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trip-covers'
    AND is_trip_organizer((storage.foldername(name))[1]::uuid)
  );
-- Trip organizers can update covers
CREATE POLICY "trip_covers_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'trip-covers'
    AND is_trip_organizer((storage.foldername(name))[1]::uuid)
  )
  WITH CHECK (
    bucket_id = 'trip-covers'
    AND is_trip_organizer((storage.foldername(name))[1]::uuid)
  );
-- Trip organizers can delete covers
CREATE POLICY "trip_covers_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trip-covers'
    AND is_trip_organizer((storage.foldername(name))[1]::uuid)
  );
-- ============================================================================
-- ATTACHMENTS BUCKET POLICIES
-- ============================================================================

-- Trip members can view attachments (folder is trip_id)
CREATE POLICY "attachments_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND is_trip_member((storage.foldername(name))[1]::uuid)
  );
-- Trip members can upload attachments
CREATE POLICY "attachments_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND is_trip_member((storage.foldername(name))[1]::uuid)
  );
-- Trip members can delete attachments (or restrict to organizer if needed)
CREATE POLICY "attachments_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND is_trip_member((storage.foldername(name))[1]::uuid)
  );
-- ============================================================================
-- RECEIPTS BUCKET POLICIES
-- ============================================================================

-- Trip members can view receipts (folder is trip_id)
CREATE POLICY "receipts_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND is_trip_member((storage.foldername(name))[1]::uuid)
  );
-- Trip members can upload receipts
CREATE POLICY "receipts_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND is_trip_member((storage.foldername(name))[1]::uuid)
  );
-- Trip members can delete receipts (expense creator or organizer should be validated in app)
CREATE POLICY "receipts_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND is_trip_member((storage.foldername(name))[1]::uuid)
  );
