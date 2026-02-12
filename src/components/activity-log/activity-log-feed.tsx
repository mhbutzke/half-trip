'use client';

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign,
  MapPin,
  StickyNote,
  CheckSquare,
  Check,
  ArrowLeftRight,
  Users,
  Plane,
  Activity,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTripActivityLog } from '@/lib/supabase/activity-log';
import { getLogMessage } from '@/lib/utils/activity-log-labels';
import type { ActivityLogEntry } from '@/types/activity-log';

const iconMap: Record<string, LucideIcon> = {
  expense: DollarSign,
  activity: MapPin,
  note: StickyNote,
  checklist: CheckSquare,
  checklist_item: Check,
  settlement: ArrowLeftRight,
  participant: Users,
  trip: Plane,
};

interface ActivityLogFeedProps {
  tripId: string;
  initialEntries: ActivityLogEntry[];
  initialHasMore: boolean;
}

export function ActivityLogFeed({ tripId, initialEntries, initialHasMore }: ActivityLogFeedProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getTripActivityLog(tripId, 30, entries.length);
      setEntries((prev) => [...prev, ...result.entries]);
      setHasMore(result.hasMore);
    } finally {
      setIsLoading(false);
    }
  }, [tripId, entries.length]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
          <p>Nenhuma atividade recente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Atividade recente</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {entries.map((entry) => {
              const Icon = iconMap[entry.entity_type] || Activity;
              const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className="relative mt-0.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.users.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.users.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{entry.users.name.split(' ')[0]}</span>{' '}
                      <span className="text-muted-foreground">
                        {getLogMessage(entry.action, entry.entity_type, metadata)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={loadMore} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {isLoading ? 'Carregando...' : 'Ver mais'}
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
