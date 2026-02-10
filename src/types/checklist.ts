export type ChecklistCategory = 'packing' | 'todo' | 'shopping' | 'documents' | 'other';

export interface TripChecklist {
  id: string;
  trip_id: string;
  name: string;
  description: string | null;
  category: ChecklistCategory;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  is_completed: boolean;
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
  quantity: number;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistWithItems extends TripChecklist {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
}
