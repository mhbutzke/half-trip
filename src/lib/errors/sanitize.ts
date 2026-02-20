import { logError } from './logger';

interface PostgrestLikeError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Sanitiza erros de banco de dados para evitar vazamento de detalhes internos.
 * Loga o erro completo server-side e retorna mensagem amigável ao cliente.
 */
export function sanitizeDbError(
  error: PostgrestLikeError,
  defaultMessage: string,
  context?: { action?: string; [key: string]: unknown }
): string {
  // Log o erro completo para debugging server-side
  logError(error, { action: context?.action ?? 'db-operation', ...context });

  // Mapear erros PostgreSQL conhecidos para mensagens amigáveis
  if (error.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return 'Este registro já existe';
      case '23503': // foreign_key_violation
        return 'Referência inválida. O registro associado não existe';
      case '23502': // not_null_violation
        return 'Campo obrigatório não preenchido';
      case '23514': // check_violation
        return 'Valor inválido para este campo';
      case '42501': // insufficient_privilege
        return 'Sem permissão para esta operação';
      case '42P01': // undefined_table
      case '42703': // undefined_column
        return defaultMessage;
      case 'PGRST301': // PostgREST JWT expired
        return 'Sessão expirada. Faça login novamente';
      case 'PGRST116': // no rows found
        return 'Registro não encontrado';
    }
  }

  // Para mensagens que claramente não contêm info sensível, permitir passthrough
  // de mensagens conhecidas do Supabase Auth
  const safePatterns = [
    'already registered',
    'rate limit',
    'Email not confirmed',
    'Invalid login credentials',
  ];

  const messageLower = error.message.toLowerCase();
  for (const pattern of safePatterns) {
    if (messageLower.includes(pattern.toLowerCase())) {
      // Estas são mensagens do Supabase Auth que já traduzimos no caller
      return error.message;
    }
  }

  // Default: retornar mensagem genérica (nunca o erro raw)
  return defaultMessage;
}
