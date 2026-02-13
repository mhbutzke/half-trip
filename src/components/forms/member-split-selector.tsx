'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrencyWithCursor } from '@/hooks/use-currency-input';
import { formatAmount, parseAmount } from '@/lib/validation/expense-schemas';
import type { TripMemberWithUser } from '@/lib/supabase/trips';

interface MemberSplitSelectorProps {
  members: TripMemberWithUser[];
  splitType: 'equal' | 'by_amount' | 'by_percentage';
  selectedMembers: string[];
  onSelectedMembersChange: (members: string[]) => void;
  customAmounts?: Record<string, string>;
  onCustomAmountsChange?: (amounts: Record<string, string>) => void;
  customPercentages?: Record<string, string>;
  onCustomPercentagesChange?: (percentages: Record<string, string>) => void;
  currency: string;
  totalAmount: string;
  idPrefix?: string;
}

export function MemberSplitSelector({
  members,
  splitType,
  selectedMembers,
  onSelectedMembersChange,
  customAmounts,
  onCustomAmountsChange,
  customPercentages,
  onCustomPercentagesChange,
  currency,
  totalAmount,
  idPrefix = 'member',
}: MemberSplitSelectorProps) {
  const parsedAmount = parseAmount(totalAmount || '0');

  const handleCheckedChange = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectedMembersChange([...selectedMembers, userId]);
    } else {
      onSelectedMembersChange(selectedMembers.filter((id) => id !== userId));
    }
  };

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.user_id} className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}-${member.user_id}`}
            checked={selectedMembers.includes(member.user_id)}
            onCheckedChange={(checked) => handleCheckedChange(member.user_id, checked === true)}
          />
          <Label htmlFor={`${idPrefix}-${member.user_id}`} className="text-sm font-normal">
            {member.users.name}
          </Label>

          {splitType === 'by_amount' && selectedMembers.includes(member.user_id) && (
            <Input
              className="ml-auto w-28"
              placeholder="0,00"
              inputMode="numeric"
              value={customAmounts?.[member.user_id] || ''}
              onChange={(e) => {
                const { value } = formatCurrencyWithCursor(e.target.value);
                onCustomAmountsChange?.({
                  ...customAmounts,
                  [member.user_id]: value,
                });
              }}
            />
          )}

          {splitType === 'by_percentage' && selectedMembers.includes(member.user_id) && (
            <div className="ml-auto flex items-center gap-1">
              <Input
                className="w-20"
                placeholder="0"
                inputMode="decimal"
                value={customPercentages?.[member.user_id] || ''}
                onChange={(e) =>
                  onCustomPercentagesChange?.({
                    ...customPercentages,
                    [member.user_id]: e.target.value,
                  })
                }
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}
        </div>
      ))}

      {splitType === 'equal' && selectedMembers.length > 0 && parsedAmount > 0 && (
        <p className="text-sm text-muted-foreground">
          {formatAmount(parsedAmount / selectedMembers.length, currency)} por pessoa
        </p>
      )}
    </div>
  );
}
