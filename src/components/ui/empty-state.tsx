import { type ReactNode } from 'react';
import { Lightbulb, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: ReactNode;
  tips?: string[];
  tipTitle?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration,
  tips,
  tipTitle = 'Dicas úteis',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      {illustration ? (
        <div className="mb-6 flex size-32 items-center justify-center">{illustration}</div>
      ) : (
        <div className="mb-6 rounded-full bg-muted p-8">
          <Icon className="size-12 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <h2 className="mb-3 text-2xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="mb-8 max-w-md text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="lg" className="mb-8">
          {action.label}
        </Button>
      )}
      {tips && tips.length > 0 && (
        <div className="mt-4 w-full max-w-lg">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4 text-primary" aria-hidden="true" />
            {tipTitle}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
              >
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
