'use client';

/**
 * Notification Panel
 *
 * Displays a list of all notifications in a dropdown panel
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotificationStore } from '@/lib/notifications/notification-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Check,
  Trash2,
  Settings,
  DollarSign,
  Users,
  MapPin,
  StickyNote,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from '@/types/notification';

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

interface NotificationPanelProps {
  onOpenSettings?: () => void;
}

export function NotificationPanel({ onOpenSettings }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.getUnreadCount());
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Could navigate to the relevant page here
    // e.g., router.push(`/trip/${notification.tripId}`)
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-[1.25rem] rounded-full px-1 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Marcar todas como lidas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  clearAll();
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px]">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-2 p-3',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex w-full items-start gap-3">
                      <div
                        className={cn(
                          'rounded-full p-2',
                          !notification.read
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium leading-tight',
                              !notification.read && 'text-foreground'
                            )}
                          >
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </ScrollArea>
            {onOpenSettings && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onOpenSettings}
                  className="cursor-pointer justify-center"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações de notificações
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
