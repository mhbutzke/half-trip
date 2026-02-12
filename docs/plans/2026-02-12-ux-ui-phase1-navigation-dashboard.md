# UX/UI Improvement — Phase 1: Navigation + Dashboard

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the mobile navigation from 6 tabs to 4, add a desktop sidebar, and replace the static trip overview with a real-time dashboard showing financial balance, next activity, expenses, and pending actions.

**Architecture:** Mobile bottom nav reduces to 4 items (Resumo, Roteiro, Finanças, Mais). "Finanças" unifies Expenses + Balance + Budget with a segmented control. "Mais" opens a bottom sheet with secondary items. Desktop gets a fixed sidebar (lg:+) with full navigation. The trip overview becomes a dashboard with live data widgets.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, vaul (bottom sheet), Supabase Realtime, existing balance/currency utils

---

## Task 1: Install vaul and create BottomSheet component

**Files:**

- Create: `src/components/ui/bottom-sheet.tsx`

**Step 1: Install vaul dependency**

Run: `npm install vaul`
Expected: Package added to package.json

**Step 2: Create BottomSheet component**

```tsx
// src/components/ui/bottom-sheet.tsx
'use client';

import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  snapPoints?: (string | number)[];
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  snapPoints,
  className,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[96vh] flex-col rounded-t-2xl bg-background',
            className
          )}
        >
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
          {(title || description) && (
            <div className="px-4 pb-2 pt-4">
              {title && <Drawer.Title className="text-lg font-semibold">{title}</Drawer.Title>}
              {description && (
                <Drawer.Description className="text-sm text-muted-foreground">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 pb-8">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function BottomSheetTrigger({
  children,
  ...props
}: React.ComponentProps<typeof Drawer.Trigger>) {
  return <Drawer.Trigger {...props}>{children}</Drawer.Trigger>;
}
```

**Step 3: Verify it builds**

Run: `npx next build --no-lint 2>&1 | tail -5` (or `npm run build`)
Expected: Build succeeds without errors

**Step 4: Commit**

```bash
git add src/components/ui/bottom-sheet.tsx package.json package-lock.json
git commit -m "feat: add BottomSheet component using vaul"
```

---

## Task 2: Create MoneyDisplay component

**Files:**

- Create: `src/components/ui/money-display.tsx`

**Step 1: Create MoneyDisplay**

```tsx
// src/components/ui/money-display.tsx
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  colorBySign?: boolean;
  showSign?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base font-medium',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
};

export function MoneyDisplay({
  amount,
  currency = 'BRL',
  size = 'md',
  colorBySign = false,
  showSign = false,
  className,
}: MoneyDisplayProps) {
  const formatted = formatCurrency(Math.abs(amount), currency);
  const sign = amount > 0.01 ? '+' : amount < -0.01 ? '-' : '';
  const display =
    showSign && sign ? `${sign} ${formatted}` : amount < 0 ? `- ${formatted}` : formatted;

  return (
    <span
      className={cn(
        sizeClasses[size],
        colorBySign && amount > 0.01 && 'text-positive',
        colorBySign && amount < -0.01 && 'text-negative',
        colorBySign && Math.abs(amount) <= 0.01 && 'text-muted-foreground',
        className
      )}
    >
      {display}
    </span>
  );
}
```

**Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/money-display.tsx
git commit -m "feat: add MoneyDisplay component with semantic color support"
```

---

## Task 3: Create StatWidget component

**Files:**

- Create: `src/components/ui/stat-widget.tsx`

**Step 1: Create the component**

```tsx
// src/components/ui/stat-widget.tsx
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatWidgetProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function StatWidget({
  label,
  value,
  icon: Icon,
  description,
  onClick,
  className,
}: StatWidgetProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Card
      className={cn(
        'overflow-hidden',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
        className
      )}
    >
      <Wrapper
        onClick={onClick}
        className={cn(
          'w-full text-left',
          onClick &&
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg'
        )}
        {...(onClick ? { type: 'button' as const } : {})}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{label}</p>
              <div className="mt-0.5">{value}</div>
              {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
        </CardContent>
      </Wrapper>
    </Card>
  );
}
```

**Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/stat-widget.tsx
git commit -m "feat: add StatWidget component for dashboard"
```

---

## Task 4: Create server action to fetch dashboard data

**Files:**

- Create: `src/lib/supabase/dashboard.ts`

This action fetches all the data needed for the dashboard in a single call: user balance, next activity, expense totals, pending settlements, and checklist progress.

**Step 1: Create the server action**

```tsx
// src/lib/supabase/dashboard.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth';
import { getTripExpenseSummary } from '@/lib/supabase/expense-summary';

export type DashboardData = {
  userBalance: number;
  balanceDescription: string;
  totalExpenses: number;
  expenseCount: number;
  nextActivity: {
    title: string;
    date: string;
    time: string | null;
    location: string | null;
  } | null;
  pendingSettlements: {
    count: number;
    totalAmount: number;
  };
  tripProgress: {
    currentDay: number;
    totalDays: number;
  };
  budgetUsed: number | null;
  budgetTotal: number | null;
  baseCurrency: string;
};

export async function getDashboardData(tripId: string): Promise<DashboardData | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  // Fetch trip for dates and currency
  const { data: trip } = await supabase
    .from('trips')
    .select('start_date, end_date, base_currency')
    .eq('id', tripId)
    .single();

  if (!trip) return null;

  const baseCurrency = trip.base_currency || 'BRL';

  // Fetch expense summary (has balances, settlements, totals)
  const summary = await getTripExpenseSummary(tripId);

  // Find current user's balance
  const userParticipant = summary?.participants.find((p) => p.userId === user.id);
  const userBalance = userParticipant?.netBalance ?? 0;

  // Count pending settlements involving current user
  const pendingForUser =
    summary?.suggestedSettlements.filter(
      (s) => s.from.userId === user.id || s.to.userId === user.id
    ) ?? [];
  const pendingAmount = pendingForUser
    .filter((s) => s.from.userId === user.id)
    .reduce((sum, s) => sum + s.amount, 0);

  // Balance description
  let balanceDescription = 'Tudo certo!';
  if (userBalance > 0.01) {
    const creditorsCount =
      summary?.suggestedSettlements.filter((s) => s.to.userId === user.id).length ?? 0;
    balanceDescription = `Você deve receber de ${creditorsCount} ${creditorsCount === 1 ? 'pessoa' : 'pessoas'}`;
  } else if (userBalance < -0.01) {
    const debtorsCount =
      summary?.suggestedSettlements.filter((s) => s.from.userId === user.id).length ?? 0;
    balanceDescription = `Você deve para ${debtorsCount} ${debtorsCount === 1 ? 'pessoa' : 'pessoas'}`;
  }

  // Fetch next activity (first upcoming activity from now)
  const now = new Date().toISOString();
  const { data: nextActivities } = await supabase
    .from('activities')
    .select('title, date, start_time, location')
    .eq('trip_id', tripId)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })
    .limit(1);

  const nextActivity = nextActivities?.[0]
    ? {
        title: nextActivities[0].title,
        date: nextActivities[0].date,
        time: nextActivities[0].start_time,
        location: nextActivities[0].location,
      }
    : null;

  // Trip progress
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const today = new Date();
  const totalDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const currentDay = Math.max(
    0,
    Math.min(
      totalDays,
      Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    )
  );

  // Budget
  const { data: budgets } = await supabase
    .from('budgets')
    .select('amount, category')
    .eq('trip_id', tripId);

  const totalBudget = budgets?.find((b) => b.category === 'total');
  const budgetTotal = totalBudget ? totalBudget.amount : null;
  const budgetUsed = summary ? summary.totalExpenses : null;

  return {
    userBalance,
    balanceDescription,
    totalExpenses: summary?.totalExpenses ?? 0,
    expenseCount: summary?.expenseCount ?? 0,
    nextActivity,
    pendingSettlements: {
      count: pendingForUser.length,
      totalAmount: pendingAmount,
    },
    tripProgress: {
      currentDay,
      totalDays,
    },
    budgetUsed,
    budgetTotal,
    baseCurrency,
  };
}
```

**Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/supabase/dashboard.ts
git commit -m "feat: add getDashboardData server action for trip dashboard"
```

---

## Task 5: Rewrite TripOverview as real dashboard

**Files:**

- Modify: `src/app/(app)/trip/[id]/trip-overview.tsx`
- Modify: `src/app/(app)/trip/[id]/trip-content.tsx` (to pass dashboard data)
- Modify: `src/app/(app)/trip/[id]/page.tsx` (to fetch dashboard data)

**Step 1: Read trip-content.tsx to understand current data flow**

Read `src/app/(app)/trip/[id]/trip-content.tsx` and note how data is passed from page.tsx → trip-content.tsx → trip-overview.tsx.

**Step 2: Update page.tsx to also fetch dashboard data**

Add `getDashboardData` import and call alongside existing fetches in `page.tsx`. Pass the result as `initialDashboard` to `TripContent`.

**Step 3: Update trip-content.tsx to pass dashboard data through**

Add `initialDashboard?: DashboardData | null` to TripContent props and pass it to TripOverview.

**Step 4: Rewrite trip-overview.tsx as dashboard**

Replace the 6 generic section cards with real data widgets:

```tsx
// The new TripOverview will use:
// - StatWidget for "Meu Saldo", "Total Despesas", "Progresso"
// - MoneyDisplay for financial values
// - A "Próxima atividade" card
// - A "Pendências" card with actionable items
// - Keep the quick-action CTA buttons (for creating activities/expenses)
// - Keep existing lazy-loaded dialogs (AddActivityDialog, etc.)
```

Key structure:

```
┌──────────────────────────────────────────┐
│ StatWidget: Meu Saldo (MoneyDisplay)     │
│ "Você deve receber de 2 pessoas"         │
├───────────────────┬──────────────────────┤
│ StatWidget:       │ StatWidget:          │
│ Próx. Atividade   │ Total Despesas       │
├───────────────────┴──────────────────────┤
│ Progress bar: X/Y dias • N% orçamento    │
├──────────────────────────────────────────┤
│ Pendências:                               │
│ • Pagar R$ 30 para João  [→]            │
│ • 3 itens no checklist   [→]            │
├──────────────────────────────────────────┤
│ Ações rápidas:                           │
│ [+ Atividade] [+ Despesa] [+ Nota]      │
└──────────────────────────────────────────┘
```

The existing dialog state (`isActivityOpen`, etc.) and lazy-loaded components stay. The sections array and generic cards are removed and replaced with the widgets above.

**Step 5: Verify build and test manually**

Run: `npm run build`
Expected: Build succeeds

Then test locally: `npm run dev` → navigate to a trip → verify dashboard shows real data.

**Step 6: Commit**

```bash
git add src/app/(app)/trip/[id]/page.tsx src/app/(app)/trip/[id]/trip-content.tsx src/app/(app)/trip/[id]/trip-overview.tsx
git commit -m "feat: replace static trip overview with real-time dashboard widgets"
```

---

## Task 6: Reduce mobile bottom nav from 6 to 4 tabs

**Files:**

- Modify: `src/components/layout/mobile-nav.tsx`

**Step 1: Update tripNavigation array**

Replace the 6 trip nav items with 4:

```tsx
const tripNavigation: NavItem[] = [
  {
    name: 'Resumo',
    href: `/trip/${tripId}`,
    icon: Home,
    exact: true,
  },
  {
    name: 'Roteiro',
    href: `/trip/${tripId}/itinerary`,
    icon: Calendar,
  },
  {
    name: 'Finanças',
    href: `/trip/${tripId}/finances`,
    icon: Wallet,
  },
  {
    name: 'Mais',
    href: '#more', // Will be handled by onClick, not navigation
    icon: MoreHorizontal,
  },
];
```

**Step 2: Add "Mais" bottom sheet state and content**

Add state for the "Mais" sheet. When tapped, open a BottomSheet with links to: Grupo, Checklists, Notas, Exportar.

```tsx
// Import BottomSheet
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { MoreHorizontal, Users, CheckSquare, FileText, Download } from 'lucide-react';

// Add state
const [moreOpen, setMoreOpen] = useState(false);

// In the nav rendering, handle "Mais" differently:
// - If item.href === '#more', onClick opens the sheet instead of navigating
// - The sheet contains links to secondary pages
```

The "Mais" sheet items:

```tsx
const moreItems = [
  { name: 'Grupo', href: `/trip/${tripId}/participants`, icon: Users },
  { name: 'Checklists', href: `/trip/${tripId}/checklists`, icon: CheckSquare },
  { name: 'Notas', href: `/trip/${tripId}/notes`, icon: FileText },
  { name: 'Exportar', href: `/trip/${tripId}/expenses`, icon: Download }, // links to expenses page where export lives
];
```

**Step 3: Add isActive detection for "Finanças" tab**

The "Finanças" tab should be active when on `/expenses`, `/balance`, or `/budget`:

```tsx
const isFinancesActive = (pathname: string, tripId: string) => {
  return (
    pathname.startsWith(`/trip/${tripId}/expenses`) ||
    pathname.startsWith(`/trip/${tripId}/balance`) ||
    pathname.startsWith(`/trip/${tripId}/budget`) ||
    pathname.startsWith(`/trip/${tripId}/finances`)
  );
};
```

**Step 4: Verify build and test on mobile viewport**

Run: `npm run dev` → resize to mobile → verify 4 tabs appear, "Mais" opens bottom sheet with secondary links.

**Step 5: Commit**

```bash
git add src/components/layout/mobile-nav.tsx
git commit -m "feat: reduce mobile nav from 6 to 4 tabs with 'Mais' bottom sheet"
```

---

## Task 7: Create unified Finances page with segmented control

**Files:**

- Create: `src/app/(app)/trip/[id]/finances/page.tsx`
- Create: `src/app/(app)/trip/[id]/finances/finances-content.tsx`

**Step 1: Create the finances page (server component)**

```tsx
// src/app/(app)/trip/[id]/finances/page.tsx
import { FinancesContent } from './finances-content';

interface FinancesPageProps {
  params: Promise<{ id: string }>;
}

export default async function FinancesPage({ params }: FinancesPageProps) {
  const { id } = await params;
  return <FinancesContent tripId={id} />;
}
```

**Step 2: Create finances-content.tsx with segmented control**

This is a client component with a tab selector (Despesas | Balanço | Orçamento) that renders the corresponding content. It uses `useSearchParams` to persist the active tab.

The segmented control uses shadcn/ui `Tabs` component:

```tsx
// src/app/(app)/trip/[id]/finances/finances-content.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Scale, Wallet } from 'lucide-react';

// This component acts as a router — it renders a segmented control
// and navigates to the actual sub-page. Each sub-page already exists.
// Alternative: embed content inline. But reusing existing pages is DRYer.
```

**Implementation approach:** Since `/expenses`, `/balance`, and `/budget` pages already exist as full pages with their own data fetching, the simplest approach is to make the "Finanças" tab in mobile nav navigate to `/expenses` (default), and show the segmented control as a sticky header inside each of those 3 pages.

Create a shared `FinancesTabBar` component that renders in all 3 pages:

```tsx
// src/components/layout/finances-tab-bar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FinancesTabBarProps {
  tripId: string;
}

const tabs = [
  { label: 'Despesas', segment: 'expenses' },
  { label: 'Balanço', segment: 'balance' },
  { label: 'Orçamento', segment: 'budget' },
];

export function FinancesTabBar({ tripId }: FinancesTabBarProps) {
  const pathname = usePathname();

  return (
    <div className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const href = `/trip/${tripId}/${tab.segment}`;
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                'flex-1 py-2.5 text-center text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 3: Add FinancesTabBar to expenses, balance, and budget pages**

Add `<FinancesTabBar tripId={id} />` at the top of each page's content component. Only visible on mobile (`md:hidden`).

**Step 4: Update "Finanças" nav item to link to `/expenses` (default tab)**

In `mobile-nav.tsx`, the "Finanças" item links to `/trip/${tripId}/expenses`.

**Step 5: Verify the full flow**

Run: `npm run dev` → mobile viewport → tap "Finanças" → see segmented control with Despesas active → tap "Balanço" → navigate to balance page with tab bar still visible.

**Step 6: Commit**

```bash
git add src/components/layout/finances-tab-bar.tsx src/app/(app)/trip/[id]/expenses/ src/app/(app)/trip/[id]/balance/ src/app/(app)/trip/[id]/budget/
git commit -m "feat: add FinancesTabBar segmented control for mobile financial pages"
```

---

## Task 8: Create desktop sidebar for trip navigation

**Files:**

- Create: `src/components/layout/trip-sidebar.tsx`
- Modify: `src/app/(app)/layout.tsx` (add sidebar conditionally)

**Step 1: Create TripSidebar component**

```tsx
// src/components/layout/trip-sidebar.tsx
'use client';

import Link from 'next/link';
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
  Download,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    { name: 'Resumo', href: `/trip/${tripId}`, icon: Home, exact: true },
    { name: 'Roteiro', href: `/trip/${tripId}/itinerary`, icon: Calendar },
  ];

  const financeItems: SidebarItem[] = [
    { name: 'Despesas', href: `/trip/${tripId}/expenses`, icon: Receipt },
    { name: 'Balanço', href: `/trip/${tripId}/balance`, icon: Scale },
    { name: 'Orçamento', href: `/trip/${tripId}/budget`, icon: Wallet },
  ];

  const moreItems: SidebarItem[] = [
    { name: 'Grupo', href: `/trip/${tripId}/participants`, icon: Users },
    { name: 'Checklists', href: `/trip/${tripId}/checklists`, icon: CheckSquare },
    { name: 'Notas', href: `/trip/${tripId}/notes`, icon: FileText },
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
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
    <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:bg-sidebar">
      <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Navegação da viagem">
        {mainItems.map(renderItem)}

        <div className="my-2 border-t" />
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finanças
        </p>
        {financeItems.map(renderItem)}

        <div className="my-2 border-t" />
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mais
        </p>
        {moreItems.map(renderItem)}
      </nav>
    </aside>
  );
}
```

**Step 2: Integrate sidebar into the trip layout**

The sidebar needs to render only when viewing a trip. Two approaches:

- **Option A:** Create `src/app/(app)/trip/[id]/layout.tsx` that wraps children with sidebar
- **Option B:** Use the existing layout.tsx and detect trip context

Option A is cleaner. Create a trip-specific layout:

```tsx
// src/app/(app)/trip/[id]/layout.tsx
import { TripSidebar } from '@/components/layout/trip-sidebar';

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { id } = await params;

  return (
    <div className="flex flex-1">
      <TripSidebar tripId={id} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
```

**Step 3: Verify on desktop and mobile**

Run: `npm run dev`

- Desktop (1280px): Sidebar visible on left, content fills remaining space
- Mobile (375px): Sidebar hidden, bottom nav visible

**Step 4: Commit**

```bash
git add src/components/layout/trip-sidebar.tsx src/app/(app)/trip/[id]/layout.tsx
git commit -m "feat: add desktop trip sidebar with full navigation"
```

---

## Task 9: Add semantic color tokens to globals.css

**Files:**

- Modify: `src/app/globals.css`

**Step 1: Verify existing tokens**

Read `src/app/globals.css` — note that `--positive`, `--negative`, `--success`, `--warning` already exist. We just need to add `--color-budget-safe`, `--color-budget-warning`, `--color-budget-exceeded` and map them in the theme.

**Step 2: Add budget-specific tokens**

In the `@theme inline` block, add:

```css
--color-budget-safe: var(--success);
--color-budget-warning: var(--warning);
--color-budget-exceeded: var(--destructive);
```

These alias existing tokens, keeping the system DRY but making the intent clearer in component code.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add semantic budget color tokens to theme"
```

---

## Task 10: Integration testing and final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All existing tests pass (the pre-existing `db.test.ts` error is known — ignore it)

**Step 2: Run linter**

Run: `npm run lint`
Expected: No new lint errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual testing checklist**

- [ ] Mobile (375px): Bottom nav shows 4 tabs (Resumo, Roteiro, Finanças, Mais)
- [ ] Mobile: "Mais" opens bottom sheet with Grupo, Checklists, Notas links
- [ ] Mobile: "Finanças" → Expenses page with segmented tab bar (Despesas | Balanço | Orçamento)
- [ ] Mobile: Segmented tabs navigate correctly between financial pages
- [ ] Desktop (1280px): Sidebar visible with full navigation
- [ ] Desktop: Bottom nav hidden
- [ ] Dashboard: Shows real balance with correct color (positive/negative)
- [ ] Dashboard: Shows next upcoming activity or empty state
- [ ] Dashboard: Shows total expenses and count
- [ ] Dashboard: Shows trip progress (X/Y days)
- [ ] Dashboard: Shows budget usage (if budget exists)
- [ ] Dashboard: Quick action buttons (+ Activity, + Expense) work
- [ ] Light mode and dark mode: All tokens render correctly

**Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address integration issues from Phase 1 UX improvements"
```

---

## Phases 2-4 (Future Plans)

### Phase 2: Forms and Flows

- Task: Convert activity dialog to bottom sheet on mobile + quick mode (4 fields visible)
- Task: Simplify expense form to 2-step flow with AvatarSelector
- Task: Create trip creation wizard (3 steps)
- Task: Fix currency input formatting behavior

### Phase 3: Design System Components

- Task: Create AvatarSelector component (horizontal avatar toggle list)
- Task: Create SwipeAction component (swipe-to-reveal actions)
- Task: Improve empty states with contextual messages
- Task: Standardize MoneyDisplay usage across all financial components

### Phase 4: Microinteractions and Polish

- Task: Add contextual FAB (changes action per page)
- Task: Add swipe actions to expense list and settlements
- Task: Improve offline indicator (compact bar + pending badge)
- Task: Add optional cover images to trips
- Task: Add pull-to-refresh on lists
- Task: Respect prefers-reduced-motion

---

## Key Files Reference

| File                                        | Purpose                                      |
| ------------------------------------------- | -------------------------------------------- |
| `src/components/layout/mobile-nav.tsx`      | Bottom navigation (6→4 tabs)                 |
| `src/app/(app)/trip/[id]/trip-overview.tsx` | Trip overview → dashboard                    |
| `src/app/(app)/trip/[id]/page.tsx`          | Trip page server component                   |
| `src/app/(app)/trip/[id]/trip-content.tsx`  | Trip page client wrapper                     |
| `src/app/(app)/layout.tsx`                  | App shell layout                             |
| `src/app/globals.css`                       | Theme tokens                                 |
| `src/lib/utils/currency.ts`                 | `formatCurrency()` — reuse                   |
| `src/lib/balance/calculate-balance.ts`      | `calculateBalances()` — reuse                |
| `src/lib/supabase/expense-summary.ts`       | `getTripExpenseSummary()` — reuse            |
| `src/types/expense-summary.ts`              | `TripExpenseSummary` type — reuse            |
| `src/components/summary/trip-summary.tsx`   | Existing balance UI — reference for patterns |
