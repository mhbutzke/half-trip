'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link2, Loader2, Mail, Plus, Trash2, UserPlus } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyInviteLink } from './copy-invite-link';
import { InviteByEmailForm } from './invite-by-email-form';
import {
  createInviteLink,
  getTripInvites,
  getEmailInvites,
  revokeInvite,
  type TripInviteWithInviter,
} from '@/lib/supabase/invites';
import { usePermissions } from '@/hooks/use-permissions';

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
  const [linkInvites, setLinkInvites] = useState<TripInviteWithInviter[]>([]);
  const [emailInvites, setEmailInvites] = useState<TripInviteWithInviter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const permissions = usePermissions({ userRole, currentUserId });

  const loadInvites = useCallback(async () => {
    setIsLoading(true);
    try {
      const [linkData, emailData] = await Promise.all([
        getTripInvites(tripId),
        getEmailInvites(tripId),
      ]);
      // Filter link invites to exclude those that have emails
      setLinkInvites(linkData.filter((inv) => !inv.email));
      setEmailInvites(emailData);
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
        setLinkInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        setEmailInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        if (newInviteUrl && linkInvites.find((inv) => inv.id === inviteId)) {
          setNewInviteUrl(null);
        }
      }
    } finally {
      setRevokingId(null);
    }
  };

  const canRevokeInvite = (invite: TripInviteWithInviter) => {
    return permissions.canRevokeInvite(invite.invited_by);
  };

  const handleEmailSuccess = () => {
    loadInvites();
  };

  const renderInviteItem = (invite: TripInviteWithInviter, isEmail: boolean) => (
    <div key={invite.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-6 w-6">
          <AvatarImage src={invite.users?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {invite.users?.name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">
            {isEmail ? invite.email : `/invite/${invite.code}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Expira{' '}
            {formatDistanceToNow(new Date(invite.expires_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>
      {canRevokeInvite(invite) && (
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
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar participantes
          </DialogTitle>
          <DialogDescription>
            Convide pessoas para participar da viagem por link ou email.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
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

            {/* Existing link invites section */}
            {linkInvites.length > 0 && (
              <>
                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Links ativos ({linkInvites.length})
                  </h4>

                  <ScrollArea className="max-h-[150px]">
                    <div className="space-y-2">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        linkInvites.map((invite) => renderInviteItem(invite, false))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            {/* Email invite form */}
            <InviteByEmailForm tripId={tripId} onSuccess={handleEmailSuccess} />

            {/* Existing email invites section */}
            {emailInvites.length > 0 && (
              <>
                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Convites por email ({emailInvites.length})
                  </h4>

                  <ScrollArea className="max-h-[150px]">
                    <div className="space-y-2">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        emailInvites.map((invite) => renderInviteItem(invite, true))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
