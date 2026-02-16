import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Brand manual: no gradients. Use pulse instead of shimmer gradient.
        'rounded-md bg-accent/60 animate-pulse',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
