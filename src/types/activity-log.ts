import type { TripActivityLog } from './database';

export type ActivityLogAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'joined'
  | 'left'
  | 'completed'
  | 'marked_paid'
  | 'marked_unpaid';

export type ActivityLogEntityType =
  | 'expense'
  | 'activity'
  | 'note'
  | 'checklist'
  | 'checklist_item'
  | 'settlement'
  | 'participant'
  | 'trip'
  | 'poll';

export interface ActivityLogEntry extends TripActivityLog {
  users: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface LogActivityInput {
  tripId: string;
  action: ActivityLogAction;
  entityType: ActivityLogEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}
