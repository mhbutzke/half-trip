'use server';

import { revalidate } from '@/lib/utils/revalidation';
import { logActivity } from './activity-log';
import { requireAuth, requireTripMember } from './auth-helpers';
import type { TripChecklist, ChecklistItem, ChecklistWithItems } from '@/types/checklist';

export type ChecklistResult = {
  error?: string;
  success?: boolean;
  checklistId?: string;
};

export type ChecklistItemResult = {
  error?: string;
  success?: boolean;
  itemId?: string;
};

export async function getTripChecklists(tripId: string): Promise<ChecklistWithItems[]> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) return [];

  const { data: checklists } = await auth.supabase
    .from('trip_checklists')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order')
    .order('created_at');

  if (!checklists || checklists.length === 0) return [];

  const checklistIds = checklists.map((c) => c.id);

  const { data: items } = await auth.supabase
    .from('checklist_items')
    .select('*')
    .in('checklist_id', checklistIds)
    .order('sort_order')
    .order('created_at');

  const allItems = (items as ChecklistItem[]) || [];

  return (checklists as TripChecklist[]).map((checklist) => {
    const checklistItems = allItems.filter((item) => item.checklist_id === checklist.id);
    return {
      ...checklist,
      items: checklistItems,
      completedCount: checklistItems.filter((item) => item.is_completed).length,
      totalCount: checklistItems.length,
    };
  });
}

export async function createChecklist(input: {
  trip_id: string;
  name: string;
  description?: string | null;
  category: 'packing' | 'todo' | 'shopping' | 'documents' | 'other';
}): Promise<ChecklistResult> {
  const auth = await requireTripMember(input.trip_id);
  if (!auth.ok) return { error: auth.error };

  const { supabase, user } = auth;

  // Get max sort_order
  const { data: existing } = await supabase
    .from('trip_checklists')
    .select('sort_order')
    .eq('trip_id', input.trip_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data: checklist, error } = await supabase
    .from('trip_checklists')
    .insert({
      trip_id: input.trip_id,
      name: input.name,
      description: input.description || null,
      category: input.category,
      sort_order: nextOrder,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidate.tripChecklists(input.trip_id);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'checklist',
    entityId: checklist.id,
    metadata: { name: input.name },
  });

  return { success: true, checklistId: checklist.id };
}

export async function deleteChecklist(checklistId: string): Promise<ChecklistResult> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  const { supabase } = auth;

  const { data: checklist } = await supabase
    .from('trip_checklists')
    .select('trip_id')
    .eq('id', checklistId)
    .single();

  if (!checklist) {
    return { error: 'Checklist não encontrada' };
  }

  const { error } = await supabase.from('trip_checklists').delete().eq('id', checklistId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripChecklists(checklist.trip_id);
  return { success: true };
}

export async function addChecklistItem(input: {
  checklist_id: string;
  title: string;
  assigned_to?: string | null;
  quantity?: number;
}): Promise<ChecklistItemResult> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  const { supabase, user } = auth;

  // Get checklist to find trip_id for revalidation
  const { data: checklist } = await supabase
    .from('trip_checklists')
    .select('trip_id')
    .eq('id', input.checklist_id)
    .single();

  if (!checklist) {
    return { error: 'Checklist não encontrada' };
  }

  // Get max sort_order
  const { data: existing } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('checklist_id', input.checklist_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data: item, error } = await supabase
    .from('checklist_items')
    .insert({
      checklist_id: input.checklist_id,
      title: input.title,
      assigned_to: input.assigned_to || null,
      quantity: input.quantity || 1,
      sort_order: nextOrder,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidate.tripChecklists(checklist.trip_id);
  return { success: true, itemId: item.id };
}

export async function toggleChecklistItem(itemId: string): Promise<ChecklistItemResult> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  const { supabase, user } = auth;

  // Get current item state
  const { data: item } = await supabase
    .from('checklist_items')
    .select('is_completed, checklist_id, title')
    .eq('id', itemId)
    .single();

  if (!item) {
    return { error: 'Item não encontrado' };
  }

  const nowCompleted = !item.is_completed;

  const { error } = await supabase
    .from('checklist_items')
    .update({
      is_completed: nowCompleted,
      completed_by: nowCompleted ? user.id : null,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    })
    .eq('id', itemId);

  if (error) {
    return { error: error.message };
  }

  // Get trip_id for revalidation
  const { data: checklist } = await supabase
    .from('trip_checklists')
    .select('trip_id')
    .eq('id', item.checklist_id)
    .single();

  if (checklist) {
    revalidate.tripChecklists(checklist.trip_id);

    if (nowCompleted) {
      logActivity({
        tripId: checklist.trip_id,
        action: 'completed',
        entityType: 'checklist_item',
        entityId: itemId,
        metadata: { title: item.title },
      });
    }
  }

  return { success: true, itemId };
}

export async function deleteChecklistItem(itemId: string): Promise<ChecklistItemResult> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  const { supabase } = auth;

  // Get item with checklist for trip_id
  const { data: item } = await supabase
    .from('checklist_items')
    .select('checklist_id')
    .eq('id', itemId)
    .single();

  if (!item) {
    return { error: 'Item não encontrado' };
  }

  const { data: checklist } = await supabase
    .from('trip_checklists')
    .select('trip_id')
    .eq('id', item.checklist_id)
    .single();

  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);

  if (error) {
    return { error: error.message };
  }

  if (checklist) {
    revalidate.tripChecklists(checklist.trip_id);
  }

  return { success: true };
}
