'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/validation/expense-schemas';

interface SplitPreviewItem {
  userId: string;
  userName: string;
  userAvatar: string | null;
  amount: number;
  isPayer: boolean;
}

interface SplitPreviewProps {
  splits: SplitPreviewItem[];
  currency: string;
  totalAmount: number;
  className?: string;
}

export function SplitPreview({ splits, currency, totalAmount, className }: SplitPreviewProps) {
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (splits.length === 0 || totalAmount <= 0) {
    return null;
  }

  return (
    <Card className={cn('border-primary/20 bg-primary/5', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Preview da Divisão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {splits.map((split) => (
          <div
            key={split.userId}
            className={cn(
              'flex items-center justify-between rounded-lg border p-2.5 transition-colors',
              split.isPayer
                ? 'border-primary/40 bg-primary/10'
                : 'border-border bg-background'
            )}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={split.userAvatar || undefined} />
                <AvatarFallback className="text-xs">{getInitials(split.userName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">
                  {split.userName.split(' ')[0]}
                </span>
                {split.isPayer && (
                  <span className="text-xs text-muted-foreground">Pagou a despesa</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">
                {formatAmount(split.amount, currency)}
              </span>
              {split.isPayer && (
                <Badge variant="outline" className="h-5 w-5 rounded-full p-0">
                  <Check className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatAmount(totalAmount, currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
