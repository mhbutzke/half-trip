'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NoteWithCreator } from '@/lib/supabase/notes';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { PendingIndicator } from '@/components/sync';

interface NoteCardProps {
  note: NoteWithCreator;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function NoteCard({ note, canEdit, onEdit, onDelete }: NoteCardProps) {
  const createdAt = new Date(note.created_at);
  const updatedAt = new Date(note.updated_at);
  const wasEdited = note.updated_at !== note.created_at;
  const { isPending } = useSyncStatus('trip_notes', note.id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={note.users.avatar_url || undefined} alt={note.users.name} />
              <AvatarFallback className="text-xs">{getInitials(note.users.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{note.users.name}</span>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs text-muted-foreground"
                  title={format(createdAt, "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                >
                  {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                  {wasEdited && (
                    <span
                      className="ml-1"
                      title={`Editado em ${format(updatedAt, "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}`}
                    >
                      (editado)
                    </span>
                  )}
                </span>
                {isPending && <PendingIndicator isPending={isPending} size="sm" />}
              </div>
            </div>
          </div>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Opções da nota"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{note.content}</p>
      </CardContent>
    </Card>
  );
}
