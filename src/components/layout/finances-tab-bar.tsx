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

  const activeIndex = tabs.findIndex((tab) => {
    const href = routes.trip[tab.key](tripId);
    return pathname.startsWith(href);
  });

  return (
    <div className="sticky top-12 z-40 bg-background/95 px-4 py-2 backdrop-blur md:hidden">
      <div className="relative mx-auto flex max-w-lg rounded-lg bg-muted p-1">
        {/* Sliding pill indicator */}
        {activeIndex >= 0 && (
          <div
            className="absolute bottom-1 top-1 rounded-md bg-background shadow-sm transition-all duration-200 ease-out"
            style={{
              width: `${100 / tabs.length}%`,
              left: `calc(${(activeIndex / tabs.length) * 100}% + 0px)`,
            }}
          />
        )}
        {tabs.map((tab) => {
          const href = routes.trip[tab.key](tripId);
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                'relative z-10 flex h-8 flex-1 items-center justify-center text-center text-sm transition-colors',
                isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
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
