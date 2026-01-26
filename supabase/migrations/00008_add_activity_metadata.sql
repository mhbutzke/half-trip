-- Migration: 00008_add_activity_metadata
-- Description: Adds a metadata column to the activities table to store structured data like flight details

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN activities.metadata IS 'Structured metadata for activities (e.g., flight details: carrier, flight number, terminal, etc.)';
