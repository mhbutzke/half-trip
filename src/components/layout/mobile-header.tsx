'use client';

import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import { ChevronLeft, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { SyncStatus } from '@/components/sync';
import { NotificationPanel, NotificationSettingsDialog } from '@/components/notifications';
import { useTripContext } from '@/hooks/use-trip-context';
import { useScrollDirection } from '@/hooks/use-scroll-direction';

interface MobileHeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  } | null;
  onSignOut?: () => void;
}

export function MobileHeader({ user, onSignOut }: MobileHeaderProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);

  const storeTripName = useTripContext((s) => s.tripName);
  const scrollDirection = useScrollDirection();
  const isHidden = scrollDirection === 'down';

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const tripMatch = pathname.match(/^\/trip\/([^/]+)/);
  const isTripPage = !!tripMatch;
  const isTripSubpage = isTripPage && pathname.split('/').length > 3;
  const isSettingsPage = pathname.startsWith('/settings');

  const getTitle = () => {
    if (isTripPage && storeTripName) return storeTripName;
    if (isSettingsPage) return 'Configurações';
    return 'Suas Viagens';
  };

  const getBackHref = () => {
    if (isTripPage) return routes.trips();
    if (isSettingsPage) return routes.trips();
    return null;
  };

  const backHref = getBackHref();
  const title = getTitle();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden transition-transform duration-200',
          isHidden && '-translate-y-full'
        )}
      >
        <div className="flex h-12 items-center justify-between px-4">
          {/* Left: Back button + title */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {backHref ? (
              <Link
                href={backHref}
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-[0.96]"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : null}
            <div className="min-w-0 flex-1">
              {isTripSubpage && storeTripName && (
                <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                  {storeTripName}
                </span>
              )}
              <span className="truncate text-base font-semibold">{title}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex shrink-0 items-center gap-0.5">
            {user && <SyncStatus />}
            {user && <NotificationPanel onOpenSettings={() => setNotificationSettingsOpen(true)} />}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10"
              aria-label={
                mounted
                  ? theme === 'dark'
                    ? 'Ativar modo claro'
                    : 'Ativar modo escuro'
                  : 'Alternar tema'
              }
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt="" />
                      <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex flex-col gap-1 px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={routes.settings()} className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {user && (
        <NotificationSettingsDialog
          open={notificationSettingsOpen}
          onOpenChange={setNotificationSettingsOpen}
        />
      )}
    </>
  );
}
