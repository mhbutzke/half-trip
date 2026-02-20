'use server';

import { createAdminClient } from './admin';
import type { Json } from '@/types/database';

/**
 * Registra uma ação administrativa no log de auditoria.
 * Usado por todas as ações destrutivas do painel admin.
 */
export async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, Json | undefined>;
}) {
  const adminClient = createAdminClient();

  await adminClient.from('admin_activity_log').insert({
    admin_user_id: params.adminUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: (params.metadata ?? {}) as Json,
  });
}
