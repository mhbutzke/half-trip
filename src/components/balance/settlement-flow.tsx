'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, QrCode } from 'lucide-react';
import { MoneyDisplay } from '@/components/ui/money-display';
import { cn } from '@/lib/utils';
import type { Settlement } from '@/lib/balance';

interface SettlementFlowProps {
  settlements: Settlement[];
  currency: string;
  currentUserId: string;
  isOrganizer: boolean;
  onMarkSettlement?: (settlement: Settlement) => void;
  onPixSettlement?: (settlement: Settlement) => void;
  className?: string;
}

export function SettlementFlow({
  settlements,
  currency,
  currentUserId,
  isOrganizer,
  onMarkSettlement,
  onPixSettlement,
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

  const canInteract = (settlement: Settlement) => {
    return (
      settlement.from.userId === currentUserId ||
      settlement.to.userId === currentUserId ||
      isOrganizer
    );
  };

  if (settlements.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
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
          {settlements.length} {settlements.length === 1 ? 'transação' : 'transações'} para quitar
          todas as dívidas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {settlements.map((settlement, index) => {
            const isUserInvolved = canInteract(settlement);
            const isUserPaying = settlement.from.userId === currentUserId;

            return (
              <div
                key={index}
                className={cn(
                  'relative rounded-lg border p-4 transition-all',
                  isUserInvolved
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                {/* Highlight badge for current user */}
                {isUserPaying && (
                  <Badge
                    variant="default"
                    className="absolute -top-2 left-4 text-xs"
                  >
                    Você deve
                  </Badge>
                )}
                {settlement.to.userId === currentUserId && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 left-4 text-xs"
                  >
                    Você recebe
                  </Badge>
                )}

                <div className="flex items-center gap-3">
                  {/* From user */}
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={settlement.from.userAvatar || undefined} />
                      <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                        {getInitials(settlement.from.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-center max-w-20 truncate">
                      {getFirstName(settlement.from.userName)}
                    </span>
                  </div>

                  {/* Arrow and amount */}
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <Badge className="font-bold text-base px-3 py-1">
                      <MoneyDisplay amount={settlement.amount} currency={currency} size="sm" />
                    </Badge>
                  </div>

                  {/* To user */}
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={settlement.to.userAvatar || undefined} />
                      <AvatarFallback className="bg-success/10 text-success text-xs">
                        {getInitials(settlement.to.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-center max-w-20 truncate">
                      {getFirstName(settlement.to.userName)}
                    </span>
                  </div>

                  {/* Actions */}
                  {isUserInvolved && (
                    <div className="flex flex-col gap-2 ml-2">
                      {onPixSettlement && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => onPixSettlement(settlement)}
                          title="Pagar via Pix"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                      {onMarkSettlement && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => onMarkSettlement(settlement)}
                          title="Marcar como pago"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
