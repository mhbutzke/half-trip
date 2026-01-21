import Link from 'next/link';
import { Plane } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Plane className="h-5 w-5 text-primary" />
          <span>Half Trip</span>
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
