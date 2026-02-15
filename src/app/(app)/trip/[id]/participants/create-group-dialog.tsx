'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createGroup, updateGroup } from '@/lib/supabase/groups';
import type { TripGroupWithMembers } from '@/lib/supabase/groups';
import type { TripParticipantResolved } from '@/lib/supabase/participants';

interface CreateGroupDialogProps {
  tripId: string;
  participants: TripParticipantResolved[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGroup?: TripGroupWithMembers;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CreateGroupDialog({
  tripId,
  participants,
  open,
  onOpenChange,
  editGroup,
}: CreateGroupDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEditMode = !!editGroup;

  // Build a map of participantId -> groupId for participants in OTHER groups
  const participantGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) {
      if (p.groupId && (!editGroup || p.groupId !== editGroup.id)) {
        map.set(p.id, p.groupId);
      }
    }
    return map;
  }, [participants, editGroup]);

  // Reset form when dialog opens/closes or editGroup changes
  useEffect(() => {
    if (open) {
      if (editGroup) {
        setName(editGroup.name);
        setSelectedIds(new Set(editGroup.memberParticipantIds));
      } else {
        setName('');
        setSelectedIds(new Set());
      }
      setValidationError(null);
    }
  }, [open, editGroup]);

  const handleToggle = (participantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('O nome do grupo é obrigatório');
      return;
    }

    if (selectedIds.size < 2) {
      setValidationError('Selecione pelo menos 2 participantes');
      return;
    }

    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedIds);

      if (isEditMode && editGroup) {
        const result = await updateGroup(tripId, editGroup.id, trimmedName, ids);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Grupo atualizado');
      } else {
        const result = await createGroup(tripId, trimmedName, ids);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Grupo criado');
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Erro ao salvar grupo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            {isEditMode ? 'Editar Grupo' : 'Criar Grupo'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Altere o nome ou os membros do grupo.'
              : 'Agrupe participantes para organizar melhor a viagem.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">
              Nome do grupo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              placeholder="Ex: Família, Quarto 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Participantes <span className="text-destructive">*</span>
            </Label>
            <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
              {participants.map((participant) => {
                const isInOtherGroup = participantGroupMap.has(participant.id);
                const isSelected = selectedIds.has(participant.id);
                const isDisabled = isInOtherGroup && !isSelected;

                return (
                  <label
                    key={participant.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors ${
                      isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        if (!isDisabled) {
                          handleToggle(participant.id);
                        }
                      }}
                      disabled={isDisabled}
                    />
                    <Avatar className="h-8 w-8">
                      {participant.displayAvatar && (
                        <AvatarImage src={participant.displayAvatar} alt="" />
                      )}
                      <AvatarFallback className="text-xs">
                        {participant.displayName ? (
                          getInitials(participant.displayName)
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {participant.displayName}
                        </span>
                        {participant.type === 'guest' && (
                          <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px]">
                            Convidado
                          </Badge>
                        )}
                      </div>
                      {isDisabled && (
                        <p className="text-xs text-muted-foreground">(já pertence a outro grupo)</p>
                      )}
                    </div>
                  </label>
                );
              })}

              {participants.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum participante na viagem.
                </p>
              )}
            </div>

            {validationError && <p className="text-sm text-destructive">{validationError}</p>}

            <p className="text-xs text-muted-foreground">
              Selecione pelo menos 2 participantes para formar um grupo.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
