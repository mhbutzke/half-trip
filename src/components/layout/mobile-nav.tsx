'use client';

import { useState } from 'react';
import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Home,
  Settings,
  Plane,
  Wallet,
  MoreHorizontal,
  Users,
  CheckSquare,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { BottomSheet } from '@/components/ui/bottom-sheet';

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
  const [moreOpen, setMoreOpen] = useState(false);

  // Detect if we're viewing a trip based on the URL
  const tripMatch = pathname.match(/^\/trip\/([^/]+)/);
  const tripId = tripMatch?.[1];

  const tripNavigation: NavItem[] = [
    {
      name: 'Resumo',
      href: routes.trip.overview(tripId!),
      icon: Home,
      exact: true,
    },
    {
      name: 'Roteiro',
      href: routes.trip.itinerary(tripId!),
      icon: Calendar,
    },
    {
      name: 'Finanças',
      href: routes.trip.expenses(tripId!),
      icon: Wallet,
    },
    {
      name: 'Mais',
      href: '#more',
      icon: MoreHorizontal,
    },
  ];

  const mainNavigation: NavItem[] = [
    {
      name: 'Viagens',
      href: routes.trips(),
      icon: Plane,
    },
    {
      name: 'Configurações',
      href: routes.settings(),
      icon: Settings,
    },
  ];

  const moreItems: NavItem[] = tripId
    ? [
        { name: 'Grupo', href: routes.trip.participants(tripId), icon: Users },
        { name: 'Checklists', href: routes.trip.checklists(tripId), icon: CheckSquare },
        { name: 'Notas', href: routes.trip.notes(tripId), icon: FileText },
      ]
    : [];

  const navigation = tripId ? tripNavigation : mainNavigation;

  const isActive = (href: string, exact?: boolean) => {
    if (href === '#more') {
      // "Mais" is active when on one of its sub-pages
      return moreItems.some((item) => pathname.startsWith(item.href));
    }
    if (exact) {
      return pathname === href;
    }
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

  const handleNavClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.href === '#more') {
      e.preventDefault();
      setMoreOpen(true);
    }
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
        role="navigation"
        aria-label="Navegação principal"
      >
        {activeIndex >= 0 && (
          <div
            className="absolute top-0 h-0.5 bg-primary rounded-full transition-all duration-200 ease-out"
            style={{
              width: `${100 / navigation.length}%`,
              left: `${(activeIndex / navigation.length) * 100}%`,
            }}
          />
        )}
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, 'exact' in item ? item.exact : undefined);
            const isMoreButton = item.href === '#more';

            if (isMoreButton) {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={(e) => handleNavClick(item, e)}
                  aria-expanded={moreOpen}
                  className={cn(
                    'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-all duration-150 active:scale-[0.96]',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground active:bg-accent active:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-all duration-150',
                      active && 'text-primary',
                      moreOpen && 'rotate-90'
                    )}
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'text-[10px] font-medium leading-tight',
                      active && 'text-primary'
                    )}
                  >
                    {item.name}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-all duration-150 active:scale-[0.96]',
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

      {/* "Mais" Bottom Sheet */}
      {tripId && (
        <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="Mais opções">
          <div className="space-y-1 pb-4">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                    active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
