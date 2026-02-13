'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [displayPoll, setDisplayPoll] = useState(poll);
  const optimisticLockUntilRef = useRef(0);

  useEffect(() => {
    setDisplayPoll((current) => {
      if (current.id === poll.id && Date.now() < optimisticLockUntilRef.current) {
        return current;
      }
      return poll;
    });
  }, [poll]);

  const canDelete = displayPoll.created_by === currentUserId || isOrganizer;
  const hasVoted = displayPoll.userVotes.length > 0;
  const maxVotes = Math.max(...displayPoll.voteCounts, 1);

  const applyOptimisticVote = (optionIndex: number) => {
    optimisticLockUntilRef.current = Date.now() + 30_000;
    setDisplayPoll((current) => {
      const voteCounts = [...current.voteCounts];
      const previousUserVotes = [...current.userVotes];
      const hadVote = previousUserVotes.length > 0;

      let nextUserVotes: number[];

      if (current.allow_multiple) {
        if (previousUserVotes.includes(optionIndex)) {
          nextUserVotes = previousUserVotes.filter((vote) => vote !== optionIndex);
          voteCounts[optionIndex] = Math.max(0, (voteCounts[optionIndex] || 0) - 1);
        } else {
          nextUserVotes = [...previousUserVotes, optionIndex];
          voteCounts[optionIndex] = (voteCounts[optionIndex] || 0) + 1;
        }
      } else {
        for (const previousVote of previousUserVotes) {
          voteCounts[previousVote] = Math.max(0, (voteCounts[previousVote] || 0) - 1);
        }
        nextUserVotes = [optionIndex];
        voteCounts[optionIndex] = (voteCounts[optionIndex] || 0) + 1;
      }

      const willHaveVote = nextUserVotes.length > 0;
      let totalVotes = current.totalVotes;
      if (!hadVote && willHaveVote) totalVotes += 1;
      if (hadVote && !willHaveVote) totalVotes = Math.max(0, totalVotes - 1);

      return {
        ...current,
        voteCounts,
        userVotes: nextUserVotes,
        totalVotes,
      };
    });
  };

  const handleVote = async (optionIndex: number) => {
    if (displayPoll.isClosed) return;
    setIsVoting(true);
    try {
      const result = await votePoll(displayPoll.id, optionIndex);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      applyOptimisticVote(optionIndex);
      window.setTimeout(() => onUpdate(), 1500);
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
              <AvatarImage src={displayPoll.users.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(displayPoll.users.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{displayPoll.question}</p>
              <p className="text-xs text-muted-foreground">
                {displayPoll.users.name.split(' ')[0]} &bull;{' '}
                {formatDistanceToNow(new Date(displayPoll.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {displayPoll.isClosed && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                Encerrada
              </Badge>
            )}
            {displayPoll.allow_multiple && (
              <Badge variant="outline" className="text-xs">
                Múltipla
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayPoll.options.map((option, index) => {
          const count = displayPoll.voteCounts[index] || 0;
          const percentage =
            displayPoll.totalVotes > 0 ? (count / displayPoll.totalVotes) * 100 : 0;
          const isUserVote = displayPoll.userVotes.includes(index);
          const isWinning = count === maxVotes && count > 0;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={isVoting || displayPoll.isClosed}
              className={`relative w-full overflow-hidden rounded-lg border p-3 text-left transition-colors ${
                isUserVote ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              } ${displayPoll.isClosed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className={`text-sm ${isWinning ? 'font-semibold' : ''}`}>{option.text}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {count} voto{count !== 1 ? 's' : ''}
                </span>
              </div>
              {(hasVoted || displayPoll.isClosed) && (
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
            {displayPoll.totalVotes} participante{displayPoll.totalVotes !== 1 ? 's' : ''} votaram
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
