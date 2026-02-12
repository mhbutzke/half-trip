-- Add transport_type to trips
-- Allows users to specify the primary transport mode for a trip
-- When transport is 'car' or 'bus', flight search is hidden in the itinerary
ALTER TABLE trips ADD COLUMN transport_type TEXT NOT NULL DEFAULT 'plane'
  CONSTRAINT trips_transport_type_check CHECK (transport_type IN ('car', 'plane', 'bus', 'mixed'));

COMMENT ON COLUMN trips.transport_type IS 'Primary transport mode: car, plane, bus, or mixed';
