'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Check, Users } from 'lucide-react';
import { MarkSettledDialog } from '@/components/settlements/mark-settled-dialog';
import { SettlementHistory } from '@/components/settlements/settlement-history';
import { createSettlement, createEntitySettlement } from '@/lib/supabase/settlements';
import { PixQrDialog } from '@/components/settlements/pix-qr-dialog';
import { MoneyDisplay } from '@/components/ui/money-display';
import { BalanceBarChart } from '@/components/balance/balance-bar-chart';
import { SettlementFlow } from '@/components/balance/settlement-flow';
import { toast } from 'sonner';
import type { TripExpenseSummary } from '@/types/expense-summary';
import type { EntitySettlement, Settlement } from '@/lib/balance';

interface TripSummaryProps {
  summary: TripExpenseSummary;
  currentUserId: string;
  currentParticipantId: string;
  isOrganizer: boolean;
}

export function TripSummary({
  summary,
  currentUserId,
  currentParticipantId,
  isOrganizer,
}: TripSummaryProps) {
  const router = useRouter();
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [markDialogData, setMarkDialogData] = useState<{
    fromName: string;
    fromAvatar: string | null;
    toName: string;
    toAvatar: string | null;
    amount: number;
  } | null>(null);
  const [pixData, setPixData] = useState<{
    toName: string;
    amount: number;
  } | null>(null);
  const baseCur = summary.baseCurrency || 'BRL';
  const hasGroups = summary.hasGroups && summary.entities;

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
    const result = await createSettlement({
      trip_id: summary.tripId,
      from_participant_id: settlement.from.participantId,
      to_participant_id: settlement.to.participantId,
      amount: settlement.amount,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.settlementId) {
      setMarkDialogData({
        fromName: settlement.from.participantName,
        fromAvatar: settlement.from.participantAvatar,
        toName: settlement.to.participantName,
        toAvatar: settlement.to.participantAvatar,
        amount: settlement.amount,
      });
      setMarkDialogOpen(true);
    }
  };

  const handleMarkEntitySettlement = async (settlement: EntitySettlement) => {
    const result = await createEntitySettlement({
      trip_id: summary.tripId,
      entitySettlement: settlement,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.success) {
      setMarkDialogData({
        fromName: settlement.from.displayName,
        fromAvatar: settlement.from.displayAvatar,
        toName: settlement.to.displayName,
        toAvatar: settlement.to.displayAvatar,
        amount: settlement.amount,
      });
      setMarkDialogOpen(true);
    }
  };

  const handlePixSettlement = (settlement: Settlement) => {
    setPixData({
      toName: settlement.to.participantName,
      amount: settlement.amount,
    });
  };

  const handlePixEntitySettlement = (settlement: EntitySettlement) => {
    setPixData({
      toName: settlement.to.displayName,
      amount: settlement.amount,
    });
  };

  const balanceItems = hasGroups
    ? undefined
    : summary.participants.map((p) => ({
        participantId: p.participantId,
        participantName: p.participantName,
        participantAvatar: p.participantAvatar,
        participantType: p.participantType,
        balance: p.netBalance,
      }));

  const entityCount = hasGroups ? summary.entities!.length : summary.participants.length;

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
              <p className="text-sm text-muted-foreground">
                {hasGroups ? 'Entidades' : 'Participantes'}
              </p>
              <p className="text-2xl font-bold">{entityCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Balance Chart */}
      <BalanceBarChart
        participants={balanceItems}
        entities={hasGroups ? summary.entities : undefined}
        currency={baseCur}
      />

      {/* Balance Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>{hasGroups ? 'Balanço por entidade' : 'Balanço por participante'}</CardTitle>
          <CardDescription>
            {hasGroups
              ? 'Quanto cada grupo/pessoa pagou e deve'
              : 'Quanto cada pessoa pagou e deve'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hasGroups
              ? summary.entities!.map((entity) => (
                  <div key={entity.entityId} className="space-y-2">
                    <div className="flex items-center gap-3">
                      {entity.entityType === 'group' && entity.members ? (
                        <div className="flex -space-x-2">
                          {entity.members.slice(0, 3).map((m) => (
                            <Avatar
                              key={m.participantId}
                              className="h-10 w-10 border-2 border-background"
                            >
                              <AvatarImage src={m.participantAvatar || undefined} />
                              <AvatarFallback>{getInitials(m.participantName)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {entity.members.length > 3 && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                              +{entity.members.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={entity.displayAvatar || undefined} />
                          <AvatarFallback>{getInitials(entity.displayName)}</AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          {entity.entityType === 'group' && (
                            <Users
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                          <p className="font-medium">{entity.displayName}</p>
                        </div>
                        {entity.entityType === 'group' && entity.members && (
                          <p className="text-xs text-muted-foreground mb-0.5">
                            {entity.members.map((m) => m.participantName.split(' ')[0]).join(', ')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Pagou{' '}
                          <MoneyDisplay amount={entity.totalPaid} currency={baseCur} size="sm" /> •
                          Deve{' '}
                          <MoneyDisplay amount={entity.totalOwed} currency={baseCur} size="sm" />
                        </p>
                      </div>
                      <div className="text-right">
                        <BalanceBadge netBalance={entity.netBalance} currency={baseCur} />
                      </div>
                    </div>
                  </div>
                ))
              : summary.participants.map((participant) => (
                  <div key={participant.participantId} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.participantAvatar || undefined} />
                        <AvatarFallback>{getInitials(participant.participantName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{participant.participantName}</p>
                        <p className="text-xs text-muted-foreground">
                          Pagou{' '}
                          <MoneyDisplay
                            amount={participant.totalPaid}
                            currency={baseCur}
                            size="sm"
                          />{' '}
                          • Deve{' '}
                          <MoneyDisplay
                            amount={participant.totalOwed}
                            currency={baseCur}
                            size="sm"
                          />
                        </p>
                      </div>
                      <div className="text-right">
                        <BalanceBadge netBalance={participant.netBalance} currency={baseCur} />
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Flow */}
      <SettlementFlow
        settlements={!hasGroups ? summary.suggestedSettlements : undefined}
        entitySettlements={hasGroups ? summary.entitySettlements : undefined}
        currency={baseCur}
        currentParticipantId={currentParticipantId}
        isOrganizer={isOrganizer}
        onMarkSettlement={handleMarkSettlement}
        onMarkEntitySettlement={handleMarkEntitySettlement}
        onPixSettlement={handlePixSettlement}
        onPixEntitySettlement={handlePixEntitySettlement}
      />

      {/* Settlement History */}
      <SettlementHistory
        settlements={summary.settledSettlements}
        currentUserId={currentUserId}
        isOrganizer={isOrganizer}
        onUpdate={handleRefresh}
      />

      {/* Mark Settled Dialog */}
      {markDialogData && (
        <MarkSettledDialog
          settlementId={summary.settledSettlements[0]?.id || ''}
          fromUserName={markDialogData.fromName}
          fromUserAvatar={markDialogData.fromAvatar}
          toUserName={markDialogData.toName}
          toUserAvatar={markDialogData.toAvatar}
          amount={markDialogData.amount}
          open={markDialogOpen}
          onOpenChange={setMarkDialogOpen}
          onSuccess={handleRefresh}
        />
      )}

      {/* Pix QR Dialog */}
      {pixData && (
        <PixQrDialog
          open={!!pixData}
          onOpenChange={(open) => !open && setPixData(null)}
          toUserName={pixData.toName}
          amount={pixData.amount}
          currency={baseCur}
        />
      )}
    </div>
  );
}

function BalanceBadge({ netBalance, currency }: { netBalance: number; currency: string }) {
  if (netBalance > 0.01) {
    return (
      <Badge variant="outline" className="bg-success/10 text-success">
        <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" />
        <MoneyDisplay amount={netBalance} currency={currency} size="sm" />
      </Badge>
    );
  }

  if (netBalance < -0.01) {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive">
        <TrendingDown className="mr-1 h-3 w-3" aria-hidden="true" />
        <MoneyDisplay amount={Math.abs(netBalance)} currency={currency} size="sm" />
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-muted">
      <Check className="mr-1 h-3 w-3" aria-hidden="true" />
      Quitado
    </Badge>
  );
}
