-- Trip budgets table
CREATE TABLE trip_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('accommodation', 'food', 'transport', 'tickets', 'shopping', 'other', 'total')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_trip_budget UNIQUE(trip_id, category)
);

COMMENT ON TABLE trip_budgets IS 'Budget limits for trips (total or per category)';
COMMENT ON COLUMN trip_budgets.category IS 'Budget category; "total" means overall trip budget';

-- Indexes
CREATE INDEX idx_trip_budgets_trip_id ON trip_budgets(trip_id);

-- RLS
ALTER TABLE trip_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_budgets_select"
  ON trip_budgets FOR SELECT
  USING (is_trip_member(trip_id));

CREATE POLICY "trip_budgets_insert"
  ON trip_budgets FOR INSERT
  WITH CHECK (is_trip_organizer(trip_id));

CREATE POLICY "trip_budgets_update"
  ON trip_budgets FOR UPDATE
  USING (is_trip_organizer(trip_id));

CREATE POLICY "trip_budgets_delete"
  ON trip_budgets FOR DELETE
  USING (is_trip_organizer(trip_id));

-- Updated_at trigger
CREATE TRIGGER update_trip_budgets_updated_at
  BEFORE UPDATE ON trip_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
