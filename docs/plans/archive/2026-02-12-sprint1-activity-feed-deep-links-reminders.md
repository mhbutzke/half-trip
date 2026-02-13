# Sprint 1: Activity Feed + Deep Links + Smart Reminders - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the three foundation features that create engagement loops: activity feed (visibility), deep links (virality), and smart pre-trip reminders (retention).

**Architecture:** Activity feed uses a new `trip_activity_log` table populated by existing server actions. Deep links use the Web Share API with contextual URLs. Smart reminders use a Supabase Edge Function (cron) + Resend email.

**Tech Stack:** Supabase (new table + Edge Function cron), Resend + @react-email, Web Share API, existing server action pattern, React components with shadcn/ui.

---

## Task 1: Activity Log - Database Migration

**Files:**

- Modify: `src/types/database.ts`

**Step 1: Apply Supabase migration for `trip_activity_log` table**

Use the Supabase MCP tool to apply this migration:

```sql
-- Create activity log table for trip timeline
CREATE TABLE public.trip_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast trip-scoped queries ordered by time
CREATE INDEX idx_trip_activity_log_trip_created
  ON public.trip_activity_log(trip_id, created_at DESC);

-- RLS policies
ALTER TABLE public.trip_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view activity log"
  ON public.trip_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_activity_log.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert activity log"
  ON public.trip_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_activity_log.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_activity_log;
```

Migration name: `add_trip_activity_log`

**Step 2: Add types to `src/types/database.ts`**

Add `trip_activity_log` table definition after the `settlements` table (after line 790), following the exact pattern of other tables. Also add convenience type aliases at the bottom.

```typescript
// In Tables section (after settlements):
trip_activity_log: {
  Row: {
    id: string;
    trip_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Json;
    created_at: string;
  };
  Insert: {
    id?: string;
    trip_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    metadata?: Json;
    created_at?: string;
  };
  Update: {
    id?: string;
    trip_id?: string;
    user_id?: string;
    action?: string;
    entity_type?: string;
    entity_id?: string | null;
    metadata?: Json;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'trip_activity_log_trip_id_fkey';
      columns: ['trip_id'];
      isOneToOne: false;
      referencedRelation: 'trips';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'trip_activity_log_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
};
```

Add after existing type aliases:

```typescript
export type TripActivityLog = Tables<'trip_activity_log'>;
export type InsertTripActivityLog = InsertTables<'trip_activity_log'>;
export type UpdateTripActivityLog = UpdateTables<'trip_activity_log'>;
```

**Step 3: Run lint to check types compile**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to trip_activity_log.

**Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(activity-log): add trip_activity_log table types"
```

---

## Task 2: Activity Log - Types & Server Action

**Files:**

- Create: `src/types/activity-log.ts`
- Create: `src/lib/supabase/activity-log.ts`

**Step 1: Write the activity log types**

Create `src/types/activity-log.ts`:

```typescript
import type { TripActivityLog } from './database';

export type ActivityLogAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'joined'
  | 'left'
  | 'completed'
  | 'marked_paid'
  | 'marked_unpaid';

export type ActivityLogEntityType =
  | 'expense'
  | 'activity'
  | 'note'
  | 'checklist'
  | 'checklist_item'
  | 'settlement'
  | 'participant'
  | 'trip';

export interface ActivityLogEntry extends TripActivityLog {
  users: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface LogActivityInput {
  tripId: string;
  action: ActivityLogAction;
  entityType: ActivityLogEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}
```

**Step 2: Write the server actions**

Create `src/lib/supabase/activity-log.ts`:

```typescript
'use server';

import { createClient } from './server';
import type { ActivityLogEntry, LogActivityInput } from '@/types/activity-log';

/**
 * Log an activity to the trip timeline.
 * Fire-and-forget: errors are silently swallowed to avoid
 * disrupting the parent operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('trip_activity_log').insert({
      trip_id: input.tripId,
      user_id: user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: (input.metadata as any) ?? {},
    });
  } catch {
    // Silently fail - logging should never break the main flow
  }
}

/**
 * Fetch paginated activity log for a trip.
 */
export async function getTripActivityLog(
  tripId: string,
  limit = 30,
  offset = 0
): Promise<{ entries: ActivityLogEntry[]; hasMore: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { entries: [], hasMore: false };

  // Check membership
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();
  if (!member) return { entries: [], hasMore: false };

  // Fetch one extra to know if there's more
  const { data } = await supabase
    .from('trip_activity_log')
    .select(
      `
      *,
      users!trip_activity_log_user_id_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);

  const entries = (data as ActivityLogEntry[]) || [];
  const hasMore = entries.length > limit;

  return {
    entries: hasMore ? entries.slice(0, limit) : entries,
    hasMore,
  };
}
```

**Step 3: Run type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/types/activity-log.ts src/lib/supabase/activity-log.ts
git commit -m "feat(activity-log): add types and server actions for trip timeline"
```

---

## Task 3: Activity Log - Instrument Existing Server Actions

**Files:**

- Modify: `src/lib/supabase/expenses.ts`
- Modify: `src/lib/supabase/activities.ts`
- Modify: `src/lib/supabase/settlements.ts`
- Modify: `src/lib/supabase/notes.ts`
- Modify: `src/lib/supabase/checklists.ts`

**Step 1: Add logging to expense actions**

In `src/lib/supabase/expenses.ts`, add import at top:

```typescript
import { logActivity } from './activity-log';
```

After each successful mutation (after the `revalidatePath` calls), add a `logActivity` call. Do NOT await it in the return path - call it fire-and-forget so it doesn't slow down the main operation.

For `createExpense`, after `revalidatePath` and before `return { success: true }`:

```typescript
logActivity({
  tripId: input.trip_id,
  action: 'created',
  entityType: 'expense',
  entityId: expense.id,
  metadata: { description: input.description, amount: input.amount, currency: input.currency },
});
```

For `updateExpense`, after revalidatePath:

```typescript
logActivity({
  tripId: existing.trip_id,
  action: 'updated',
  entityType: 'expense',
  entityId: expenseId,
  metadata: { description: input.description },
});
```

For `deleteExpense`, after revalidatePath:

```typescript
logActivity({
  tripId: existing.trip_id,
  action: 'deleted',
  entityType: 'expense',
  entityId: expenseId,
  metadata: { description: existing.description },
});
```

**Step 2: Add logging to activity actions**

Same pattern in `src/lib/supabase/activities.ts`:

- Import `logActivity`
- `createActivity`: `logActivity({ tripId: input.trip_id, action: 'created', entityType: 'activity', entityId: activity.id, metadata: { title: input.title } })`
- `updateActivity`: same with 'updated'
- `deleteActivity`: same with 'deleted', include title from existing record

**Step 3: Add logging to settlement actions**

In `src/lib/supabase/settlements.ts`:

- Import `logActivity`
- `createSettlement`: `logActivity({ tripId: input.trip_id, action: 'created', entityType: 'settlement', entityId: settlement.id, metadata: { amount: input.amount } })`
- `markSettlementAsPaid`: `logActivity({ tripId: existing.trip_id, action: 'marked_paid', entityType: 'settlement', entityId: settlementId })`
- `markSettlementAsUnpaid`: `logActivity({ tripId: existing.trip_id, action: 'marked_unpaid', entityType: 'settlement', entityId: settlementId })`

**Step 4: Add logging to notes and checklists**

In `src/lib/supabase/notes.ts`:

- `createNote`: log 'created' / 'note'
- `updateNote`: log 'updated' / 'note'
- `deleteNote`: log 'deleted' / 'note'

In `src/lib/supabase/checklists.ts`:

- `createChecklist`: log 'created' / 'checklist' with `{ name }`
- `toggleChecklistItem`: log 'completed' / 'checklist_item' with `{ title }`

**Step 5: Run tests and lint**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm test 2>&1 | tail -20`
Expected: All existing tests pass (logActivity is fire-and-forget, no mocking needed).

**Step 6: Commit**

```bash
git add src/lib/supabase/expenses.ts src/lib/supabase/activities.ts src/lib/supabase/settlements.ts src/lib/supabase/notes.ts src/lib/supabase/checklists.ts
git commit -m "feat(activity-log): instrument server actions to log timeline events"
```

---

## Task 4: Activity Log - UI Component

**Files:**

- Create: `src/components/activity-log/activity-log-feed.tsx`
- Create: `src/lib/utils/activity-log-labels.ts`

**Step 1: Create label utility**

Create `src/lib/utils/activity-log-labels.ts`:

```typescript
import type { ActivityLogAction, ActivityLogEntityType } from '@/types/activity-log';

const entityLabels: Record<ActivityLogEntityType, string> = {
  expense: 'despesa',
  activity: 'atividade',
  note: 'nota',
  checklist: 'checklist',
  checklist_item: 'item de checklist',
  settlement: 'acerto',
  participant: 'participante',
  trip: 'viagem',
};

const actionLabels: Record<ActivityLogAction, string> = {
  created: 'adicionou',
  updated: 'editou',
  deleted: 'removeu',
  joined: 'entrou na',
  left: 'saiu da',
  completed: 'completou',
  marked_paid: 'marcou como pago',
  marked_unpaid: 'desmarcou pagamento de',
};

export function getLogMessage(
  action: string,
  entityType: string,
  metadata?: Record<string, unknown>
): string {
  const actionLabel = actionLabels[action as ActivityLogAction] || action;
  const entityLabel = entityLabels[entityType as ActivityLogEntityType] || entityType;

  const detail =
    (metadata?.description as string) ||
    (metadata?.title as string) ||
    (metadata?.name as string) ||
    '';

  const detailSuffix = detail ? `: "${detail}"` : '';

  return `${actionLabel} ${entityLabel}${detailSuffix}`;
}

export function getLogIcon(entityType: string): string {
  const icons: Record<string, string> = {
    expense: 'DollarSign',
    activity: 'MapPin',
    note: 'StickyNote',
    checklist: 'CheckSquare',
    checklist_item: 'Check',
    settlement: 'ArrowLeftRight',
    participant: 'Users',
    trip: 'Plane',
  };
  return icons[entityType] || 'Activity';
}
```

**Step 2: Create the feed component**

Create `src/components/activity-log/activity-log-feed.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign,
  MapPin,
  StickyNote,
  CheckSquare,
  Check,
  ArrowLeftRight,
  Users,
  Plane,
  Activity,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTripActivityLog } from '@/lib/supabase/activity-log';
import { getLogMessage } from '@/lib/utils/activity-log-labels';
import type { ActivityLogEntry } from '@/types/activity-log';

const iconMap: Record<string, LucideIcon> = {
  expense: DollarSign,
  activity: MapPin,
  note: StickyNote,
  checklist: CheckSquare,
  checklist_item: Check,
  settlement: ArrowLeftRight,
  participant: Users,
  trip: Plane,
};

interface ActivityLogFeedProps {
  tripId: string;
  initialEntries: ActivityLogEntry[];
  initialHasMore: boolean;
}

export function ActivityLogFeed({
  tripId,
  initialEntries,
  initialHasMore,
}: ActivityLogFeedProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getTripActivityLog(tripId, 30, entries.length);
      setEntries((prev) => [...prev, ...result.entries]);
      setHasMore(result.hasMore);
    } finally {
      setIsLoading(false);
    }
  }, [tripId, entries.length]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
          <p>Nenhuma atividade recente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Atividade recente</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {entries.map((entry) => {
              const Icon = iconMap[entry.entity_type] || Activity;
              const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className="relative mt-0.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.users.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.users.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{entry.users.name.split(' ')[0]}</span>{' '}
                      <span className="text-muted-foreground">
                        {getLogMessage(entry.action, entry.entity_type, metadata)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {isLoading ? 'Carregando...' : 'Ver mais'}
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Run type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/activity-log/ src/lib/utils/activity-log-labels.ts
git commit -m "feat(activity-log): add feed component and label utilities"
```

---

## Task 5: Activity Log - Wire Into Trip Dashboard

**Files:**

- Modify: `src/app/(app)/trip/[id]/page.tsx` (the server page)
- Modify: the trip dashboard client component that renders on this page

**Step 1: Add activity log data fetch to the trip overview page**

In the trip overview server component (`src/app/(app)/trip/[id]/page.tsx`), add the import and fetch:

```typescript
import { getTripActivityLog } from '@/lib/supabase/activity-log';
```

Add to the `Promise.all` that already fetches trip data:

```typescript
const [trip, userRole, currentUser, dashboard, activityLog] = await Promise.all([
  getTripById(id),
  getUserRoleInTrip(id),
  getUserProfile(),
  getDashboardData(id),
  getTripActivityLog(id, 10),
]);
```

Pass `activityLog` to the client component:

```typescript
<TripContent
  {...existingProps}
  initialActivityLog={activityLog.entries}
  activityLogHasMore={activityLog.hasMore}
/>
```

**Step 2: Render ActivityLogFeed in the dashboard**

In the client content component, import and render the feed after the existing dashboard cards:

```typescript
import { ActivityLogFeed } from '@/components/activity-log/activity-log-feed';
```

Add below the existing summary/stat widgets:

```tsx
<ActivityLogFeed
  tripId={tripId}
  initialEntries={initialActivityLog}
  initialHasMore={activityLogHasMore}
/>
```

**Step 3: Add realtime subscription for activity log**

In `src/hooks/use-trip-realtime.ts`, add a subscription for the new table:

```typescript
useRealtimeSubscription({
  table: 'trip_activity_log',
  filter: `trip_id=eq.${tripId}`,
  onChange: () => {
    queryClient.invalidateQueries({ queryKey: ['activity-log', tripId] });
  },
});
```

**Step 4: Run the app and verify**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm run dev`
Navigate to a trip dashboard page. The feed should show (empty initially). Create an expense to see a log entry appear.

**Step 5: Commit**

```bash
git add src/app/(app)/trip/[id]/ src/hooks/use-trip-realtime.ts
git commit -m "feat(activity-log): wire feed into trip dashboard with realtime"
```

---

## Task 6: Deep Links - Share Button Component

**Files:**

- Create: `src/components/ui/share-button.tsx`

**Step 1: Create the share button component**

Create `src/components/ui/share-button.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareButtonProps {
  title: string;
  text: string;
  path: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function ShareButton({
  title,
  text,
  path,
  variant = 'ghost',
  size = 'icon',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getFullUrl = () => {
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  };

  const handleShare = async () => {
    const url = getFullUrl();

    // Try native Web Share API first (mobile-first)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // User cancelled or API failed - fall through to clipboard
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      aria-label={`Compartilhar: ${title}`}
      className={className}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      {size !== 'icon' && <span className="ml-2">{copied ? 'Copiado!' : 'Compartilhar'}</span>}
    </Button>
  );
}
```

**Step 2: Run type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/ui/share-button.tsx
git commit -m "feat(deep-links): add ShareButton component with Web Share API fallback"
```

---

## Task 7: Deep Links - Add Share to Expense Cards & Activity Items

**Files:**

- Modify: `src/components/expenses/expense-card.tsx` (or wherever individual expenses render)
- Modify: activity item component in the itinerary

**Step 1: Add share button to expense items**

Find the component that renders each expense in the list. Add the ShareButton alongside the existing action buttons (edit, delete):

```typescript
import { ShareButton } from '@/components/ui/share-button';
```

Add in the actions area of each expense card:

```tsx
<ShareButton
  title={expense.description}
  text={`${expense.description} - ${formatCurrency(expense.amount, expense.currency)}`}
  path={`/trip/${tripId}/expenses`}
  size="icon"
/>
```

**Step 2: Add share button to activity items**

Find the component that renders each itinerary activity. Add ShareButton similarly:

```tsx
<ShareButton
  title={activity.title}
  text={`${activity.title}${activity.location ? ` em ${activity.location}` : ''}`}
  path={`/trip/${tripId}/itinerary`}
  size="icon"
/>
```

**Step 3: Add share button to trip header/overview**

In the trip overview page, add a share button for the entire trip:

```tsx
<ShareButton
  title={`Viagem: ${trip.name}`}
  text={`${trip.name} - ${trip.destination}`}
  path={`/trip/${tripId}`}
  variant="outline"
  size="sm"
/>
```

**Step 4: Run the app and test sharing**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm run dev`
Test: Click share on an expense (on mobile should open native share sheet, on desktop should copy URL).

**Step 5: Commit**

```bash
git add src/components/expenses/ src/components/activities/ src/app/(app)/trip/
git commit -m "feat(deep-links): add share buttons to expenses, activities, and trip overview"
```

---

## Task 8: Smart Reminders - Email Template

**Files:**

- Create: `src/lib/email/trip-reminder-email.tsx`

**Step 1: Create the reminder email template**

Follow the exact pattern from `src/lib/email/invite-email.tsx` (same imports, same inline styles structure).

Create `src/lib/email/trip-reminder-email.tsx`:

```typescript
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface TripReminderEmailProps {
  userName: string;
  tripName: string;
  tripDestination: string;
  startDate: string;
  daysUntil: number;
  tripUrl: string;
  pendingItems: {
    incompleteChecklists: number;
    pendingSettlements: number;
    activitiesWithoutTime: number;
  };
  budgetSummary: {
    spent: number;
    total: number | null;
    currency: string;
  } | null;
}

export function TripReminderEmail({
  userName,
  tripName,
  tripDestination,
  startDate,
  daysUntil,
  tripUrl,
  pendingItems,
  budgetSummary,
}: TripReminderEmailProps) {
  const previewText = `${tripName} começa em ${daysUntil} dias! Veja o que preparar.`;

  const hasPending =
    pendingItems.incompleteChecklists > 0 ||
    pendingItems.pendingSettlements > 0 ||
    pendingItems.activitiesWithoutTime > 0;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logoText}>Half Trip</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>
              Faltam {daysUntil} dia{daysUntil !== 1 ? 's' : ''} para sua viagem!
            </Heading>

            <Text style={paragraph}>
              Oi, <strong>{userName}</strong>! Sua viagem está quase chegando:
            </Text>

            <Section style={tripCard}>
              <Heading as="h2" style={tripNameStyle}>
                {tripName}
              </Heading>
              <Text style={tripDetail}>
                <strong>Destino:</strong> {tripDestination}
              </Text>
              <Text style={tripDetail}>
                <strong>Início:</strong> {startDate}
              </Text>
            </Section>

            {hasPending && (
              <>
                <Heading as="h3" style={subheading}>
                  Itens pendentes
                </Heading>
                {pendingItems.incompleteChecklists > 0 && (
                  <Text style={listItem}>
                    ☐ {pendingItems.incompleteChecklists} ite{pendingItems.incompleteChecklists === 1 ? 'm' : 'ns'} de checklist incompleto{pendingItems.incompleteChecklists !== 1 ? 's' : ''}
                  </Text>
                )}
                {pendingItems.pendingSettlements > 0 && (
                  <Text style={listItem}>
                    💰 {pendingItems.pendingSettlements} acerto{pendingItems.pendingSettlements !== 1 ? 's' : ''} pendente{pendingItems.pendingSettlements !== 1 ? 's' : ''}
                  </Text>
                )}
                {pendingItems.activitiesWithoutTime > 0 && (
                  <Text style={listItem}>
                    🕐 {pendingItems.activitiesWithoutTime} atividade{pendingItems.activitiesWithoutTime !== 1 ? 's' : ''} sem horário definido
                  </Text>
                )}
              </>
            )}

            {budgetSummary?.total && (
              <>
                <Heading as="h3" style={subheading}>
                  Orçamento
                </Heading>
                <Text style={paragraph}>
                  Gasto até agora: <strong>{formatBrl(budgetSummary.spent, budgetSummary.currency)}</strong> de{' '}
                  <strong>{formatBrl(budgetSummary.total, budgetSummary.currency)}</strong>
                </Text>
              </>
            )}

            <Section style={buttonSection}>
              <Button style={button} href={tripUrl}>
                Ver viagem
              </Button>
            </Section>

            <Text style={footnote}>
              Bom planejamento e boa viagem!
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              <Link href="https://halftrip.com" style={link}>
                Half Trip
              </Link>{' '}
              - Planeje junto. Viaje melhor. Divida justo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function formatBrl(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

// Reuse exact same styles from invite-email.tsx
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const logoSection = { padding: '24px 40px' };

const logoText = {
  color: '#0d9488',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
};

const contentSection = { padding: '0 40px' };

const heading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const subheading = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '24px 0 8px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const listItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 8px',
  paddingLeft: '8px',
};

const tripCard = {
  backgroundColor: '#f0fdfa',
  borderRadius: '8px',
  border: '1px solid #99f6e4',
  padding: '20px',
  margin: '24px 0',
};

const tripNameStyle = {
  color: '#0f766e',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const tripDetail = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};

const buttonSection = { textAlign: 'center' as const, margin: '32px 0' };

const button = {
  backgroundColor: '#0d9488',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
  display: 'inline-block',
};

const footnote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '24px 0 0',
};

const hr = { borderColor: '#e5e7eb', margin: '32px 40px' };

const footer = { padding: '0 40px' };

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
};

const link = { color: '#0d9488', textDecoration: 'underline' };
```

**Step 2: Run type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/email/trip-reminder-email.tsx
git commit -m "feat(reminders): add pre-trip reminder email template"
```

---

## Task 9: Smart Reminders - Edge Function (Cron)

**Files:**

- Create: `supabase/functions/send-trip-reminders/index.ts`

**Step 1: Create the Edge Function**

Follow the exact same Deno pattern from `supabase/functions/fetch-flight-data/index.ts` (same `serve` import, same CORS headers, same error handling).

Create `supabase/functions/send-trip-reminders/index.ts`:

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

    // Find trips starting in exactly 3 days (72h window)
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 3);
    const dateStr = reminderDate.toISOString().split('T')[0];

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(
        `
        id, name, destination, start_date, end_date, base_currency,
        trip_members (
          user_id,
          users ( id, name, email )
        )
      `
      )
      .eq('start_date', dateStr)
      .is('archived_at', null);

    if (tripsError) throw tripsError;
    if (!trips || trips.length === 0) {
      return new Response(JSON.stringify({ message: 'No trips starting in 3 days', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;

    for (const trip of trips) {
      // Gather pending data per trip
      const [checklistResult, settlementResult, activitiesResult, budgetResult] = await Promise.all(
        [
          supabase
            .from('checklist_items')
            .select('id, trip_checklists!inner(trip_id)')
            .eq('trip_checklists.trip_id', trip.id)
            .eq('is_completed', false),
          supabase.from('settlements').select('id').eq('trip_id', trip.id).is('settled_at', null),
          supabase.from('activities').select('id').eq('trip_id', trip.id).is('start_time', null),
          supabase
            .from('trip_budgets')
            .select('amount')
            .eq('trip_id', trip.id)
            .eq('category', 'total')
            .single(),
        ]
      );

      let totalSpent = 0;
      if (budgetResult.data) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, exchange_rate')
          .eq('trip_id', trip.id);
        totalSpent = (expenses || []).reduce(
          (sum: number, e: any) => sum + e.amount * (e.exchange_rate || 1),
          0
        );
      }

      const pendingItems = {
        incompleteChecklists: checklistResult.data?.length || 0,
        pendingSettlements: settlementResult.data?.length || 0,
        activitiesWithoutTime: activitiesResult.data?.length || 0,
      };

      const budgetSummary = budgetResult.data
        ? { spent: totalSpent, total: budgetResult.data.amount, currency: trip.base_currency }
        : null;

      const formattedDate = new Date(trip.start_date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

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
              from: 'Half Trip <lembretes@halftrip.com>',
              to: user.email,
              subject: `${trip.name} começa em 3 dias!`,
              html: buildReminderHtml({
                userName: user.name,
                tripName: trip.name,
                tripDestination: trip.destination,
                startDate: formattedDate,
                daysUntil: 3,
                tripUrl: `${appUrl}/trip/${trip.id}`,
                pendingItems,
                budgetSummary,
              }),
            }),
          });
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${user.email}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount} reminders`, sent: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-trip-reminders:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Build a simple HTML email (Edge Functions can't use React Email directly).
 * Mirrors the TripReminderEmail React component's visual design.
 */
function buildReminderHtml(props: {
  userName: string;
  tripName: string;
  tripDestination: string;
  startDate: string;
  daysUntil: number;
  tripUrl: string;
  pendingItems: {
    incompleteChecklists: number;
    pendingSettlements: number;
    activitiesWithoutTime: number;
  };
  budgetSummary: { spent: number; total: number | null; currency: string } | null;
}): string {
  const {
    userName,
    tripName,
    tripDestination,
    startDate,
    tripUrl,
    pendingItems,
    budgetSummary,
    daysUntil,
  } = props;

  const pendingHtml: string[] = [];
  if (pendingItems.incompleteChecklists > 0)
    pendingHtml.push(
      `<p style="margin:0 0 8px;padding-left:8px;font-size:14px;color:#374151;">☐ ${pendingItems.incompleteChecklists} item(ns) de checklist incompleto(s)</p>`
    );
  if (pendingItems.pendingSettlements > 0)
    pendingHtml.push(
      `<p style="margin:0 0 8px;padding-left:8px;font-size:14px;color:#374151;">💰 ${pendingItems.pendingSettlements} acerto(s) pendente(s)</p>`
    );
  if (pendingItems.activitiesWithoutTime > 0)
    pendingHtml.push(
      `<p style="margin:0 0 8px;padding-left:8px;font-size:14px;color:#374151;">🕐 ${pendingItems.activitiesWithoutTime} atividade(s) sem horário</p>`
    );

  const pendingSection =
    pendingHtml.length > 0
      ? `<h3 style="color:#1f2937;font-size:16px;font-weight:600;margin:24px 0 8px;">Itens pendentes</h3>${pendingHtml.join('')}`
      : '';

  const formatCurrency = (v: number, c: string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c }).format(v);

  const budgetSection = budgetSummary?.total
    ? `<h3 style="color:#1f2937;font-size:16px;font-weight:600;margin:24px 0 8px;">Orçamento</h3>
       <p style="color:#374151;font-size:16px;margin:0 0 16px;">Gasto até agora: <strong>${formatCurrency(budgetSummary.spent, budgetSummary.currency)}</strong> de <strong>${formatCurrency(budgetSummary.total, budgetSummary.currency)}</strong></p>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
<div style="background-color:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px;">
  <div style="padding:24px 40px;"><h1 style="color:#0d9488;font-size:28px;font-weight:700;margin:0;text-align:center;">Half Trip</h1></div>
  <div style="padding:0 40px;">
    <h1 style="color:#1f2937;font-size:24px;font-weight:600;margin:0 0 24px;">Faltam ${daysUntil} dia${daysUntil !== 1 ? 's' : ''} para sua viagem!</h1>
    <p style="color:#374151;font-size:16px;margin:0 0 16px;">Oi, <strong>${userName}</strong>! Sua viagem está quase chegando:</p>
    <div style="background-color:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;padding:20px;margin:24px 0;">
      <h2 style="color:#0f766e;font-size:20px;font-weight:600;margin:0 0 12px;">${tripName}</h2>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Destino:</strong> ${tripDestination}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Início:</strong> ${startDate}</p>
    </div>
    ${pendingSection}
    ${budgetSection}
    <div style="text-align:center;margin:32px 0;">
      <a href="${tripUrl}" style="background-color:#0d9488;border-radius:6px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 24px;display:inline-block;">Ver viagem</a>
    </div>
    <p style="color:#6b7280;font-size:14px;margin:24px 0 0;">Bom planejamento e boa viagem!</p>
  </div>
  <hr style="border-color:#e5e7eb;margin:32px 40px;" />
  <div style="padding:0 40px;"><p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;"><a href="https://halftrip.com" style="color:#0d9488;text-decoration:underline;">Half Trip</a> - Planeje junto. Viaje melhor. Divida justo.</p></div>
</div>
</body></html>`;
}
```

**Step 2: Deploy the Edge Function**

Use the Supabase MCP `deploy_edge_function` tool to deploy:

- name: `send-trip-reminders`
- verify_jwt: `false` (will be called by cron, not users)
- files: the index.ts content above

**Step 3: Set up cron schedule**

In the Supabase Dashboard (or via SQL):

```sql
SELECT cron.schedule(
  'send-trip-reminders',
  '0 9 * * *',  -- Every day at 9:00 AM UTC
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.secrets WHERE name = 'supabase_url') || '/functions/v1/send-trip-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Note: The cron setup requires `pg_cron` and `pg_net` extensions enabled in Supabase. If not available, the Edge Function can be invoked manually or via Vercel cron.

**Step 4: Commit**

```bash
git add supabase/functions/send-trip-reminders/
git commit -m "feat(reminders): add Edge Function for pre-trip reminder emails"
```

---

## Task 10: Tests

**Files:**

- Create: `src/lib/utils/activity-log-labels.test.ts`

**Step 1: Write tests for activity log labels**

Create `src/lib/utils/activity-log-labels.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getLogMessage, getLogIcon } from './activity-log-labels';

describe('getLogMessage', () => {
  it('should format expense created message', () => {
    const msg = getLogMessage('created', 'expense', { description: 'Almoço' });
    expect(msg).toBe('adicionou despesa: "Almoço"');
  });

  it('should format activity deleted message', () => {
    const msg = getLogMessage('deleted', 'activity', { title: 'Tour guiado' });
    expect(msg).toBe('removeu atividade: "Tour guiado"');
  });

  it('should format settlement marked_paid without detail', () => {
    const msg = getLogMessage('marked_paid', 'settlement', {});
    expect(msg).toBe('marcou como pago acerto');
  });

  it('should format checklist completed message', () => {
    const msg = getLogMessage('completed', 'checklist_item', { title: 'Passaporte' });
    expect(msg).toBe('completou item de checklist: "Passaporte"');
  });

  it('should handle unknown action/entity gracefully', () => {
    const msg = getLogMessage('unknown_action', 'unknown_entity', {});
    expect(msg).toBe('unknown_action unknown_entity');
  });
});

describe('getLogIcon', () => {
  it('should return correct icon names', () => {
    expect(getLogIcon('expense')).toBe('DollarSign');
    expect(getLogIcon('activity')).toBe('MapPin');
    expect(getLogIcon('note')).toBe('StickyNote');
    expect(getLogIcon('settlement')).toBe('ArrowLeftRight');
  });

  it('should return fallback for unknown entity', () => {
    expect(getLogIcon('unknown')).toBe('Activity');
  });
});
```

**Step 2: Run the test**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx vitest run src/lib/utils/activity-log-labels.test.ts`
Expected: All tests pass.

**Step 3: Run full test suite**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm test`
Expected: All tests pass (including pre-existing ones).

**Step 4: Commit**

```bash
git add src/lib/utils/activity-log-labels.test.ts
git commit -m "test(activity-log): add unit tests for log label utilities"
```

---

## Task 11: Final Lint & Verify

**Step 1: Run full lint + type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm run lint && npx tsc --noEmit --pretty`
Expected: No errors.

**Step 2: Run all tests**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm test`
Expected: All tests pass.

**Step 3: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "chore: lint fixes for Sprint 1 features"
```

---

## Verification Checklist

- [ ] `trip_activity_log` table exists in Supabase with RLS policies
- [ ] Types added to `database.ts` and compile cleanly
- [ ] `logActivity()` calls are fire-and-forget in 5 server action files
- [ ] ActivityLogFeed renders on trip dashboard with entries
- [ ] Realtime subscription invalidates activity log cache
- [ ] ShareButton works on mobile (Web Share API) and desktop (clipboard copy)
- [ ] Share buttons visible on expenses, activities, and trip overview
- [ ] `TripReminderEmail` template renders correctly
- [ ] `send-trip-reminders` Edge Function is deployed
- [ ] All existing tests still pass
- [ ] No TypeScript or lint errors
