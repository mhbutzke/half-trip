'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';

interface FinancesTabBarProps {
  tripId: string;
}

const tabs = [
  { label: 'Despesas', key: 'expenses' as const },
  { label: 'Balanço', key: 'balance' as const },
  { label: 'Orçamento', key: 'budget' as const },
];

export function FinancesTabBar({ tripId }: FinancesTabBarProps) {
  const pathname = usePathname();

  return (
    <div className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const href = routes.trip[tab.key](tripId);
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                'flex h-11 flex-1 items-center justify-center text-center text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
