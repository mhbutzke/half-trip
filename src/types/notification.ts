/**
 * Notification Types
 *
 * Defines the structure and types for in-app notifications
 */

export type NotificationType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_removed'
  | 'activity_added'
  | 'activity_updated'
  | 'activity_deleted'
  | 'note_added'
  | 'note_updated'
  | 'settlement_marked_paid'
  | 'settlement_marked_unpaid'
  | 'trip_updated'
  | 'invite_accepted'
  | 'sync_completed'
  | 'sync_failed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  tripId?: string;
  tripName?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSettings {
  enabled: boolean;
  expenseAdded: boolean;
  expenseUpdated: boolean;
  expenseDeleted: boolean;
  participantJoined: boolean;
  participantLeft: boolean;
  activityAdded: boolean;
  activityUpdated: boolean;
  activityDeleted: boolean;
  noteAdded: boolean;
  noteUpdated: boolean;
  settlementMarkPaid: boolean;
  tripUpdated: boolean;
  inviteAccepted: boolean;
  syncCompleted: boolean;
  syncFailed: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  expenseAdded: true,
  expenseUpdated: false,
  expenseDeleted: false,
  participantJoined: true,
  participantLeft: true,
  activityAdded: true,
  activityUpdated: false,
  activityDeleted: false,
  noteAdded: true,
  noteUpdated: false,
  settlementMarkPaid: true,
  tripUpdated: false,
  inviteAccepted: true,
  syncCompleted: false,
  syncFailed: true,
};
