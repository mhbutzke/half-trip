/**
 * Notification Helpers
 *
 * Helper functions for creating notifications with proper formatting
 */

import { NotificationType } from '@/types/notification';
import { useNotificationStore } from './notification-store';

interface NotificationParams {
  tripId?: string;
  tripName?: string;
  userId?: string;
  userName?: string;
  amount?: number;
  itemName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create and add a notification to the store
 */
export function notify(type: NotificationType, params: NotificationParams = {}) {
  const { title, message } = getNotificationContent(type, params);

  useNotificationStore.getState().addNotification({
    type,
    title,
    message,
    tripId: params.tripId,
    tripName: params.tripName,
    userId: params.userId,
    userName: params.userName,
    metadata: params.metadata,
  });
}

/**
 * Get notification title and message based on type
 */
function getNotificationContent(
  type: NotificationType,
  params: NotificationParams
): { title: string; message: string } {
  const { tripName, userName, amount, itemName } = params;

  switch (type) {
    case 'expense_added':
      return {
        title: 'Nova despesa adicionada',
        message: userName
          ? `${userName} adicionou uma despesa${amount ? ` de R$ ${amount.toFixed(2)}` : ''}${tripName ? ` em ${tripName}` : ''}`
          : `Uma despesa foi adicionada${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'expense_updated':
      return {
        title: 'Despesa atualizada',
        message: userName
          ? `${userName} atualizou uma despesa${tripName ? ` em ${tripName}` : ''}`
          : `Uma despesa foi atualizada${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'expense_deleted':
      return {
        title: 'Despesa removida',
        message: userName
          ? `${userName} removeu uma despesa${tripName ? ` de ${tripName}` : ''}`
          : `Uma despesa foi removida${tripName ? ` de ${tripName}` : ''}`,
      };

    case 'participant_joined':
      return {
        title: 'Novo participante',
        message: userName
          ? `${userName} entrou na viagem${tripName ? ` ${tripName}` : ''}`
          : `Um novo participante entrou${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'participant_left':
      return {
        title: 'Participante saiu',
        message: userName
          ? `${userName} saiu da viagem${tripName ? ` ${tripName}` : ''}`
          : `Um participante saiu${tripName ? ` de ${tripName}` : ''}`,
      };

    case 'participant_removed':
      return {
        title: 'Participante removido',
        message: userName
          ? `${userName} foi removido${tripName ? ` de ${tripName}` : ''}`
          : `Um participante foi removido${tripName ? ` de ${tripName}` : ''}`,
      };

    case 'activity_added':
      return {
        title: 'Nova atividade',
        message: itemName
          ? `"${itemName}" foi adicionada${tripName ? ` em ${tripName}` : ''}`
          : `Uma atividade foi adicionada${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'activity_updated':
      return {
        title: 'Atividade atualizada',
        message: itemName
          ? `"${itemName}" foi atualizada${tripName ? ` em ${tripName}` : ''}`
          : `Uma atividade foi atualizada${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'activity_deleted':
      return {
        title: 'Atividade removida',
        message: itemName
          ? `"${itemName}" foi removida${tripName ? ` de ${tripName}` : ''}`
          : `Uma atividade foi removida${tripName ? ` de ${tripName}` : ''}`,
      };

    case 'note_added':
      return {
        title: 'Nova anotação',
        message: userName
          ? `${userName} adicionou uma anotação${tripName ? ` em ${tripName}` : ''}`
          : `Uma anotação foi adicionada${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'note_updated':
      return {
        title: 'Anotação atualizada',
        message: userName
          ? `${userName} atualizou uma anotação${tripName ? ` em ${tripName}` : ''}`
          : `Uma anotação foi atualizada${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'settlement_marked_paid':
      return {
        title: 'Pagamento confirmado',
        message: userName
          ? `${userName} confirmou um pagamento${tripName ? ` em ${tripName}` : ''}`
          : `Um pagamento foi confirmado${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'settlement_marked_unpaid':
      return {
        title: 'Pagamento desmarcado',
        message: userName
          ? `${userName} desmarcou um pagamento${tripName ? ` em ${tripName}` : ''}`
          : `Um pagamento foi desmarcado${tripName ? ` em ${tripName}` : ''}`,
      };

    case 'trip_updated':
      return {
        title: 'Viagem atualizada',
        message: tripName
          ? `As informações de ${tripName} foram atualizadas`
          : 'Uma viagem foi atualizada',
      };

    case 'invite_accepted':
      return {
        title: 'Convite aceito',
        message: userName
          ? `${userName} aceitou o convite${tripName ? ` para ${tripName}` : ''}`
          : `Um convite foi aceito${tripName ? ` para ${tripName}` : ''}`,
      };

    case 'sync_completed':
      return {
        title: 'Sincronização concluída',
        message: 'Todas as alterações foram sincronizadas com sucesso',
      };

    case 'sync_failed':
      return {
        title: 'Erro na sincronização',
        message: 'Algumas alterações não foram sincronizadas. Tente novamente.',
      };

    default:
      return {
        title: 'Notificação',
        message: 'Você tem uma nova notificação',
      };
  }
}

/**
 * Convenience functions for common notifications
 */
export const notifications = {
  expenseAdded: (params: NotificationParams) => notify('expense_added', params),
  expenseUpdated: (params: NotificationParams) => notify('expense_updated', params),
  expenseDeleted: (params: NotificationParams) => notify('expense_deleted', params),
  participantJoined: (params: NotificationParams) => notify('participant_joined', params),
  participantLeft: (params: NotificationParams) => notify('participant_left', params),
  participantRemoved: (params: NotificationParams) => notify('participant_removed', params),
  activityAdded: (params: NotificationParams) => notify('activity_added', params),
  activityUpdated: (params: NotificationParams) => notify('activity_updated', params),
  activityDeleted: (params: NotificationParams) => notify('activity_deleted', params),
  noteAdded: (params: NotificationParams) => notify('note_added', params),
  noteUpdated: (params: NotificationParams) => notify('note_updated', params),
  settlementMarkedPaid: (params: NotificationParams) => notify('settlement_marked_paid', params),
  settlementMarkedUnpaid: (params: NotificationParams) =>
    notify('settlement_marked_unpaid', params),
  tripUpdated: (params: NotificationParams) => notify('trip_updated', params),
  inviteAccepted: (params: NotificationParams) => notify('invite_accepted', params),
  syncCompleted: (params: NotificationParams) => notify('sync_completed', params),
  syncFailed: (params: NotificationParams) => notify('sync_failed', params),
};
