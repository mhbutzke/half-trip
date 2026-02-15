'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import type { Settlement } from '@/lib/balance';
import { MoneyDisplay } from '@/components/ui/money-display';
import { ArrowRight } from 'lucide-react';

interface SettlementsListProps {
  settlements: Settlement[];
  currentUserId?: string;
}

/**
 * SettlementsList Component
 *
 * Displays optimized settlement suggestions showing who should pay whom.
 * Settlements are calculated to minimize the number of transactions needed.
 *
 * Props:
 * - settlements: Array of settlement transactions
 * - currentUserId: Optional ID of current user to highlight their settlements
 */
export function SettlementsList({ settlements, currentUserId }: SettlementsListProps) {
  if (settlements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-positive/10 p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-positive"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Tudo certo!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              N�o h� valores a acertar entre os participantes
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((settlement, index) => {
        // Check if current user is involved in this settlement
        const isFromCurrentUser = currentUserId === settlement.from.participantId;
        const isToCurrentUser = currentUserId === settlement.to.participantId;
        const isHighlighted = isFromCurrentUser || isToCurrentUser;

        return (
          <Card
            key={`${settlement.from.participantId}-${settlement.to.participantId}-${index}`}
            className={`p-4 transition-colors ${
              isHighlighted ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* From (Debtor) */}
              <div className="flex items-center gap-2 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={settlement.from.participantAvatar || undefined} />
                  <AvatarFallback>
                    {settlement.from.participantName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium truncate ${
                      isFromCurrentUser ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {settlement.from.participantName}
                  </p>
                  {isFromCurrentUser && (
                    <p className="text-xs text-muted-foreground">Voc� deve pagar</p>
                  )}
                </div>
              </div>

              {/* Arrow and Amount */}
              <div className="flex items-center gap-2 shrink-0">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-right">
                  <MoneyDisplay amount={settlement.amount} size="lg" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* To (Creditor) */}
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="flex-1 min-w-0 text-right">
                  <p
                    className={`font-medium truncate ${
                      isToCurrentUser ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {settlement.to.participantName}
                  </p>
                  {isToCurrentUser && (
                    <p className="text-xs text-muted-foreground">Voc� deve receber</p>
                  )}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={settlement.to.participantAvatar || undefined} />
                  <AvatarFallback>
                    {settlement.to.participantName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
