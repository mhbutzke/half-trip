'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, QrCode } from 'lucide-react';
import { MoneyDisplay } from '@/components/ui/money-display';
import { cn } from '@/lib/utils';
import type { EntitySettlement, Settlement } from '@/lib/balance';

interface SettlementFlowProps {
  settlements?: Settlement[];
  entitySettlements?: EntitySettlement[];
  currency: string;
  currentParticipantId: string;
  isOrganizer: boolean;
  onMarkSettlement?: (settlement: Settlement) => void;
  onMarkEntitySettlement?: (settlement: EntitySettlement) => void;
  onPixSettlement?: (settlement: Settlement) => void;
  onPixEntitySettlement?: (settlement: EntitySettlement) => void;
  className?: string;
}

export function SettlementFlow({
  settlements,
  entitySettlements,
  currency,
  currentParticipantId,
  isOrganizer,
  onMarkSettlement,
  onMarkEntitySettlement,
  onPixSettlement,
  onPixEntitySettlement,
  className,
}: SettlementFlowProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFirstName = (name: string) => name.split(' ')[0];

  const useEntities = entitySettlements && entitySettlements.length > 0;
  const totalItems = useEntities ? entitySettlements.length : (settlements?.length ?? 0);

  if (totalItems === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
            Tudo quitado!
          </CardTitle>
          <CardDescription>Não há pagamentos pendentes nesta viagem</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Acertos sugeridos</CardTitle>
        <CardDescription>
          {totalItems} {totalItems === 1 ? 'transação' : 'transações'} para quitar todas as dívidas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {useEntities
            ? entitySettlements!.map((settlement) => (
                <EntitySettlementCard
                  key={`${settlement.from.entityId}-${settlement.to.entityId}-${settlement.amount}`}
                  settlement={settlement}
                  currency={currency}
                  currentParticipantId={currentParticipantId}
                  isOrganizer={isOrganizer}
                  onMark={onMarkEntitySettlement}
                  onPix={onPixEntitySettlement}
                  getInitials={getInitials}
                  getFirstName={getFirstName}
                />
              ))
            : settlements!.map((settlement) => (
                <IndividualSettlementCard
                  key={`${settlement.from.participantId}-${settlement.to.participantId}-${settlement.amount}`}
                  settlement={settlement}
                  currency={currency}
                  currentParticipantId={currentParticipantId}
                  isOrganizer={isOrganizer}
                  onMark={onMarkSettlement}
                  onPix={onPixSettlement}
                  getInitials={getInitials}
                  getFirstName={getFirstName}
                />
              ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Entity Settlement Card ---

function EntitySettlementCard({
  settlement,
  currency,
  currentParticipantId,
  isOrganizer,
  onMark,
  onPix,
  getInitials,
  getFirstName,
}: {
  settlement: EntitySettlement;
  currency: string;
  currentParticipantId: string;
  isOrganizer: boolean;
  onMark?: (s: EntitySettlement) => void;
  onPix?: (s: EntitySettlement) => void;
  getInitials: (name: string) => string;
  getFirstName: (name: string) => string;
}) {
  const isInFrom =
    settlement.from.entityType === 'group'
      ? settlement.from.members?.some((m) => m.participantId === currentParticipantId)
      : settlement.from.entityId === currentParticipantId;

  const isInTo =
    settlement.to.entityType === 'group'
      ? settlement.to.members?.some((m) => m.participantId === currentParticipantId)
      : settlement.to.entityId === currentParticipantId;

  const isUserInvolved = isInFrom || isInTo || isOrganizer;

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all',
        isUserInvolved ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'
      )}
    >
      {isInFrom && (
        <Badge variant="default" className="absolute -top-2 left-4 text-xs">
          Você deve
        </Badge>
      )}
      {isInTo && !isInFrom && (
        <Badge variant="secondary" className="absolute -top-2 left-4 text-xs">
          Você recebe
        </Badge>
      )}

      <div className="flex items-center gap-3">
        <EntityAvatar
          entity={settlement.from}
          variant="from"
          getInitials={getInitials}
          getFirstName={getFirstName}
        />

        <div className="flex flex-1 flex-col items-center gap-1">
          <ArrowRight className="h-5 w-5 text-primary" aria-hidden="true" />
          <Badge className="font-bold text-base px-3 py-1">
            <MoneyDisplay amount={settlement.amount} currency={currency} size="sm" />
          </Badge>
        </div>

        <EntityAvatar
          entity={settlement.to}
          variant="to"
          getInitials={getInitials}
          getFirstName={getFirstName}
        />

        {isUserInvolved && (
          <div className="flex flex-col gap-2 ml-2">
            {onPix && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPix(settlement)}
                aria-label="Pagar via Pix"
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {onMark && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onMark(settlement)}
                aria-label="Marcar como pago"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Entity Avatar ---

function EntityAvatar({
  entity,
  variant,
  getInitials,
  getFirstName,
}: {
  entity: EntitySettlement['from'];
  variant: 'from' | 'to';
  getInitials: (name: string) => string;
  getFirstName: (name: string) => string;
}) {
  const fallbackClass =
    variant === 'from'
      ? 'bg-destructive/10 text-destructive text-xs'
      : 'bg-success/10 text-success text-xs';

  if (entity.entityType === 'group' && entity.members && entity.members.length > 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex -space-x-3">
          {entity.members.slice(0, 3).map((m) => (
            <Avatar key={m.participantId} className="h-10 w-10 border-2 border-background">
              <AvatarImage src={m.participantAvatar || undefined} />
              <AvatarFallback className={fallbackClass}>
                {getInitials(m.participantName)}
              </AvatarFallback>
            </Avatar>
          ))}
          {entity.members.length > 3 && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
              +{entity.members.length - 3}
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-center max-w-24 truncate">
          {entity.displayName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar className="h-12 w-12 border-2 border-background">
        <AvatarImage src={entity.displayAvatar || undefined} />
        <AvatarFallback className={fallbackClass}>{getInitials(entity.displayName)}</AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-center max-w-20 truncate">
        {getFirstName(entity.displayName)}
      </span>
    </div>
  );
}

// --- Individual Settlement Card (sem grupos) ---

function IndividualSettlementCard({
  settlement,
  currency,
  currentParticipantId,
  isOrganizer,
  onMark,
  onPix,
  getInitials,
  getFirstName,
}: {
  settlement: Settlement;
  currency: string;
  currentParticipantId: string;
  isOrganizer: boolean;
  onMark?: (s: Settlement) => void;
  onPix?: (s: Settlement) => void;
  getInitials: (name: string) => string;
  getFirstName: (name: string) => string;
}) {
  const isUserPaying = settlement.from.participantId === currentParticipantId;
  const isUserReceiving = settlement.to.participantId === currentParticipantId;
  const isUserInvolved = isUserPaying || isUserReceiving || isOrganizer;

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all',
        isUserInvolved ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'
      )}
    >
      {isUserPaying && (
        <Badge variant="default" className="absolute -top-2 left-4 text-xs">
          Você deve
        </Badge>
      )}
      {isUserReceiving && (
        <Badge variant="secondary" className="absolute -top-2 left-4 text-xs">
          Você recebe
        </Badge>
      )}

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-12 w-12 border-2 border-background">
            <AvatarImage src={settlement.from.participantAvatar || undefined} />
            <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
              {getInitials(settlement.from.participantName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-center max-w-20 truncate">
            {getFirstName(settlement.from.participantName)}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <ArrowRight className="h-5 w-5 text-primary" aria-hidden="true" />
          <Badge className="font-bold text-base px-3 py-1">
            <MoneyDisplay amount={settlement.amount} currency={currency} size="sm" />
          </Badge>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-12 w-12 border-2 border-background">
            <AvatarImage src={settlement.to.participantAvatar || undefined} />
            <AvatarFallback className="bg-success/10 text-success text-xs">
              {getInitials(settlement.to.participantName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-center max-w-20 truncate">
            {getFirstName(settlement.to.participantName)}
          </span>
        </div>

        {isUserInvolved && (
          <div className="flex flex-col gap-2 ml-2">
            {onPix && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPix(settlement)}
                aria-label="Pagar via Pix"
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {onMark && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onMark(settlement)}
                aria-label="Marcar como pago"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
