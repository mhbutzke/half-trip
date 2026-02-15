'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyWithCursor } from '@/hooks/use-currency-input';
import { formatAmount, parseAmount } from '@/lib/validation/expense-schemas';
import type { TripParticipantResolved } from '@/lib/supabase/participants';

interface MemberSplitSelectorProps {
  participants: TripParticipantResolved[];
  splitType: 'equal' | 'by_amount' | 'by_percentage';
  selectedParticipants: string[];
  onSelectedParticipantsChange: (participantIds: string[]) => void;
  customAmounts?: Record<string, string>;
  onCustomAmountsChange?: (amounts: Record<string, string>) => void;
  customPercentages?: Record<string, string>;
  onCustomPercentagesChange?: (percentages: Record<string, string>) => void;
  currency: string;
  totalAmount: string;
  idPrefix?: string;
}

export function MemberSplitSelector({
  participants,
  splitType,
  selectedParticipants,
  onSelectedParticipantsChange,
  customAmounts,
  onCustomAmountsChange,
  customPercentages,
  onCustomPercentagesChange,
  currency,
  totalAmount,
  idPrefix = 'participant',
}: MemberSplitSelectorProps) {
  const parsedAmount = parseAmount(totalAmount || '0');

  const handleCheckedChange = (participantId: string, checked: boolean) => {
    if (checked) {
      onSelectedParticipantsChange([...selectedParticipants, participantId]);
    } else {
      onSelectedParticipantsChange(selectedParticipants.filter((id) => id !== participantId));
    }
  };

  return (
    <div className="space-y-2">
      {participants.map((participant) => (
        <div key={participant.id} className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}-${participant.id}`}
            checked={selectedParticipants.includes(participant.id)}
            onCheckedChange={(checked) => handleCheckedChange(participant.id, checked === true)}
          />
          <Label htmlFor={`${idPrefix}-${participant.id}`} className="text-sm font-normal">
            {participant.displayName}
            {participant.type === 'guest' && (
              <Badge variant="outline" className="ml-1.5 text-xs">
                Convidado
              </Badge>
            )}
          </Label>

          {splitType === 'by_amount' && selectedParticipants.includes(participant.id) && (
            <Input
              className="ml-auto w-28"
              placeholder="0,00"
              inputMode="numeric"
              value={customAmounts?.[participant.id] || ''}
              onChange={(e) => {
                const { value } = formatCurrencyWithCursor(e.target.value);
                onCustomAmountsChange?.({
                  ...customAmounts,
                  [participant.id]: value,
                });
              }}
            />
          )}

          {splitType === 'by_percentage' && selectedParticipants.includes(participant.id) && (
            <div className="ml-auto flex items-center gap-1">
              <Input
                className="w-20"
                placeholder="0"
                inputMode="decimal"
                value={customPercentages?.[participant.id] || ''}
                onChange={(e) =>
                  onCustomPercentagesChange?.({
                    ...customPercentages,
                    [participant.id]: e.target.value,
                  })
                }
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}
        </div>
      ))}

      {splitType === 'equal' && selectedParticipants.length > 0 && parsedAmount > 0 && (
        <p className="text-sm text-muted-foreground">
          {formatAmount(parsedAmount / selectedParticipants.length, currency)} por pessoa
        </p>
      )}
    </div>
  );
}
