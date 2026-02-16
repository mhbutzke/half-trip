import Link from 'next/link';
import Image from 'next/image';

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
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Entrar
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      {/* Footer */}
      <footer className="flex h-14 items-center justify-center border-t px-4 text-sm text-muted-foreground">
        <p>Planeje junto. Viaje melhor. Divida justo.</p>
      </footer>
    </div>
  );
}
