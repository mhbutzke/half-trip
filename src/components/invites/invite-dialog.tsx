'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link2, Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CopyInviteLink } from './copy-invite-link';
import {
  createInviteLink,
  getTripInvites,
  revokeInvite,
  type TripInviteWithInviter,
} from '@/lib/supabase/invites';

interface InviteDialogProps {
  tripId: string;
  tripName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: 'organizer' | 'participant' | null;
  currentUserId?: string;
}

export function InviteDialog({
  tripId,
  tripName,
  open,
  onOpenChange,
  userRole,
  currentUserId,
}: InviteDialogProps) {
  const [invites, setInvites] = useState<TripInviteWithInviter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTripInvites(tripId);
      setInvites(data);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (open) {
      loadInvites();
      setNewInviteUrl(null);
    }
  }, [open, loadInvites]);

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const result = await createInviteLink(tripId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.inviteUrl) {
        setNewInviteUrl(result.inviteUrl);
        await loadInvites();
        toast.success('Link de convite criado!');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setRevokingId(inviteId);
    try {
      const result = await revokeInvite(inviteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Convite revogado');
        setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        if (newInviteUrl && invites.find((inv) => inv.id === inviteId)) {
          setNewInviteUrl(null);
        }
      }
    } finally {
      setRevokingId(null);
    }
  };

  const canRevoke = (invite: TripInviteWithInviter) => {
    return userRole === 'organizer' || invite.invited_by === currentUserId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar participantes
          </DialogTitle>
          <DialogDescription>
            Crie um link de convite para compartilhar com amigos e familiares.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new invite section */}
          <div className="space-y-3">
            {newInviteUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Compartilhe este link para convidar pessoas:
                </p>
                <CopyInviteLink inviteUrl={newInviteUrl} tripName={tripName} />
                <p className="text-xs text-muted-foreground">O link expira em 7 dias.</p>
              </div>
            ) : (
              <Button onClick={handleCreateLink} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando link...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar link de convite
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Existing invites section */}
          {invites.length > 0 && (
            <>
              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Links ativos ({invites.length})
                </h4>

                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      invites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between gap-2 rounded-lg border p-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={invite.users?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {invite.users?.name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-mono truncate">/invite/{invite.code}</p>
                              <p className="text-xs text-muted-foreground">
                                Expira{' '}
                                {formatDistanceToNow(new Date(invite.expires_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          </div>
                          {canRevoke(invite) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRevoke(invite.id)}
                              disabled={revokingId === invite.id}
                              aria-label="Revogar convite"
                            >
                              {revokingId === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
