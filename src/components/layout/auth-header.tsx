'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AuthHeader() {
  const pathname = usePathname();

  const isLoginRoute = pathname?.startsWith('/login');
  const isRegisterRoute = pathname?.startsWith('/register');

  const cta = isLoginRoute
    ? { href: '/register', label: 'Criar conta' }
    : isRegisterRoute
      ? { href: '/login', label: 'Entrar' }
      : { href: '/login', label: 'Entrar' };

  return (
    <Link
      href={cta.href}
      className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {cta.label}
    </Link>
  );
}
