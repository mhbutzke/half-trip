# Sprint 3: Trip Recap + Travel Badges + Daily Summary - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the retention layer: auto-generated Trip Recap (shareable post-trip summary, like Spotify Wrapped), Travel Badges (lightweight gamification), and Daily Summary push notification (engagement during the trip).

**Architecture:** Trip Recap generates a shareable HTML card (rendered to image via `html2canvas`) from aggregated trip data. Badges are computed client-side from existing data (no new tables). Daily Summary is a Supabase Edge Function cron that sends summary emails.

**Tech Stack:** `html2canvas` for Trip Recap image generation, Supabase Edge Functions (cron), existing Resend email, computed badges from existing data.

---

## Task 1: Trip Recap - Data Aggregation

**Files:**

- Create: `src/lib/utils/trip-recap.ts`
- Create: `src/lib/utils/trip-recap.test.ts`

**Step 1: Write the failing test**

Create `src/lib/utils/trip-recap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeTripRecap, type TripRecapData } from './trip-recap';

const mockInput = {
  trip: {
    name: 'Lisboa 2026',
    destination: 'Lisboa',
    startDate: '2026-01-10',
    endDate: '2026-01-17',
    baseCurrency: 'BRL',
  },
  expenses: [
    { amount: 200, category: 'food', paidByName: 'Alice', exchangeRate: 1 },
    { amount: 150, category: 'food', paidByName: 'Bob', exchangeRate: 1 },
    { amount: 500, category: 'accommodation', paidByName: 'Alice', exchangeRate: 1 },
    { amount: 100, category: 'transport', paidByName: 'Carol', exchangeRate: 1 },
    { amount: 80, category: 'tickets', paidByName: 'Bob', exchangeRate: 1 },
  ],
  participants: [
    { name: 'Alice', avatar: null },
    { name: 'Bob', avatar: null },
    { name: 'Carol', avatar: null },
  ],
  activitiesCount: 12,
  checklistCompletionPercent: 85,
};

describe('computeTripRecap', () => {
  it('should compute total spent', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.totalSpent).toBe(1030);
  });

  it('should compute duration in days', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.durationDays).toBe(7);
  });

  it('should find top category', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.topCategory).toBe('food');
    expect(recap.topCategoryAmount).toBe(350);
  });

  it('should find biggest spender', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.biggestSpender).toBe('Alice');
    expect(recap.biggestSpenderAmount).toBe(700);
  });

  it('should compute average per day', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.averagePerDay).toBeCloseTo(147.14, 1);
  });

  it('should compute average per person', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.averagePerPerson).toBeCloseTo(343.33, 1);
  });

  it('should include participant count', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.participantCount).toBe(3);
  });

  it('should return expense count', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.expenseCount).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx vitest run src/lib/utils/trip-recap.test.ts`
Expected: FAIL.

**Step 3: Write the implementation**

Create `src/lib/utils/trip-recap.ts`:

```typescript
export interface TripRecapInput {
  trip: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    baseCurrency: string;
  };
  expenses: Array<{
    amount: number;
    category: string;
    paidByName: string;
    exchangeRate: number;
  }>;
  participants: Array<{
    name: string;
    avatar: string | null;
  }>;
  activitiesCount: number;
  checklistCompletionPercent: number;
}

export interface TripRecapData {
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  durationDays: number;
  participantCount: number;
  totalSpent: number;
  expenseCount: number;
  averagePerDay: number;
  averagePerPerson: number;
  topCategory: string;
  topCategoryAmount: number;
  biggestSpender: string;
  biggestSpenderAmount: number;
  activitiesCount: number;
  checklistCompletionPercent: number;
  categoryBreakdown: Array<{ category: string; amount: number; percent: number }>;
}

const categoryLabels: Record<string, string> = {
  accommodation: 'Hospedagem',
  food: 'Alimentação',
  transport: 'Transporte',
  tickets: 'Ingressos',
  shopping: 'Compras',
  other: 'Outros',
};

export function computeTripRecap(input: TripRecapInput): TripRecapData {
  const { trip, expenses, participants, activitiesCount, checklistCompletionPercent } = input;

  // Duration
  const start = new Date(trip.startDate + 'T00:00:00');
  const end = new Date(trip.endDate + 'T00:00:00');
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

  // Total
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0);

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const converted = e.amount * (e.exchangeRate || 1);
    byCategory[e.category] = (byCategory[e.category] || 0) + converted;
  }

  const categoryBreakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percent: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryBreakdown[0]?.category || 'other';
  const topCategoryAmount = categoryBreakdown[0]?.amount || 0;

  // Biggest spender
  const byPerson: Record<string, number> = {};
  for (const e of expenses) {
    const converted = e.amount * (e.exchangeRate || 1);
    byPerson[e.paidByName] = (byPerson[e.paidByName] || 0) + converted;
  }

  const sortedSpenders = Object.entries(byPerson).sort(([, a], [, b]) => b - a);
  const biggestSpender = sortedSpenders[0]?.[0] || '';
  const biggestSpenderAmount = sortedSpenders[0]?.[1] || 0;

  return {
    tripName: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    baseCurrency: trip.baseCurrency,
    durationDays,
    participantCount: participants.length,
    totalSpent,
    expenseCount: expenses.length,
    averagePerDay: totalSpent / durationDays,
    averagePerPerson: participants.length > 0 ? totalSpent / participants.length : 0,
    topCategory,
    topCategoryAmount,
    biggestSpender,
    biggestSpenderAmount,
    activitiesCount,
    checklistCompletionPercent,
    categoryBreakdown,
  };
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx vitest run src/lib/utils/trip-recap.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/lib/utils/trip-recap.ts src/lib/utils/trip-recap.test.ts
git commit -m "feat(recap): add trip recap data aggregation with tests"
```

---

## Task 2: Trip Recap - Visual Card Component

**Files:**

- Create: `src/components/recap/trip-recap-card.tsx`

**Step 1: Install html2canvas**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm install html2canvas`

**Step 2: Create the recap card**

Create `src/components/recap/trip-recap-card.tsx`:

```typescript
'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { getCategoryLabel, type TripRecapData } from '@/lib/utils/trip-recap';

interface TripRecapCardProps {
  recap: TripRecapData;
}

export function TripRecapCard({ recap }: TripRecapCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const formattedStart = new Date(recap.startDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  const formattedEnd = new Date(recap.endDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const exportImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      // Try native share with file (mobile)
      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `recap-${recap.tripName}.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: `Trip Recap: ${recap.tripName}`,
              files: [file],
            });
          } catch {
            downloadCanvas(canvas);
          }
        }, 'image/png');
      } else {
        downloadCanvas(canvas);
      }
    } catch {
      toast.error('Erro ao exportar imagem');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `recap-${recap.tripName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Imagem salva!');
  };

  return (
    <div className="space-y-4">
      {/* The renderable card */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #065f46 50%, #1e3a5f 100%)',
          padding: '32px',
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          width: '360px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Trip Recap
          </p>
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }}>
            {recap.tripName}
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>
            {recap.destination} • {formattedStart} - {formattedEnd}
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <StatBlock label="Total gasto" value={formatCurrency(recap.totalSpent, recap.baseCurrency)} />
          <StatBlock label="Dias" value={String(recap.durationDays)} />
          <StatBlock label="Participantes" value={String(recap.participantCount)} />
          <StatBlock label="Despesas" value={String(recap.expenseCount)} />
          <StatBlock label="Por dia" value={formatCurrency(recap.averagePerDay, recap.baseCurrency)} />
          <StatBlock label="Por pessoa" value={formatCurrency(recap.averagePerPerson, recap.baseCurrency)} />
        </div>

        {/* Highlights */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Destaques</p>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>
            Maior gasto: <strong>{getCategoryLabel(recap.topCategory)}</strong> ({formatCurrency(recap.topCategoryAmount, recap.baseCurrency)})
          </p>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>
            Quem mais pagou: <strong>{recap.biggestSpender}</strong> ({formatCurrency(recap.biggestSpenderAmount, recap.baseCurrency)})
          </p>
          {recap.activitiesCount > 0 && (
            <p style={{ fontSize: '14px' }}>
              {recap.activitiesCount} atividade{recap.activitiesCount !== 1 ? 's' : ''} no roteiro
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '11px' }}>
          halftrip.com
        </div>
      </div>

      {/* Export actions */}
      <div className="flex gap-2">
        <Button onClick={exportImage} disabled={isExporting} className="flex-1">
          {isExporting ? (
            'Exportando...'
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Compartilhar Recap
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/recap/ package.json package-lock.json
git commit -m "feat(recap): add visual Trip Recap card with image export"
```

---

## Task 3: Trip Recap - Server Action & Trip Page Integration

**Files:**

- Create: `src/lib/supabase/trip-recap-data.ts`
- Modify: `src/app/(app)/trip/[id]/page.tsx` (or dashboard)

**Step 1: Create server action to fetch recap data**

Create `src/lib/supabase/trip-recap-data.ts`:

```typescript
'use server';

import { createClient } from './server';
import { computeTripRecap, type TripRecapInput, type TripRecapData } from '@/lib/utils/trip-recap';

export async function getTripRecapData(tripId: string): Promise<TripRecapData | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();
  if (!member) return null;

  // Fetch all needed data in parallel
  const [tripResult, expensesResult, membersResult, activitiesResult, checklistResult] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase
        .from('expenses')
        .select('amount, category, exchange_rate, paid_by, users!expenses_paid_by_fkey(name)')
        .eq('trip_id', tripId),
      supabase
        .from('trip_members')
        .select('users!trip_members_user_id_fkey(name, avatar_url)')
        .eq('trip_id', tripId),
      supabase.from('activities').select('id').eq('trip_id', tripId),
      supabase
        .from('checklist_items')
        .select('is_completed, trip_checklists!inner(trip_id)')
        .eq('trip_checklists.trip_id', tripId),
    ]);

  const trip = tripResult.data;
  if (!trip) return null;

  const expenses = (expensesResult.data || []).map((e: any) => ({
    amount: e.amount,
    category: e.category,
    paidByName: e.users?.name || 'Desconhecido',
    exchangeRate: e.exchange_rate || 1,
  }));

  const participants = (membersResult.data || []).map((m: any) => ({
    name: m.users?.name || 'Desconhecido',
    avatar: m.users?.avatar_url || null,
  }));

  const checklistItems = checklistResult.data || [];
  const completedItems = checklistItems.filter((i: any) => i.is_completed).length;
  const checklistCompletionPercent =
    checklistItems.length > 0 ? Math.round((completedItems / checklistItems.length) * 100) : 100;

  const input: TripRecapInput = {
    trip: {
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      baseCurrency: trip.base_currency,
    },
    expenses,
    participants,
    activitiesCount: activitiesResult.data?.length || 0,
    checklistCompletionPercent,
  };

  return computeTripRecap(input);
}
```

**Step 2: Show recap on trip dashboard when trip has ended**

In the trip overview client component, conditionally show the recap card when the trip end date is in the past:

```typescript
import { TripRecapCard } from '@/components/recap/trip-recap-card';

// Check if trip has ended
const tripEnded = new Date(trip.end_date) < new Date();

// If trip ended and recap data is available:
{tripEnded && recapData && (
  <div className="space-y-3">
    <h2 className="text-base font-semibold">Trip Recap</h2>
    <TripRecapCard recap={recapData} />
  </div>
)}
```

Fetch recap data in the server component only if the trip has ended (to avoid unnecessary computation):

```typescript
const tripEnded = new Date(trip.end_date) < new Date();
const recapData = tripEnded ? await getTripRecapData(id) : null;
```

**Step 3: Commit**

```bash
git add src/lib/supabase/trip-recap-data.ts src/app/(app)/trip/
git commit -m "feat(recap): show Trip Recap card on dashboard after trip ends"
```

---

## Task 4: Travel Badges - Computation Logic

**Files:**

- Create: `src/lib/utils/travel-badges.ts`
- Create: `src/lib/utils/travel-badges.test.ts`

**Step 1: Write the failing test**

Create `src/lib/utils/travel-badges.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeBadges, type BadgeInput } from './travel-badges';

describe('computeBadges', () => {
  const baseInput: BadgeInput = {
    tripCount: 1,
    totalExpenses: 5,
    hasReceipt: true,
    budgetKept: true,
    checklistComplete: true,
    participantCount: 4,
    activitiesCount: 10,
    daysCount: 7,
  };

  it('should award "Primeira Viagem" for first trip', () => {
    const badges = computeBadges({ ...baseInput, tripCount: 1 });
    expect(badges.some((b) => b.id === 'first_trip')).toBe(true);
  });

  it('should award "Budget Master" when budget kept', () => {
    const badges = computeBadges({ ...baseInput, budgetKept: true });
    expect(badges.some((b) => b.id === 'budget_master')).toBe(true);
  });

  it('should NOT award "Budget Master" when budget exceeded', () => {
    const badges = computeBadges({ ...baseInput, budgetKept: false });
    expect(badges.some((b) => b.id === 'budget_master')).toBe(false);
  });

  it('should award "Organizador" for 10+ activities', () => {
    const badges = computeBadges({ ...baseInput, activitiesCount: 10 });
    expect(badges.some((b) => b.id === 'planner')).toBe(true);
  });

  it('should award "Turma Grande" for 5+ participants', () => {
    const badges = computeBadges({ ...baseInput, participantCount: 5 });
    expect(badges.some((b) => b.id === 'big_group')).toBe(true);
  });

  it('should award "Checklist Completo" when 100% complete', () => {
    const badges = computeBadges({ ...baseInput, checklistComplete: true });
    expect(badges.some((b) => b.id === 'checklist_done')).toBe(true);
  });

  it('should award "Viajante Frequente" for 5+ trips', () => {
    const badges = computeBadges({ ...baseInput, tripCount: 5 });
    expect(badges.some((b) => b.id === 'frequent_traveler')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx vitest run src/lib/utils/travel-badges.test.ts`
Expected: FAIL.

**Step 3: Write the implementation**

Create `src/lib/utils/travel-badges.ts`:

```typescript
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface BadgeInput {
  tripCount: number;
  totalExpenses: number;
  hasReceipt: boolean;
  budgetKept: boolean;
  checklistComplete: boolean;
  participantCount: number;
  activitiesCount: number;
  daysCount: number;
}

const BADGE_DEFINITIONS: Array<{
  badge: Badge;
  condition: (input: BadgeInput) => boolean;
}> = [
  {
    badge: {
      id: 'first_trip',
      name: 'Primeira Viagem',
      description: 'Completou sua primeira viagem no Half Trip',
      emoji: '🎉',
    },
    condition: (i) => i.tripCount >= 1,
  },
  {
    badge: {
      id: 'budget_master',
      name: 'Budget Master',
      description: 'Não estourou o orçamento da viagem',
      emoji: '💰',
    },
    condition: (i) => i.budgetKept,
  },
  {
    badge: {
      id: 'receipt_collector',
      name: 'Coletor de Recibos',
      description: 'Anexou pelo menos um comprovante',
      emoji: '🧾',
    },
    condition: (i) => i.hasReceipt,
  },
  {
    badge: {
      id: 'planner',
      name: 'Organizador',
      description: 'Planejou 10 ou mais atividades',
      emoji: '📋',
    },
    condition: (i) => i.activitiesCount >= 10,
  },
  {
    badge: {
      id: 'big_group',
      name: 'Turma Grande',
      description: 'Viajou com 5 ou mais pessoas',
      emoji: '👥',
    },
    condition: (i) => i.participantCount >= 5,
  },
  {
    badge: {
      id: 'checklist_done',
      name: 'Checklist Completo',
      description: 'Completou 100% dos itens de checklist',
      emoji: '✅',
    },
    condition: (i) => i.checklistComplete,
  },
  {
    badge: {
      id: 'frequent_traveler',
      name: 'Viajante Frequente',
      description: 'Completou 5 ou mais viagens',
      emoji: '✈️',
    },
    condition: (i) => i.tripCount >= 5,
  },
  {
    badge: {
      id: 'long_trip',
      name: 'Maratonista',
      description: 'Viagem de 10 dias ou mais',
      emoji: '🏃',
    },
    condition: (i) => i.daysCount >= 10,
  },
  {
    badge: {
      id: 'expense_tracker',
      name: 'Contador',
      description: 'Registrou 20 ou mais despesas',
      emoji: '🔢',
    },
    condition: (i) => i.totalExpenses >= 20,
  },
];

export function computeBadges(input: BadgeInput): Badge[] {
  return BADGE_DEFINITIONS.filter(({ condition }) => condition(input)).map(({ badge }) => badge);
}

export function getAllBadges(): Badge[] {
  return BADGE_DEFINITIONS.map(({ badge }) => badge);
}
```

**Step 4: Run tests**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx vitest run src/lib/utils/travel-badges.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/lib/utils/travel-badges.ts src/lib/utils/travel-badges.test.ts
git commit -m "feat(badges): add travel badge computation logic with tests"
```

---

## Task 5: Travel Badges - UI Component

**Files:**

- Create: `src/components/badges/badge-display.tsx`

**Step 1: Create the badge display component**

Create `src/components/badges/badge-display.tsx`:

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Badge } from '@/lib/utils/travel-badges';

interface BadgeDisplayProps {
  earned: Badge[];
  className?: string;
}

export function BadgeDisplay({ earned, className }: BadgeDisplayProps) {
  if (earned.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conquistas</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
            {earned.map((badge) => (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                    aria-label={`${badge.name}: ${badge.description}`}
                  >
                    <span className="text-base" aria-hidden="true">
                      {badge.emoji}
                    </span>
                    <span className="font-medium">{badge.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{badge.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Wire badges into the Trip Recap section**

In the trip overview page, compute badges from the recap data and display them alongside the recap card:

```typescript
import { computeBadges, type BadgeInput } from '@/lib/utils/travel-badges';
import { BadgeDisplay } from '@/components/badges/badge-display';

// Compute badges from available data (in the client component):
const badgeInput: BadgeInput = {
  tripCount: 1, // Would need user's total trip count from props
  totalExpenses: recapData?.expenseCount || 0,
  hasReceipt: false, // Would check from expenses
  budgetKept: budgetData?.status !== 'exceeded',
  checklistComplete: recapData?.checklistCompletionPercent === 100,
  participantCount: recapData?.participantCount || 0,
  activitiesCount: recapData?.activitiesCount || 0,
  daysCount: recapData?.durationDays || 0,
};

const earnedBadges = computeBadges(badgeInput);

// Render:
<BadgeDisplay earned={earnedBadges} />
```

**Step 3: Commit**

```bash
git add src/components/badges/
git commit -m "feat(badges): add badge display component with tooltips"
```

---

## Task 6: Daily Summary - Edge Function (Cron)

**Files:**

- Create: `supabase/functions/send-daily-summary/index.ts`

**Step 1: Create the Edge Function**

Create `supabase/functions/send-daily-summary/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'https://halftrip.com';

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    // Find active trips (today is between start_date and end_date)
    const { data: trips } = await supabase
      .from('trips')
      .select(
        `
        id, name, destination, base_currency, start_date, end_date,
        trip_members ( user_id, users ( id, name, email ) )
      `
      )
      .lte('start_date', today)
      .gte('end_date', today)
      .is('archived_at', null);

    if (!trips || trips.length === 0) {
      return new Response(JSON.stringify({ message: 'No active trips', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    const formatCurrency = (v: number, c: string) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c }).format(v);

    for (const trip of trips) {
      // Get today's expenses
      const { data: todayExpenses } = await supabase
        .from('expenses')
        .select('amount, exchange_rate, description, paid_by, users!expenses_paid_by_fkey(name)')
        .eq('trip_id', trip.id)
        .eq('date', today);

      // Get tomorrow's activities
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data: tomorrowActivities } = await supabase
        .from('activities')
        .select('title, start_time, location')
        .eq('trip_id', trip.id)
        .eq('date', tomorrowStr)
        .order('start_time', { ascending: true });

      const todayTotal = (todayExpenses || []).reduce(
        (sum: number, e: any) => sum + e.amount * (e.exchange_rate || 1),
        0
      );

      // Only send if there's something to report
      if ((todayExpenses || []).length === 0 && (tomorrowActivities || []).length === 0) continue;

      // Build email HTML
      const expenseLines = (todayExpenses || [])
        .map(
          (e: any) =>
            `<li>${e.description} - ${formatCurrency(e.amount * (e.exchange_rate || 1), trip.base_currency)} (${(e as any).users?.name || 'N/A'})</li>`
        )
        .join('');

      const activityLines = (tomorrowActivities || [])
        .map(
          (a: any) =>
            `<li>${a.start_time ? a.start_time.slice(0, 5) + ' - ' : ''}${a.title}${a.location ? ' (' + a.location + ')' : ''}</li>`
        )
        .join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="background-color:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px;">
  <div style="padding:24px 40px;"><h1 style="color:#0d9488;font-size:28px;font-weight:700;margin:0;text-align:center;">Half Trip</h1></div>
  <div style="padding:0 40px;">
    <h1 style="color:#1f2937;font-size:22px;margin:0 0 16px;">Resumo do dia - ${trip.name}</h1>

    ${
      (todayExpenses || []).length > 0
        ? `
    <h3 style="color:#1f2937;font-size:16px;margin:20px 0 8px;">Gastos de hoje</h3>
    <ul style="color:#374151;font-size:14px;padding-left:20px;">${expenseLines}</ul>
    <p style="color:#0d9488;font-size:16px;font-weight:600;">Total: ${formatCurrency(todayTotal, trip.base_currency)}</p>
    `
        : ''
    }

    ${
      (tomorrowActivities || []).length > 0
        ? `
    <h3 style="color:#1f2937;font-size:16px;margin:20px 0 8px;">Atividades de amanhã</h3>
    <ul style="color:#374151;font-size:14px;padding-left:20px;">${activityLines}</ul>
    `
        : ''
    }

    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/trip/${trip.id}" style="background-color:#0d9488;border-radius:6px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 24px;display:inline-block;">Ver viagem</a>
    </div>
  </div>
  <hr style="border-color:#e5e7eb;margin:32px 40px;" />
  <div style="padding:0 40px;"><p style="color:#9ca3af;font-size:12px;text-align:center;">halftrip.com</p></div>
</div></body></html>`;

      // Send to each member
      for (const member of trip.trip_members || []) {
        const user = (member as any).users;
        if (!user?.email) continue;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Half Trip <resumo@halftrip.com>',
              to: user.email,
              subject: `Resumo do dia - ${trip.name}`,
              html,
            }),
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to ${user.email}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount} daily summaries`, sent: sentCount }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

**Step 2: Deploy the Edge Function**

Use Supabase MCP `deploy_edge_function`:

- name: `send-daily-summary`
- verify_jwt: `false`
- files: the index.ts above

**Step 3: Set up cron (22:00 UTC daily)**

```sql
SELECT cron.schedule(
  'send-daily-summary',
  '0 22 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.secrets WHERE name = 'supabase_url') || '/functions/v1/send-daily-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Step 4: Commit**

```bash
git add supabase/functions/send-daily-summary/
git commit -m "feat(daily-summary): add Edge Function for daily trip summary emails"
```

---

## Task 7: Final Tests & Verification

**Step 1: Run full test suite**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm test`
Expected: All tests pass.

**Step 2: Run lint + type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm run lint && npx tsc --noEmit --pretty`
Expected: No errors.

**Step 3: Manual verification**

1. Open a trip that has ended -> Trip Recap card should show
2. Click "Compartilhar Recap" -> should generate PNG image
3. Badges section shows earned badges with tooltips
4. Create a trip with today as start date, add expenses -> Daily summary Edge Function should pick it up

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: lint fixes for Sprint 3 features"
```

---

## Verification Checklist

- [ ] `computeTripRecap` tests pass (total, categories, averages)
- [ ] TripRecapCard renders with gradient background and stats
- [ ] Image export works (html2canvas -> PNG download or native share)
- [ ] Recap only shows for trips where `end_date < now`
- [ ] `computeBadges` tests pass (all badge conditions)
- [ ] BadgeDisplay renders earned badges with emoji + tooltip
- [ ] `send-daily-summary` Edge Function deployed
- [ ] Daily summary only sends for active trips (start <= today <= end)
- [ ] Email includes today's expenses and tomorrow's activities
- [ ] All existing tests still pass
- [ ] No TypeScript or lint errors
