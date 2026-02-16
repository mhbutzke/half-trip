'use client';

import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  Receipt,
  Scale,
  Wallet,
  Users,
  CheckSquare,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';

interface TripSidebarProps {
  tripId: string;
}

type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function TripSidebar({ tripId }: TripSidebarProps) {
  const pathname = usePathname();

  const mainItems: SidebarItem[] = [
    { name: 'Resumo', href: routes.trip.overview(tripId), icon: Home, exact: true },
    { name: 'Roteiro', href: routes.trip.itinerary(tripId), icon: Calendar },
  ];

  const financeItems: SidebarItem[] = [
    { name: 'Despesas', href: routes.trip.expenses(tripId), icon: Receipt },
    { name: 'Balanço', href: routes.trip.balance(tripId), icon: Scale },
    { name: 'Orçamento', href: routes.trip.budget(tripId), icon: Wallet },
  ];

  const moreItems: SidebarItem[] = [
    { name: 'Grupo', href: routes.trip.participants(tripId), icon: Users },
    { name: 'Checklists', href: routes.trip.checklists(tripId), icon: CheckSquare },
    { name: 'Notas', href: routes.trip.notes(tripId), icon: FileText },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const renderItem = (item: SidebarItem) => {
    const Icon = item.icon;
    const active = isActive(item.href, item.exact);

    return (
      <Link
        key={item.name}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {item.name}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:bg-sidebar xl:w-72">
      <nav className="flex flex-1 flex-col gap-1.5 p-5" aria-label="Navegação da viagem">
        {mainItems.map(renderItem)}

        <div className="my-2 border-t" />
        <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Finanças
        </p>
        {financeItems.map(renderItem)}

        <div className="my-2 border-t" />
        <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Mais
        </p>
        {moreItems.map(renderItem)}
      </nav>
    </aside>
  );
}
