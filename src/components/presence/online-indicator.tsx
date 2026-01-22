'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PresenceUser } from '@/hooks/use-trip-presence';

type OnlineIndicatorProps = {
  onlineUsers: PresenceUser[];
  maxVisible?: number;
};

/**
 * Component to display online users with avatars and green indicator dots
 */
export function OnlineIndicator({ onlineUsers, maxVisible = 5 }: OnlineIndicatorProps) {
  if (onlineUsers.length === 0) {
    return null;
  }

  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const remainingCount = onlineUsers.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Green online indicator dot */}
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground">Online agora</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                {remainingCount === 1
                  ? 'Mais 1 pessoa online'
                  : `Mais ${remainingCount} pessoas online`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
