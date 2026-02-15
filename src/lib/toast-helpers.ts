import React from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

/**
 * Toast Helpers
 *
 * Enhanced toast notifications with custom styling and icons.
 * Built on top of Sonner for consistency.
 */

export const toastHelpers = {
  /**
   * Success toast with checkmark icon
   */
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      icon: React.createElement(CheckCircle, { className: 'h-4 w-4' }),
      duration: 4000,
    });
  },

  /**
   * Error toast with X icon
   */
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      icon: React.createElement(XCircle, { className: 'h-4 w-4' }),
      duration: 5000,
    });
  },

  /**
   * Warning toast with alert icon
   */
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      icon: React.createElement(AlertCircle, { className: 'h-4 w-4' }),
      duration: 4000,
    });
  },

  /**
   * Info toast
   */
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      icon: React.createElement(Info, { className: 'h-4 w-4' }),
      duration: 3000,
    });
  },

  /**
   * Loading toast (returns ID for dismissal)
   */
  loading: (message: string) => {
    return toast.loading(message, {
      icon: React.createElement(Loader2, { className: 'h-4 w-4 animate-spin' }),
    });
  },

  /**
   * Promise toast - automatically handles loading, success, and error states
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId: string | number) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },

  /**
   * Custom toast with action button
   */
  withAction: (
    message: string,
    actionLabel: string,
    onAction: () => void,
    options?: {
      description?: string;
      variant?: 'default' | 'success' | 'error' | 'warning';
    }
  ) => {
    const { description, variant = 'default' } = options || {};

    const toastFn = {
      default: toast,
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
    }[variant];

    toastFn(message, {
      description,
      action: {
        label: actionLabel,
        onClick: onAction,
      },
      duration: 5000,
    });
  },
};

/**
 * Common toast messages for the app
 */
export const commonToasts = {
  saved: () => toastHelpers.success('Salvo com sucesso'),
  deleted: () => toastHelpers.success('Excluído com sucesso'),
  updated: () => toastHelpers.success('Atualizado com sucesso'),
  copied: () => toastHelpers.success('Copiado para área de transferência'),

  networkError: () =>
    toastHelpers.error('Erro de conexão', 'Verifique sua internet e tente novamente'),

  unauthorized: () => toastHelpers.error('Acesso negado', 'Você não tem permissão para esta ação'),

  notFound: (item: string = 'Item') =>
    toastHelpers.error(`${item} não encontrado`, 'O recurso solicitado não existe'),

  formError: () =>
    toastHelpers.error('Erro no formulário', 'Verifique os campos e tente novamente'),
};
