'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Home, Receipt, Settings, Users, Plane, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mobile bottom navigation component
 * Automatically detects if user is viewing a trip and shows trip-specific navigation
 * Touch-friendly with minimum 44px tap targets
 */
export function MobileNav() {
  const pathname = usePathname();

  // Detect if we're viewing a trip based on the URL
  const tripMatch = pathname.match(/^\/trip\/([^/]+)/);
  const tripId = tripMatch?.[1];

  const tripNavigation = [
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
      name: 'Balanço',
      href: `/trip/${tripId}/balance`,
      icon: Scale,
    },
    {
      name: 'Grupo',
      href: `/trip/${tripId}/participants`,
      icon: Users,
    },
  ];

  const mainNavigation = [
    {
      name: 'Viagens',
      href: '/trips',
      icon: Plane,
    },
    {
      name: 'Configurações',
      href: '/settings',
      icon: Settings,
    },
  ];

  const navigation = tripId ? tripNavigation : mainNavigation;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, 'exact' in item ? item.exact : undefined);

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                // Minimum 44px tap target for touch accessibility
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-colors',
                // Active state styling
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:bg-accent active:text-foreground'
              )}
            >
              <Icon
                className={cn('h-5 w-5 shrink-0', active && 'text-primary')}
                aria-hidden="true"
              />
              <span
                className={cn('text-[10px] font-medium leading-tight', active && 'text-primary')}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)] bg-background" />
    </nav>
  );
}
