'use client';

import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Map,
  Receipt,
  Shield,
  ScrollText,
  ArrowLeft,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import type { SystemAdminRole } from '@/types/database';

type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

interface AdminSidebarProps {
  adminRole: SystemAdminRole;
}

function SidebarContent({ adminRole }: AdminSidebarProps) {
  const pathname = usePathname();

  const mainItems: SidebarItem[] = [
    { name: 'Dashboard', href: routes.admin.dashboard(), icon: LayoutDashboard, exact: true },
  ];

  const managementItems: SidebarItem[] = [
    { name: 'Usuários', href: routes.admin.users(), icon: Users },
    { name: 'Viagens', href: routes.admin.trips(), icon: Map },
    { name: 'Despesas', href: routes.admin.expenses(), icon: Receipt },
  ];

  const systemItems: SidebarItem[] = [
    { name: 'Administradores', href: routes.admin.admins(), icon: Shield },
    { name: 'Log de Atividade', href: routes.admin.activityLog(), icon: ScrollText },
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
    <nav className="flex flex-1 flex-col gap-1.5 p-5" aria-label="Navegação admin">
      <div className="mb-4 flex items-center gap-2 px-3.5">
        <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-lg font-bold">Admin</span>
        <Badge
          variant={adminRole === 'super_admin' ? 'default' : 'secondary'}
          className="text-[10px]"
        >
          {adminRole === 'super_admin' ? 'Super' : 'Admin'}
        </Badge>
      </div>

      {mainItems.map(renderItem)}

      <div className="my-2 border-t" />
      <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Gestão
      </p>
      {managementItems.map(renderItem)}

      <div className="my-2 border-t" />
      <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Sistema
      </p>
      {systemItems.map(renderItem)}

      <div className="mt-auto border-t pt-4">
        <Link
          href={routes.trips()}
          className="flex min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          Voltar ao app
        </Link>
      </div>
    </nav>
  );
}

export function AdminSidebar({ adminRole }: AdminSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:bg-sidebar xl:w-72">
      <SidebarContent adminRole={adminRole} />
    </aside>
  );
}

export function AdminMobileSidebar({ adminRole }: AdminSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Menu de navegação admin</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-end p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div onClick={() => setOpen(false)}>
            <SidebarContent adminRole={adminRole} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
