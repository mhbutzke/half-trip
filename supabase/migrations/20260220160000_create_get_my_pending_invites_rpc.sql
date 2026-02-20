-- RPC to fetch pending email invites for the currently authenticated user.
-- SECURITY DEFINER bypasses RLS (user is NOT yet a trip member).
-- Only returns invites matching the user's auth email.

CREATE OR REPLACE FUNCTION get_my_pending_invites()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  result jsonb;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  IF user_email IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ti.id,
      'code', ti.code,
      'trip_id', ti.trip_id,
      'expires_at', ti.expires_at,
      'created_at', ti.created_at,
      'trip', jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'destination', t.destination,
        'start_date', t.start_date,
        'end_date', t.end_date
      ),
      'inviter', jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'avatar_url', u.avatar_url
      )
    )
  ), '[]'::jsonb) INTO result
  FROM trip_invites ti
  JOIN trips t ON t.id = ti.trip_id
  JOIN users u ON u.id = ti.invited_by
  WHERE ti.email = lower(user_email)
    AND ti.accepted_at IS NULL
    AND ti.expires_at > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = ti.trip_id AND tm.user_id = auth.uid()
    );

  RETURN result;
END;
$$;
