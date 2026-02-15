'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Check } from 'lucide-react';
import { MarkSettledDialog } from '@/components/settlements/mark-settled-dialog';
import { SettlementHistory } from '@/components/settlements/settlement-history';
import { createSettlement } from '@/lib/supabase/settlements';
import { PixQrDialog } from '@/components/settlements/pix-qr-dialog';
import { MoneyDisplay } from '@/components/ui/money-display';
import { BalanceBarChart } from '@/components/balance/balance-bar-chart';
import { SettlementFlow } from '@/components/balance/settlement-flow';
import { toast } from 'sonner';
import type { TripExpenseSummary } from '@/types/expense-summary';
import type { Settlement } from '@/lib/balance';

interface TripSummaryProps {
  summary: TripExpenseSummary;
  currentUserId: string;
  isOrganizer: boolean;
}

export function TripSummary({ summary, currentUserId, isOrganizer }: TripSummaryProps) {
  const router = useRouter();
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [pixSettlement, setPixSettlement] = useState<Settlement | null>(null);
  const baseCur = summary.baseCurrency || 'BRL';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const handleMarkSettlement = async (settlement: Settlement) => {
    // First, create the settlement record in the database
    const result = await createSettlement({
      trip_id: summary.tripId,
      from_user: settlement.from.userId,
      to_user: settlement.to.userId,
      amount: settlement.amount,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.settlementId) {
      setSelectedSettlement(settlement);
      setMarkDialogOpen(true);
    }
  };

  const balanceItems = summary.participants.map((p) => ({
    userId: p.userId,
    userName: p.userName,
    userAvatar: p.userAvatar,
    balance: p.netBalance,
  }));

  return (
    <div className="space-y-6">
      {/* Overall Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo geral</CardTitle>
          <CardDescription>Total de despesas e participantes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de despesas</p>
              <MoneyDisplay amount={summary.totalExpenses} currency={baseCur} size="xl" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Participantes</p>
              <p className="text-2xl font-bold">{summary.participants.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Balance Chart */}
      <BalanceBarChart participants={balanceItems} currency={baseCur} />

      {/* Participant Balances Card */}
      <Card>
        <CardHeader>
          <CardTitle>Balanço por participante</CardTitle>
          <CardDescription>Quanto cada pessoa pagou e deve</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.participants.map((participant) => (
              <div key={participant.userId} className="space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.userAvatar || undefined} />
                    <AvatarFallback>{getInitials(participant.userName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{participant.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      Pagou{' '}
                      <MoneyDisplay amount={participant.totalPaid} currency={baseCur} size="sm" /> •
                      Deve{' '}
                      <MoneyDisplay amount={participant.totalOwed} currency={baseCur} size="sm" />
                    </p>
                  </div>
                  <div className="text-right">
                    {participant.netBalance > 0.01 ? (
                      <Badge variant="outline" className="bg-success/10 text-success">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        <MoneyDisplay
                          amount={participant.netBalance}
                          currency={baseCur}
                          size="sm"
                        />
                      </Badge>
                    ) : participant.netBalance < -0.01 ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive">
                        <TrendingDown className="mr-1 h-3 w-3" />
                        <MoneyDisplay
                          amount={Math.abs(participant.netBalance)}
                          currency={baseCur}
                          size="sm"
                        />
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted">
                        <Check className="mr-1 h-3 w-3" />
                        Quitado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Flow - Visual representation */}
      <SettlementFlow
        settlements={summary.suggestedSettlements}
        currency={baseCur}
        currentUserId={currentUserId}
        isOrganizer={isOrganizer}
        onMarkSettlement={handleMarkSettlement}
        onPixSettlement={setPixSettlement}
      />

      {/* Settlement History */}
      <SettlementHistory
        settlements={summary.settledSettlements}
        currentUserId={currentUserId}
        isOrganizer={isOrganizer}
        onUpdate={handleRefresh}
      />

      {/* Mark Settled Dialog */}
      {selectedSettlement && (
        <MarkSettledDialog
          settlementId={summary.settledSettlements[0]?.id || ''} // This will be populated after creating the settlement
          fromUserName={selectedSettlement.from.userName}
          fromUserAvatar={selectedSettlement.from.userAvatar}
          toUserName={selectedSettlement.to.userName}
          toUserAvatar={selectedSettlement.to.userAvatar}
          amount={selectedSettlement.amount}
          open={markDialogOpen}
          onOpenChange={setMarkDialogOpen}
          onSuccess={handleRefresh}
        />
      )}

      {/* Pix QR Dialog */}
      {pixSettlement && (
        <PixQrDialog
          open={!!pixSettlement}
          onOpenChange={(open) => !open && setPixSettlement(null)}
          toUserName={pixSettlement.to.userName}
          amount={pixSettlement.amount}
          currency={baseCur}
        />
      )}
    </div>
  );
}
