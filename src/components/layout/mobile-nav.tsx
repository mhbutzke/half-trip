'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Home, Receipt, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  tripId?: string;
}

export function MobileNav({ tripId }: MobileNavProps) {
  const pathname = usePathname();

  const tripNavigation = tripId
    ? [
        {
          name: 'Resumo',
          href: `/trip/${tripId}`,
          icon: Home,
          exact: true,
        },
        {
          name: 'Roteiro',
          href: `/trip/${tripId}/itinerary`,
          icon: Calendar,
        },
        {
          name: 'Despesas',
          href: `/trip/${tripId}/expenses`,
          icon: Receipt,
        },
        {
          name: 'Grupo',
          href: `/trip/${tripId}/participants`,
          icon: Users,
        },
      ]
    : [
        {
          name: 'Viagens',
          href: '/trips',
          icon: Home,
        },
        {
          name: 'Configurações',
          href: '/settings',
          icon: Settings,
        },
      ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {tripNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground active:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn('text-xs font-medium', active && 'text-primary')}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS devices */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
