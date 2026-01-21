'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { MarkSettledDialog } from '@/components/settlements/mark-settled-dialog';
import { SettlementHistory } from '@/components/settlements/settlement-history';
import { createSettlement } from '@/lib/supabase/settlements';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';
import type { TripExpenseSummary } from '@/lib/supabase/expense-summary';
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
              <p className="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Participantes</p>
              <p className="text-2xl font-bold">{summary.participants.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      Pagou {formatCurrency(participant.totalPaid)} • Deve{' '}
                      {formatCurrency(participant.totalOwed)}
                    </p>
                  </div>
                  <div className="text-right">
                    {participant.netBalance > 0.01 ? (
                      <Badge variant="outline" className="bg-success/10 text-success">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {formatCurrency(participant.netBalance)}
                      </Badge>
                    ) : participant.netBalance < -0.01 ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive">
                        <TrendingDown className="mr-1 h-3 w-3" />
                        {formatCurrency(Math.abs(participant.netBalance))}
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

      {/* Suggested Settlements Card */}
      {summary.suggestedSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Acertos sugeridos</CardTitle>
            <CardDescription>
              Pagamentos para quitar todas as dívidas ({summary.suggestedSettlements.length}{' '}
              {summary.suggestedSettlements.length === 1 ? 'transação' : 'transações'})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.suggestedSettlements.map((settlement, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={settlement.from.userAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(settlement.from.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {settlement.from.userName.split(' ')[0]}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium">{settlement.to.userName.split(' ')[0]}</p>
                    </div>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={settlement.to.userAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(settlement.to.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <Badge className="font-semibold">{formatCurrency(settlement.amount)}</Badge>
                      {(settlement.from.userId === currentUserId ||
                        settlement.to.userId === currentUserId ||
                        isOrganizer) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkSettlement(settlement)}
                        >
                          Marcar pago
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
