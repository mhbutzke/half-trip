'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MoreHorizontal, Pencil, Trash2, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteGroup } from '@/lib/supabase/groups';
import { CreateGroupDialog } from './create-group-dialog';
import type { TripGroupWithMembers } from '@/lib/supabase/groups';
import type { TripParticipantResolved } from '@/lib/supabase/participants';

interface GroupCardProps {
  group: TripGroupWithMembers;
  participants: TripParticipantResolved[];
  tripId: string;
  canManage: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function GroupCard({ group, participants, tripId, canManage }: GroupCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Resolve member participant IDs to full participant objects
  const memberParticipants = participants.filter((p) => group.memberParticipantIds.includes(p.id));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteGroup(tripId, group.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Grupo "${group.name}" removido`);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
      setRemoveDialogOpen(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{group.name}</p>
              <p className="text-sm text-muted-foreground">
                {memberParticipants.length} {memberParticipants.length === 1 ? 'membro' : 'membros'}
              </p>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 sm:h-8 sm:w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações do grupo</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setRemoveDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Member list */}
        {memberParticipants.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {memberParticipants.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-1 pr-2.5 text-sm"
              >
                <Avatar className="h-6 w-6">
                  {member.displayAvatar && <AvatarImage src={member.displayAvatar} alt="" />}
                  <AvatarFallback className="text-[10px]">
                    {member.displayName ? (
                      getInitials(member.displayName)
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate">{member.displayName}</span>
                {member.type === 'guest' && (
                  <Badge variant="outline" className="ml-0.5 px-1 py-0 text-[10px]">
                    Convidado
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover grupo</AlertDialogTitle>
            <AlertDialogDescription>
              {`Tem certeza que deseja remover o grupo "${group.name}"? Os participantes não serão removidos da viagem, apenas deixarão de pertencer a este grupo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {canManage && (
        <CreateGroupDialog
          tripId={tripId}
          participants={participants}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          editGroup={group}
        />
      )}
    </>
  );
}
