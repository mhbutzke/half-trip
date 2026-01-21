'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
import { isValidReceiptType, MAX_RECEIPT_SIZE } from '@/lib/utils/receipt-helpers';

export type ReceiptResult = {
  error?: string;
  success?: boolean;
  receiptUrl?: string;
  signedUrl?: string;
};

/**
 * Generates a unique file path for receipt storage
 */
function generateReceiptPath(tripId: string, expenseId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${tripId}/${expenseId}/${timestamp}-${randomId}-${sanitizedFileName}`;
}

/**
 * Uploads a receipt for an expense
 */
export async function uploadReceipt(
  tripId: string,
  expenseId: string,
  file: File
): Promise<ReceiptResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Validate file type
  if (!isValidReceiptType(file.type)) {
    return { error: 'Tipo de arquivo não permitido. Use imagens (JPEG, PNG, WebP, GIF) ou PDF.' };
  }

  // Validate file size
  if (file.size > MAX_RECEIPT_SIZE) {
    return { error: 'Arquivo muito grande. O tamanho máximo é 10MB.' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Verify expense exists and belongs to this trip
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, receipt_url')
    .eq('id', expenseId)
    .eq('trip_id', tripId)
    .single();

  if (!expense) {
    return { error: 'Despesa não encontrada' };
  }

  // If there's an existing receipt, delete it first
  if (expense.receipt_url) {
    await supabase.storage.from('receipts').remove([expense.receipt_url]);
  }

  // Generate file path and upload to storage
  const filePath = generateReceiptPath(tripId, expenseId, file.name);

  const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    console.error('Receipt upload error:', uploadError);
    return { error: 'Erro ao fazer upload do comprovante' };
  }

  // Update expense with receipt URL
  const { error: updateError } = await supabase
    .from('expenses')
    .update({ receipt_url: filePath })
    .eq('id', expenseId);

  if (updateError) {
    // Clean up uploaded file if database update fails
    await supabase.storage.from('receipts').remove([filePath]);
    console.error('Receipt update error:', updateError);
    return { error: 'Erro ao salvar comprovante' };
  }

  revalidatePath(`/trip/${tripId}`);
  revalidatePath(`/trip/${tripId}/expenses`);

  return { success: true, receiptUrl: filePath };
}

/**
 * Deletes a receipt from an expense
 */
export async function deleteReceipt(tripId: string, expenseId: string): Promise<ReceiptResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Get expense to verify ownership/permission and get receipt URL
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, receipt_url, created_by')
    .eq('id', expenseId)
    .eq('trip_id', tripId)
    .single();

  if (!expense) {
    return { error: 'Despesa não encontrada' };
  }

  if (!expense.receipt_url) {
    return { error: 'Esta despesa não tem comprovante' };
  }

  // Only creator or organizers can delete receipt
  if (expense.created_by !== authUser.id && member.role !== 'organizer') {
    return { error: 'Você não tem permissão para excluir este comprovante' };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('receipts')
    .remove([expense.receipt_url]);

  if (storageError) {
    console.error('Receipt storage delete error:', storageError);
    // Continue with database update even if storage fails
  }

  // Update expense to remove receipt URL
  const { error: updateError } = await supabase
    .from('expenses')
    .update({ receipt_url: null })
    .eq('id', expenseId);

  if (updateError) {
    console.error('Receipt delete error:', updateError);
    return { error: 'Erro ao excluir comprovante' };
  }

  revalidatePath(`/trip/${tripId}`);
  revalidatePath(`/trip/${tripId}/expenses`);

  return { success: true };
}

/**
 * Gets a signed URL for viewing a receipt
 */
export async function getReceiptUrl(tripId: string, receiptPath: string): Promise<ReceiptResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Generate signed URL (1 hour expiry)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(receiptPath, 60 * 60);

  if (urlError || !signedUrl) {
    console.error('Receipt URL error:', urlError);
    return { error: 'Erro ao gerar URL do comprovante' };
  }

  return { success: true, signedUrl: signedUrl.signedUrl };
}
