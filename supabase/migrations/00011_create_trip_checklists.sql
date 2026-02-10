-- Checklists container table
CREATE TABLE trip_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('packing', 'todo', 'shopping', 'documents', 'other')),
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Checklist items table
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES trip_checklists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  assigned_to UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  quantity INTEGER DEFAULT 1 NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_trip_checklists_trip_id ON trip_checklists(trip_id);
CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_assigned_to ON checklist_items(assigned_to);

-- RLS
ALTER TABLE trip_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Checklists: trip members can view and create
CREATE POLICY "trip_checklists_select"
  ON trip_checklists FOR SELECT
  USING (is_trip_member(trip_id));

CREATE POLICY "trip_checklists_insert"
  ON trip_checklists FOR INSERT
  WITH CHECK (is_trip_member(trip_id));

CREATE POLICY "trip_checklists_update"
  ON trip_checklists FOR UPDATE
  USING (is_trip_organizer(trip_id) OR created_by = auth.uid());

CREATE POLICY "trip_checklists_delete"
  ON trip_checklists FOR DELETE
  USING (is_trip_organizer(trip_id) OR created_by = auth.uid());

-- Items: access via checklist's trip membership
CREATE POLICY "checklist_items_select"
  ON checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_checklists tc
      WHERE tc.id = checklist_id
      AND is_trip_member(tc.trip_id)
    )
  );

CREATE POLICY "checklist_items_insert"
  ON checklist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_checklists tc
      WHERE tc.id = checklist_id
      AND is_trip_member(tc.trip_id)
    )
  );

CREATE POLICY "checklist_items_update"
  ON checklist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_checklists tc
      WHERE tc.id = checklist_id
      AND is_trip_member(tc.trip_id)
    )
  );

CREATE POLICY "checklist_items_delete"
  ON checklist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_checklists tc
      WHERE tc.id = checklist_id
      AND (is_trip_organizer(tc.trip_id) OR checklist_items.created_by = auth.uid())
    )
  );

-- Triggers
CREATE TRIGGER update_trip_checklists_updated_at
  BEFORE UPDATE ON trip_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
