import { AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: 'default' | 'destructive';
}

/**
 * Error message component for displaying errors inline
 */
export function ErrorMessage({ title, message, variant = 'destructive' }: ErrorMessageProps) {
  return (
    <Alert variant={variant}>
      {variant === 'destructive' ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
