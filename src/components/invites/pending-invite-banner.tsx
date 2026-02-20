'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, MapPin, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyPendingInvites, type PendingInviteInfo } from '@/lib/supabase/invites';
import { routes } from '@/lib/routes';

export function PendingInviteBanner() {
  const [invites, setInvites] = useState<PendingInviteInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyPendingInvites()
      .then(setInvites)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-28 shrink-0" />
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) return null;

  return (
    <div className="space-y-3">
      {invites.map((invite) => (
        <Card key={invite.id} className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={invite.inviter.avatar_url || undefined} />
              <AvatarFallback>{invite.inviter.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium truncate">{invite.inviter.name} convidou você</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                <p className="text-xs text-muted-foreground truncate">
                  {invite.trip.name} &middot; {invite.trip.destination}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expira{' '}
                {formatDistanceToNow(new Date(invite.expires_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>

            <Button asChild size="sm" className="shrink-0">
              <Link href={routes.invite(invite.code)}>
                <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Aceitar
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
