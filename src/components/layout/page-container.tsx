import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: boolean;
  bottomNav?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function PageContainer({
  children,
  className,
  maxWidth = '7xl',
  padding = true,
  bottomNav = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full overflow-x-clip',
        maxWidthClasses[maxWidth],
        padding && 'px-4 py-6 sm:px-6 lg:px-8',
        bottomNav && 'md:pb-6',
        className
      )}
    >
      {children}
    </div>
  );
}
