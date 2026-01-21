/**
 * User-friendly error messages for common error scenarios
 * Maps technical errors to Portuguese messages that users can understand
 */

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  TIMEOUT: 'A requisição demorou muito. Tente novamente.',
  OFFLINE: 'Você está offline. Verifique sua conexão com a internet.',

  // Authentication errors
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  EMAIL_NOT_CONFIRMED: 'Por favor, confirme seu email antes de fazer login.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  SESSION_EXPIRED: 'Sua sessão expirou. Por favor, faça login novamente.',
  UNAUTHORIZED: 'Você não tem permissão para acessar este recurso.',

  // Validation errors
  VALIDATION_ERROR: 'Por favor, verifique os dados informados.',
  REQUIRED_FIELD: 'Este campo é obrigatório.',
  INVALID_EMAIL: 'Email inválido.',
  PASSWORD_TOO_SHORT: 'A senha deve ter pelo menos 6 caracteres.',
  PASSWORDS_DONT_MATCH: 'As senhas não coincidem.',

  // Database errors
  DUPLICATE_ENTRY: 'Este registro já existe.',
  NOT_FOUND: 'Recurso não encontrado.',
  FOREIGN_KEY_VIOLATION: 'Não é possível excluir este item porque está sendo usado.',

  // File upload errors
  FILE_TOO_LARGE: 'O arquivo é muito grande. Tamanho máximo: ',
  INVALID_FILE_TYPE: 'Tipo de arquivo não suportado.',
  UPLOAD_FAILED: 'Falha ao enviar arquivo. Tente novamente.',

  // Trip errors
  TRIP_NOT_FOUND: 'Viagem não encontrada.',
  NOT_TRIP_MEMBER: 'Você não é membro desta viagem.',
  CANNOT_LEAVE_AS_SOLE_ORGANIZER: 'Você não pode sair sendo o único organizador.',

  // Expense errors
  INVALID_SPLIT: 'A divisão das despesas está incorreta.',
  EXPENSE_NOT_FOUND: 'Despesa não encontrada.',

  // Generic errors
  UNKNOWN_ERROR: 'Algo deu errado. Por favor, tente novamente.',
  SERVER_ERROR: 'Erro no servidor. Tente novamente em alguns instantes.',
} as const;

/**
 * Error codes that map to user-friendly messages
 */
export type ErrorCode = keyof typeof ERROR_MESSAGES;

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(code: ErrorCode, details?: string): string {
  const message = ERROR_MESSAGES[code];
  return details ? `${message} ${details}` : message;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('offline') ||
      error.message.includes('timeout')
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('auth') ||
      error.message.includes('unauthorized') ||
      error.message.includes('unauthenticated') ||
      error.message.includes('session')
    );
  }
  return false;
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('permission') ||
      error.message.includes('forbidden') ||
      error.message.includes('unauthorized')
    );
  }
  return false;
}
