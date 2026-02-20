-- Half Trip - Hash invite codes for defense in depth
-- Migration: 20260220120001_hash_invite_codes
-- Description: Adds code_hash column to trip_invites for hashed token storage.
--              New invites store SHA-256 hash; code column kept for transition (7-day expiry).
--              Updates get_invite_by_code RPC to look up by hash first, then plain code.

-- 1. Add code_hash column
ALTER TABLE trip_invites ADD COLUMN IF NOT EXISTS code_hash text;

-- 2. Create index on code_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_trip_invites_code_hash ON trip_invites (code_hash);

-- 3. Backfill existing invites with hashes (so they can be found by hash too)
UPDATE trip_invites
SET code_hash = encode(sha256(code::bytea), 'hex')
WHERE code IS NOT NULL AND code_hash IS NULL;

-- 4. Update RPC to look up by hash first, fallback to plain code for transition
CREATE OR REPLACE FUNCTION get_invite_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  p_code_hash text;
BEGIN
  -- Compute hash of the provided code
  p_code_hash := encode(sha256(p_code::bytea), 'hex');

  -- Look up by hash first (new invites), then by plain code (legacy)
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
  WHERE ti.code_hash = p_code_hash
     OR ti.code = p_code
  LIMIT 1;

  RETURN result;
END;
$$;
