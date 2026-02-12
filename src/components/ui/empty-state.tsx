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
  tipTitle = 'Dica',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      {illustration ? (
        <div className="mb-4 flex size-20 items-center justify-center">{illustration}</div>
      ) : (
        <div className="mb-4 rounded-full bg-muted p-6">
          <Icon className="size-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
      {tips && tips.length > 0 && (
        <div className="mt-6 w-full max-w-sm rounded-lg border border-border/50 bg-muted/30 p-4 text-left">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="size-4" aria-hidden="true" />
            {tipTitle}
          </div>
          <ul className="space-y-1">
            {tips.map((tip) => (
              <li key={tip} className="text-xs text-muted-foreground/80">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
