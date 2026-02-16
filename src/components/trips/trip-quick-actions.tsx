'use client';

import { Share2, Pencil, MoreHorizontal, UserPlus, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TripQuickActionsProps {
  tripId: string;
  tripName: string;
  canEdit?: boolean;
  canArchive?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onInvite?: () => void;
  onShare?: () => void;
}

export function TripQuickActions({
  tripName,
  canEdit = false,
  canArchive = false,
  onEdit,
  onArchive,
  onInvite,
  onShare,
}: TripQuickActionsProps) {
  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    // Default share behavior using Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: tripName,
          text: `Veja os detalhes da viagem "${tripName}" no Half Trip`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(window.location.href);
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Share button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-9 w-9"
              aria-label="Compartilhar viagem"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Compartilhar</p>
          </TooltipContent>
        </Tooltip>

        {/* Invite button */}
        {onInvite && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onInvite}
                className="h-9 w-9"
                aria-label="Convidar participantes"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Convidar participantes</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Edit button */}
        {canEdit && onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-9 w-9"
                aria-label="Editar viagem"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* More options menu */}
        {(canArchive || canEdit) && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais opções">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mais opções</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar viagem
                </DropdownMenuItem>
              )}
              {canArchive && onArchive && (
                <>
                  {canEdit && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar viagem
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}
