-- Cache for Google Places API details (TTL 7 days per Google ToS)
CREATE TABLE place_details_cache (
  place_id TEXT PRIMARY KEY,
  name TEXT,
  formatted_address TEXT,
  rating NUMERIC(2, 1),
  user_ratings_total INTEGER,
  website TEXT,
  formatted_phone_number TEXT,
  opening_hours JSONB,
  photo_references JSONB,
  price_level INTEGER,
  types TEXT[],
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Index for expiration cleanup
CREATE INDEX idx_place_details_cache_expires ON place_details_cache(expires_at);

-- RLS
ALTER TABLE place_details_cache ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cached data
CREATE POLICY "Authenticated users can read place cache"
  ON place_details_cache FOR SELECT
  TO authenticated
  USING (true);

-- Service role can manage cache entries
CREATE POLICY "Service role can manage place cache"
  ON place_details_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
