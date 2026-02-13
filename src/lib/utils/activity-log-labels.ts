import type { ActivityLogAction, ActivityLogEntityType } from '@/types/activity-log';

const entityLabels: Record<ActivityLogEntityType, string> = {
  expense: 'despesa',
  activity: 'atividade',
  note: 'nota',
  checklist: 'checklist',
  checklist_item: 'item de checklist',
  settlement: 'acerto',
  participant: 'participante',
  trip: 'viagem',
  poll: 'votação',
  invite: 'convite',
  budget: 'orçamento',
  attachment: 'anexo',
  receipt: 'comprovante',
  trip_member: 'membro da viagem',
};

const actionLabels: Record<ActivityLogAction, string> = {
  created: 'adicionou',
  updated: 'editou',
  deleted: 'removeu',
  joined: 'entrou na',
  left: 'saiu da',
  completed: 'completou',
  marked_paid: 'marcou como pago',
  marked_unpaid: 'desmarcou pagamento de',
  archived: 'arquivou',
  unarchived: 'desarquivou',
  removed: 'removeu',
  promoted: 'promoveu',
  revoked: 'revogou',
  accepted: 'aceitou',
};

export function getLogMessage(
  action: string,
  entityType: string,
  metadata?: Record<string, unknown>
): string {
  const actionLabel = actionLabels[action as ActivityLogAction] || action;
  const entityLabel = entityLabels[entityType as ActivityLogEntityType] || entityType;

  const detail =
    (metadata?.description as string) ||
    (metadata?.title as string) ||
    (metadata?.name as string) ||
    '';

  const detailSuffix = detail ? `: "${detail}"` : '';

  return `${actionLabel} ${entityLabel}${detailSuffix}`;
}

export function getLogIcon(entityType: string): string {
  const icons: Record<string, string> = {
    expense: 'DollarSign',
    activity: 'MapPin',
    note: 'StickyNote',
    checklist: 'CheckSquare',
    checklist_item: 'Check',
    settlement: 'ArrowLeftRight',
    participant: 'Users',
    trip: 'Plane',
    poll: 'BarChart3',
  };
  return icons[entityType] || 'Activity';
}
