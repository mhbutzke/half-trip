'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FinancesTabBarProps {
  tripId: string;
}

const tabs = [
  { label: 'Despesas', segment: 'expenses' },
  { label: 'Balanço', segment: 'balance' },
  { label: 'Orçamento', segment: 'budget' },
];

export function FinancesTabBar({ tripId }: FinancesTabBarProps) {
  const pathname = usePathname();

  return (
    <div className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const href = `/trip/${tripId}/${tab.segment}`;
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                'flex-1 py-2.5 text-center text-sm font-medium transition-colors',
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
