'use client';

import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  CheckSquare,
  Home,
  Plane,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

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

  const tripNavigation: NavItem[] = [
    { name: 'Resumo', href: routes.trip.overview(tripId!), icon: Home, exact: true },
    { name: 'Roteiro', href: routes.trip.itinerary(tripId!), icon: Calendar },
    { name: 'Finanças', href: routes.trip.expenses(tripId!), icon: Wallet },
    { name: 'Grupo', href: routes.trip.participants(tripId!), icon: Users },
    { name: 'Checklists', href: routes.trip.checklists(tripId!), icon: CheckSquare },
  ];

  const mainNavigation: NavItem[] = [
    { name: 'Viagens', href: routes.trips(), icon: Plane },
    { name: 'Configurações', href: routes.settings(), icon: Settings },
  ];

  const navigation = tripId ? tripNavigation : mainNavigation;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    // "Finanças" should be active on expenses, balance, and budget
    if (tripId && href === routes.trip.expenses(tripId)) {
      return (
        pathname.startsWith(routes.trip.expenses(tripId)) ||
        pathname.startsWith(routes.trip.balance(tripId)) ||
        pathname.startsWith(routes.trip.budget(tripId))
      );
    }
    return pathname.startsWith(href);
  };

  const activeIndex = navigation.findIndex((item) =>
    isActive(item.href, 'exact' in item ? item.exact : undefined)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      role="navigation"
      aria-label="Navegação principal"
    >
      {activeIndex >= 0 && (
        <div
          className="absolute top-0 h-0.5 rounded-full bg-primary transition-all duration-200 ease-out"
          style={{
            width: `${100 / navigation.length}%`,
            left: `${(activeIndex / navigation.length) * 100}%`,
          }}
        />
      )}
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, 'exact' in item ? item.exact : undefined);

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-all duration-150 active:scale-[0.96]',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:bg-accent active:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-all duration-150',
                  active && 'text-primary'
                )}
                strokeWidth={active ? 2.5 : 2}
                aria-hidden="true"
              />
              <span
                className={cn('text-[9px] font-medium leading-tight', active && 'text-primary')}
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
