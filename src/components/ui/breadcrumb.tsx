import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Navegação estrutural"
      className={cn('hidden items-center gap-1.5 text-sm text-muted-foreground md:flex', className)}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          {item.href ? (
            <Link
              href={item.href}
              className="truncate transition-colors hover:text-foreground"
              style={{ maxWidth: '150px' }}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className="truncate font-medium text-foreground"
              style={{ maxWidth: '200px' }}
              aria-current="page"
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
