# Server-Side Pagination Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add server-side pagination to expenses, activities, and notes list views to prevent unbounded payloads.

**Architecture:** Create `*Paginated` server action variants returning `{ items, total, hasMore }`. Client components use "Carregar mais" (load more) pattern — appending pages to existing data. Balance/summary calculations remain unchanged (use full-fetch functions).

**Tech Stack:** Next.js Server Actions, Supabase `.range()`, React useState for page tracking

---

### Task 1: Paginated Server Actions

**Files:**

- Modify: `src/lib/supabase/expenses.ts` — add `getTripExpensesPaginated()`
- Modify: `src/lib/supabase/activities.ts` — add `getTripActivitiesPaginated()`
- Modify: `src/lib/supabase/notes.ts` — add `getTripNotesPaginated()`

**Step 1: Add paginated expense function**

```ts
// In expenses.ts — after getTripExpenses()
const EXPENSES_PAGE_SIZE = 30;

export async function getTripExpensesPaginated(
  tripId: string,
  page: number = 0,
  limit: number = EXPENSES_PAGE_SIZE
): Promise<{ items: ExpenseWithDetails[]; total: number; hasMore: boolean }> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) return { items: [], total: 0, hasMore: false };

  const from = page * limit;
  const to = from + limit - 1;

  const [countResult, dataResult] = await Promise.all([
    auth.supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId),
    auth.supabase
      .from('expenses')
      .select(`same nested select as getTripExpenses`)
      .eq('trip_id', tripId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
  ]);

  const total = countResult.count ?? 0;
  const items = (dataResult.data as ExpenseWithDetails[]) || [];

  return { items, total, hasMore: from + items.length < total };
}
```

**Step 2: Add paginated activities function** (same pattern, PAGE_SIZE = 50)

**Step 3: Add paginated notes function** (same pattern, PAGE_SIZE = 30)

**Step 4: Run `npx tsc --noEmit`**

**Step 5: Commit**

---

### Task 2: Update Page Components (SSR)

**Files:**

- Modify: `src/app/(app)/trip/[id]/expenses/page.tsx`
- Modify: `src/app/(app)/trip/[id]/itinerary/page.tsx`
- Modify: `src/app/(app)/trip/[id]/notes/page.tsx`

Switch from full-fetch to paginated (page 0) in SSR, pass `hasMore` and `total` to client.

---

### Task 3: Add Load More to Client Components

**Files:**

- Modify: `src/app/(app)/trip/[id]/expenses/expenses-list.tsx`
- Modify: `src/app/(app)/trip/[id]/itinerary/itinerary-list.tsx`
- Modify: `src/app/(app)/trip/[id]/notes/notes-list.tsx`

Pattern:

```tsx
const [items, setItems] = useState(initialItems);
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(initialHasMore);
const [loading, setLoading] = useState(false);

async function loadMore() {
  setLoading(true);
  const next = page + 1;
  const result = await getPaginatedAction(tripId, next);
  setItems((prev) => [...prev, ...result.items]);
  setHasMore(result.hasMore);
  setPage(next);
  setLoading(false);
}
```

Add "Carregar mais" button at bottom of list.

---

### Task 4: Tests + Commit

Run `npm test && npx tsc --noEmit && npm run lint`, commit, push.
