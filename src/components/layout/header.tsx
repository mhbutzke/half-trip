'use client';

import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LogOut, Menu, Moon, Plane, Settings, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { SyncStatus } from '@/components/sync';
import { NotificationPanel, NotificationSettingsDialog } from '@/components/notifications';

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  } | null;
  onSignOut?: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const navigation = user
    ? [
        { name: 'Viagens', href: routes.trips(), icon: Plane },
        { name: 'Configurações', href: routes.settings(), icon: Settings },
      ]
    : [];

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={user ? routes.trips() : routes.home()}
          className="flex min-h-[44px] items-center gap-2"
        >
          <Image
            src="/brand/icon.svg"
            width={28}
            height={28}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0"
            priority
          />
          <span
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            Half Trip
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" role="navigation">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Sync status - only show for authenticated users */}
          {user && <SyncStatus />}

          {/* Notifications - only show for authenticated users */}
          {user && <NotificationPanel onOpenSettings={() => setNotificationSettingsOpen(true)} />}

          {/* Theme toggle - 44px touch target */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-11 w-11"
            aria-label={
              mounted
                ? theme === 'dark'
                  ? 'Ativar modo claro'
                  : 'Ativar modo escuro'
                : 'Alternar tema'
            }
          >
            <Sun
              className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
              aria-hidden="true"
            />
            <Moon
              className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
              aria-hidden="true"
            />
          </Button>

          {user ? (
            <>
              {/* User menu (desktop) - 44px touch target */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="hidden md:flex">
                  <Button
                    variant="ghost"
                    className="relative h-11 w-11 rounded-full p-0"
                    aria-label="Menu do usuário"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar} alt="" />
                      <AvatarFallback>
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
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

              {/* Mobile menu button - 44px touch target */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                  <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                  <div className="flex h-full flex-col gap-6 pt-6">
                    {/* User info */}
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} alt="" />
                        <AvatarFallback className="text-lg">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    {/* Navigation - touch-friendly links */}
                    <nav className="flex flex-col gap-1" role="navigation">
                      {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            aria-current={isActive(item.href) ? 'page' : undefined}
                            className={cn(
                              // Minimum 44px tap target
                              'flex min-h-[48px] items-center gap-3 rounded-lg px-4 text-base font-medium transition-colors',
                              isActive(item.href)
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground active:bg-accent active:text-accent-foreground'
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </nav>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Logout - touch-friendly button */}
                    <div className="border-t pt-4">
                      <Button
                        variant="ghost"
                        // Minimum 44px tap target
                        className="h-12 w-full justify-start gap-3 text-base text-destructive hover:text-destructive"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onSignOut?.();
                        }}
                      >
                        <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                        Sair
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            /* Auth buttons for logged out users */
            <div className="flex items-center">
              <Button asChild className="min-h-[44px]">
                <Link href={routes.login()}>Entrar</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Notification settings dialog */}
      {user && (
        <NotificationSettingsDialog
          open={notificationSettingsOpen}
          onOpenChange={setNotificationSettingsOpen}
        />
      )}
    </header>
  );
}
