'use client';

/**
 * Notification Toast
 *
 * Displays individual notifications as toast messages
 * Uses sonner for toast functionality
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useNotificationStore } from '@/lib/notifications/notification-store';
import { Notification } from '@/types/notification';
import {
  Bell,
  DollarSign,
  Users,
  MapPin,
  StickyNote,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'expense_added':
    case 'expense_updated':
    case 'expense_deleted':
    case 'settlement_marked_paid':
    case 'settlement_marked_unpaid':
      return DollarSign;

    case 'participant_joined':
    case 'participant_left':
    case 'participant_removed':
      return Users;

    case 'activity_added':
    case 'activity_updated':
    case 'activity_deleted':
      return MapPin;

    case 'note_added':
    case 'note_updated':
      return StickyNote;

    case 'sync_completed':
      return CheckCircle;

    case 'sync_failed':
      return AlertCircle;

    case 'trip_updated':
    case 'invite_accepted':
      return Info;

    default:
      return Bell;
  }
}

/**
 * Get toast variant for notification type
 */
function getToastVariant(type: Notification['type']): 'default' | 'success' | 'error' | 'info' {
  switch (type) {
    case 'expense_added':
    case 'participant_joined':
    case 'activity_added':
    case 'note_added':
    case 'settlement_marked_paid':
    case 'invite_accepted':
    case 'sync_completed':
      return 'success';

    case 'expense_deleted':
    case 'participant_left':
    case 'participant_removed':
    case 'activity_deleted':
    case 'sync_failed':
      return 'error';

    case 'expense_updated':
    case 'activity_updated':
    case 'note_updated':
    case 'trip_updated':
    case 'settlement_marked_unpaid':
      return 'info';

    default:
      return 'default';
  }
}

/**
 * NotificationToastListener
 *
 * Component that listens for new notifications and displays them as toasts
 * Should be mounted once in the app layout
 */
export function NotificationToastListener() {
  const notifications = useNotificationStore((state) => state.notifications);

  useEffect(() => {
    // Get the latest notification (most recent)
    const latest = notifications[0];

    // Only show toast for unread notifications
    if (latest && !latest.read) {
      const Icon = getNotificationIcon(latest.type);
      const variant = getToastVariant(latest.type);

      // Show toast based on variant
      switch (variant) {
        case 'success':
          toast.success(latest.title, {
            description: latest.message,
            icon: <Icon className="h-5 w-5" />,
          });
          break;
        case 'error':
          toast.error(latest.title, {
            description: latest.message,
            icon: <Icon className="h-5 w-5" />,
          });
          break;
        case 'info':
          toast.info(latest.title, {
            description: latest.message,
            icon: <Icon className="h-5 w-5" />,
          });
          break;
        default:
          toast(latest.title, {
            description: latest.message,
            icon: <Icon className="h-5 w-5" />,
          });
      }
    }
    // Only trigger when the notifications array changes (new notification added)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  return null;
}
