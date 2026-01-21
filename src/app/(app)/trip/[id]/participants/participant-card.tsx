'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Loader2, LogOut, MoreHorizontal, Shield, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  removeParticipant,
  promoteToOrganizer,
  type TripMemberWithUser,
} from '@/lib/supabase/trips';

interface ParticipantCardProps {
  member: TripMemberWithUser;
  userRole: 'organizer' | 'participant' | null;
  currentUserId: string;
  tripId: string;
  onLeaveClick: () => void;
}

export function ParticipantCard({
  member,
  userRole,
  currentUserId,
  tripId,
  onLeaveClick,
}: ParticipantCardProps) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);

  const isCurrentUser = member.user_id === currentUserId;
  const isOrganizer = member.role === 'organizer';
  const canManage = userRole === 'organizer' && !isCurrentUser;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const result = await removeParticipant(tripId, member.user_id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Participante removido');
        router.refresh();
      }
    } finally {
      setIsRemoving(false);
      setRemoveDialogOpen(false);
    }
  };

  const handlePromote = async () => {
    setIsPromoting(true);
    try {
      const result = await promoteToOrganizer(tripId, member.user_id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Participante promovido a organizador');
        router.refresh();
      }
    } finally {
      setIsPromoting(false);
      setPromoteDialogOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.users.avatar_url || undefined} />
            <AvatarFallback>{getInitials(member.users.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {member.users.name}
                {isCurrentUser && <span className="ml-1 text-muted-foreground">(você)</span>}
              </p>
              {isOrganizer && (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Organizador
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{member.users.email}</p>
          </div>
        </div>

        {/* Actions */}
        {(canManage || isCurrentUser) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Organizer actions for other members */}
              {canManage && !isOrganizer && (
                <>
                  <DropdownMenuItem onClick={() => setPromoteDialogOpen(true)}>
                    <Shield className="mr-2 h-4 w-4" />
                    Promover a organizador
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setRemoveDialogOpen(true)}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remover da viagem
                  </DropdownMenuItem>
                </>
              )}

              {/* Current user can leave */}
              {isCurrentUser && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onLeaveClick}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair da viagem
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover participante</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{member.users.name}</strong> desta viagem? Esta
              pessoa perderá acesso a todas as informações da viagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Confirmation Dialog */}
      <AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promover a organizador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja promover <strong>{member.users.name}</strong> a organizador?
              Organizadores podem editar a viagem, gerenciar participantes e despesas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} disabled={isPromoting}>
              {isPromoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Promover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
