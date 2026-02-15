'use client';

import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FadeIn } from './fade-in';

interface EmptyStateEnhancedProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tips?: string[];
  className?: string;
  variant?: 'card' | 'inline';
}

/**
 * EmptyStateEnhanced Component
 * 
 * Enhanced empty state with:
 * - Custom icon or illustration
 * - Primary and secondary actions
 * - Helpful tips
 * - Fade-in animation
 * - Card or inline variant
 */
export function EmptyStateEnhanced({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  tips,
  className,
  variant = 'inline',
}: EmptyStateEnhancedProps) {
  const content = (
    <FadeIn className="flex flex-col items-center justify-center text-center py-12 px-4">
      {/* Icon or Illustration */}
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : Icon ? (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : null}

      {/* Title and Description */}
      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="lg"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="lg"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="mt-8 max-w-md">
          <p className="text-xs font-medium text-muted-foreground mb-3">💡 Dicas</p>
          <ul className="space-y-2 text-left">
            {tips.map((tip, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </FadeIn>
  );

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="py-8">{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
}
