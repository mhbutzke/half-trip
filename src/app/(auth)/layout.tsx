import Link from 'next/link';
import Image from 'next/image';
import { AuthHeader } from '@/components/layout/auth-header';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/icon.svg"
            width={24}
            height={24}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 shrink-0"
            priority
          />
          <span className="font-semibold" style={{ fontFamily: 'var(--font-brand)' }}>
            Half Trip
          </span>
        </Link>
        <AuthHeader />
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="grid w-full max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-10">
          <section className="hidden space-y-4 md:block">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Half Trip
            </p>
            <h2 className="max-w-[18ch] text-4xl font-bold leading-tight tracking-tight text-foreground">
              Planeje junto. Viaje melhor. Divida justo.
            </h2>
            <p className="max-w-[44ch] text-base leading-relaxed text-foreground/70">
              Organize itinerários, participantes e despesas em um único lugar com uma interface
              clara para o seu grupo.
            </p>
          </section>

          <div className="w-full max-w-sm md:justify-self-end">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-14 items-center justify-center border-t px-4 text-sm text-muted-foreground">
        <p>Planeje junto. Viaje melhor. Divida justo.</p>
      </footer>
    </div>
  );
}
