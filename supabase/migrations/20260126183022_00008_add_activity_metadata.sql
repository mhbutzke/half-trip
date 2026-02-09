ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN activities.metadata IS 'Structured metadata for activities (e.g., flight details: carrier, flight number, terminal, etc.)';;
