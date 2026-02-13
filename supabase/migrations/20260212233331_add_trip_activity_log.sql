-- Create activity log table for trip timeline
CREATE TABLE public.trip_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast trip-scoped queries ordered by time
CREATE INDEX idx_trip_activity_log_trip_created
  ON public.trip_activity_log(trip_id, created_at DESC);

-- RLS policies
ALTER TABLE public.trip_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view activity log"
  ON public.trip_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_activity_log.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert activity log"
  ON public.trip_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_activity_log.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_activity_log;
