/**
 * Notification Store
 *
 * Zustand store for managing in-app notifications
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Notification,
  NotificationSettings,
  NotificationType,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/types/notification';

interface NotificationStore {
  // State
  notifications: Notification[];
  settings: NotificationSettings;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  clearOld: (days: number) => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;

  // Selectors
  getUnreadCount: () => number;
  getUnreadNotifications: () => Notification[];
  getNotificationsByTrip: (tripId: string) => Notification[];
}

const STORAGE_KEY = 'half-trip-notifications';

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      settings: DEFAULT_NOTIFICATION_SETTINGS,

      addNotification: (notification) => {
        const { settings } = get();

        // Check if notifications are enabled globally
        if (!settings.enabled) return;

        // Check if this specific notification type is enabled
        const typeKey = getSettingKeyForType(notification.type);
        if (typeKey && !settings[typeKey]) return;

        const newNotification: Notification = {
          ...notification,
          id: generateNotificationId(),
          createdAt: new Date(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      clearOld: (days) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        set((state) => ({
          notifications: state.notifications.filter((n) => new Date(n.createdAt) > cutoffDate),
        }));
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },

      getUnreadNotifications: () => {
        return get().notifications.filter((n) => !n.read);
      },

      getNotificationsByTrip: (tripId) => {
        return get().notifications.filter((n) => n.tripId === tripId);
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist notifications and settings, not functions
      partialize: (state) => ({
        notifications: state.notifications,
        settings: state.settings,
      }),
    }
  )
);

/**
 * Generate a unique notification ID
 */
function generateNotificationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Map notification type to settings key
 */
function getSettingKeyForType(type: NotificationType): keyof NotificationSettings | null {
  const mapping: Record<NotificationType, keyof NotificationSettings> = {
    expense_added: 'expenseAdded',
    expense_updated: 'expenseUpdated',
    expense_deleted: 'expenseDeleted',
    participant_joined: 'participantJoined',
    participant_left: 'participantLeft',
    participant_removed: 'participantLeft', // Use same setting
    activity_added: 'activityAdded',
    activity_updated: 'activityUpdated',
    activity_deleted: 'activityDeleted',
    note_added: 'noteAdded',
    note_updated: 'noteUpdated',
    settlement_marked_paid: 'settlementMarkPaid',
    settlement_marked_unpaid: 'settlementMarkPaid', // Use same setting
    trip_updated: 'tripUpdated',
    invite_accepted: 'inviteAccepted',
    sync_completed: 'syncCompleted',
    sync_failed: 'syncFailed',
  };

  return mapping[type] || null;
}
