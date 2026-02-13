'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { votePoll, deletePoll } from '@/lib/supabase/polls';
import { toast } from 'sonner';
import type { PollWithVotes } from '@/types/poll';

interface PollCardProps {
  poll: PollWithVotes;
  currentUserId: string;
  isOrganizer: boolean;
  onUpdate: () => void;
}

export function PollCard({ poll, currentUserId, isOrganizer, onUpdate }: PollCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = poll.created_by === currentUserId || isOrganizer;
  const hasVoted = poll.userVotes.length > 0;
  const maxVotes = Math.max(...poll.voteCounts, 1);

  const handleVote = async (optionIndex: number) => {
    if (poll.isClosed) return;
    setIsVoting(true);
    try {
      const result = await votePoll(poll.id, optionIndex);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onUpdate();
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePoll(poll.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Votação removida');
      onUpdate();
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={poll.users.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{getInitials(poll.users.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{poll.question}</p>
              <p className="text-xs text-muted-foreground">
                {poll.users.name.split(' ')[0]} &bull;{' '}
                {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {poll.isClosed && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                Encerrada
              </Badge>
            )}
            {poll.allow_multiple && (
              <Badge variant="outline" className="text-xs">
                Múltipla
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {poll.options.map((option, index) => {
          const count = poll.voteCounts[index] || 0;
          const percentage = poll.totalVotes > 0 ? (count / poll.totalVotes) * 100 : 0;
          const isUserVote = poll.userVotes.includes(index);
          const isWinning = count === maxVotes && count > 0;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={isVoting || poll.isClosed}
              className={`relative w-full overflow-hidden rounded-lg border p-3 text-left transition-colors ${
                isUserVote ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              } ${poll.isClosed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className={`text-sm ${isWinning ? 'font-semibold' : ''}`}>{option.text}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {count} voto{count !== 1 ? 's' : ''}
                </span>
              </div>
              {(hasVoted || poll.isClosed) && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    isWinning ? 'bg-primary/15' : 'bg-muted/50'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}
            </button>
          );
        })}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {poll.totalVotes} participante{poll.totalVotes !== 1 ? 's' : ''} votaram
          </p>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
              aria-label="Excluir votação"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
