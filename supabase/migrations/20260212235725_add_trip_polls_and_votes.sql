-- Create polls table
CREATE TABLE public.trip_polls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_multiple boolean DEFAULT false,
  closes_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create votes table
CREATE TABLE public.poll_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.trip_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(poll_id, user_id, option_index)
);

-- Indexes
CREATE INDEX idx_trip_polls_trip ON public.trip_polls(trip_id, created_at DESC);
CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);

-- RLS
ALTER TABLE public.trip_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view polls"
  ON public.trip_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_polls.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can create polls"
  ON public.trip_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_polls.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator or organizer can delete polls"
  ON public.trip_polls FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_polls.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'organizer'
    )
  );

CREATE POLICY "Trip members can view votes"
  ON public.poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_polls
      JOIN public.trip_members ON trip_members.trip_id = trip_polls.trip_id
      WHERE trip_polls.id = poll_votes.poll_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can vote"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_polls
      JOIN public.trip_members ON trip_members.trip_id = trip_polls.trip_id
      WHERE trip_polls.id = poll_votes.poll_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own votes"
  ON public.poll_votes FOR DELETE
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
