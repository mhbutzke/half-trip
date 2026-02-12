import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatWidgetProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function StatWidget({
  label,
  value,
  icon: Icon,
  description,
  onClick,
  className,
}: StatWidgetProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Card
      className={cn(
        'overflow-hidden',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
        className
      )}
    >
      <Wrapper
        onClick={onClick}
        className={cn(
          'w-full text-left',
          onClick &&
            'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        {...(onClick ? { type: 'button' as const } : {})}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{label}</p>
              <div className="mt-0.5">{value}</div>
              {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
        </CardContent>
      </Wrapper>
    </Card>
  );
}
