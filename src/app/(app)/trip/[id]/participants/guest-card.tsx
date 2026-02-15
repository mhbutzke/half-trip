'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MoreHorizontal, Pencil, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { removeGuest, updateGuest } from '@/lib/supabase/participants';
import type { TripParticipantResolved } from '@/lib/supabase/participants';

interface GuestCardProps {
  guest: TripParticipantResolved;
  tripId: string;
  canManage: boolean;
}

export function GuestCard({ guest, tripId, canManage }: GuestCardProps) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(guest.displayName);
  const [editEmail, setEditEmail] = useState(guest.displayEmail || '');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const result = await removeGuest(tripId, guest.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${guest.displayName} removido`);
        router.refresh();
      }
    } finally {
      setIsRemoving(false);
      setRemoveDialogOpen(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsEditing(true);
    try {
      const result = await updateGuest(
        tripId,
        guest.id,
        trimmedName,
        editEmail.trim() || undefined
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Convidado atualizado');
        setEditDialogOpen(false);
        router.refresh();
      }
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="h-10 w-10">
            {guest.displayAvatar && <AvatarImage src={guest.displayAvatar} alt="" />}
            <AvatarFallback>
              {guest.displayName ? getInitials(guest.displayName) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium">{guest.displayName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                Convidado
              </Badge>
            </div>
            {guest.displayEmail && (
              <p className="mt-1 break-all text-sm text-muted-foreground">{guest.displayEmail}</p>
            )}
          </div>
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 sm:h-8 sm:w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditName(guest.displayName);
                  setEditEmail(guest.displayEmail || '');
                  setEditDialogOpen(true);
                }}
              >
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

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover convidado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{guest.displayName}</strong>? As despesas
              associadas a este convidado também serão afetadas.
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Convidado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${guest.id}`}>
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`edit-name-${guest.id}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isEditing}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-email-${guest.id}`}>Email (opcional)</Label>
              <Input
                id={`edit-email-${guest.id}`}
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={isEditing}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={isEditing}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isEditing || !editName.trim()}>
                {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
