'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Badge } from '@/lib/utils/travel-badges';

interface BadgeDisplayProps {
  earned: Badge[];
  className?: string;
}

export function BadgeDisplay({ earned, className }: BadgeDisplayProps) {
  if (earned.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conquistas</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
            {earned.map((badge) => (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                    aria-label={`${badge.name}: ${badge.description}`}
                  >
                    <span className="text-base" aria-hidden="true">
                      {badge.emoji}
                    </span>
                    <span className="font-medium">{badge.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{badge.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
