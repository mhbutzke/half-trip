# Half Trip - Technical Specification

## 1. Technical Context

### 1.1 Project Type
Progressive Web Application (PWA) with real-time collaboration and offline-first capabilities.

### 1.2 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend Framework** | Next.js 14 (App Router) | SSR/SSG, excellent PWA support, TypeScript-first, great DX |
| **Language** | TypeScript | Type safety, better maintainability, IDE support |
| **UI Library** | React 18 | Component-based, large ecosystem, concurrent features |
| **Styling** | Tailwind CSS | Utility-first, mobile-first design system, small bundle |
| **UI Components** | shadcn/ui | Accessible, customizable, copy-paste components |
| **State Management** | Zustand + React Query | Lightweight client state + server state caching |
| **Backend** | Supabase | PostgreSQL + Auth + Realtime + Storage, all-in-one |
| **Database** | PostgreSQL (via Supabase) | ACID compliance, JSON support, row-level security |
| **Real-time** | Supabase Realtime | WebSocket-based, presence, broadcast, postgres changes |
| **Offline Storage** | IndexedDB (via Dexie.js) | Structured client-side storage for offline sync |
| **PWA** | next-pwa | Service worker generation, caching strategies |
| **Validation** | Zod | Runtime type validation, TypeScript inference |
| **Forms** | React Hook Form | Performant forms, minimal re-renders |
| **Icons** | Lucide React | Consistent, lightweight icon set |
| **Date Handling** | date-fns | Modular, tree-shakeable date utilities |
| **Testing** | Vitest + Testing Library | Fast unit tests, React component testing |
| **E2E Testing** | Playwright | Cross-browser testing, mobile emulation |

### 1.3 Development Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (fast, disk-efficient) |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |
| **TypeScript** | Static type checking |

### 1.4 Deployment & Infrastructure

| Service | Purpose |
|---------|---------|
| **Vercel** | Frontend hosting, edge functions, CI/CD |
| **Supabase** | Backend-as-a-Service (database, auth, realtime, storage) |
| **Resend** | Transactional emails (invites, password reset) |

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (PWA)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Next.js   │  │   Zustand   │  │  IndexedDB  │             │
│  │  App Router │  │    Store    │  │   (Dexie)   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│              ┌───────────┴───────────┐                         │
│              │    Sync Engine        │                         │
│              │  (Online/Offline)     │                         │
│              └───────────┬───────────┘                         │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ HTTPS / WebSocket
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                          │                                      │
│              ┌───────────┴───────────┐                         │
│              │      Supabase         │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│    ┌─────────────────────┼─────────────────────┐               │
│    │                     │                     │               │
│  ┌─┴───────┐      ┌──────┴──────┐      ┌──────┴──────┐        │
│  │  Auth   │      │  PostgreSQL │      │   Realtime  │        │
│  │(GoTrue) │      │  + RLS      │      │  (WebSocket)│        │
│  └─────────┘      └─────────────┘      └─────────────┘        │
│                          │                                      │
│                   ┌──────┴──────┐                               │
│                   │   Storage   │                               │
│                   │   (S3)      │                               │
│                   └─────────────┘                               │
│                      Supabase                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Frontend Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth layout group
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (app)/                # Authenticated app layout
│   │   ├── trips/            # Trips list
│   │   ├── trip/[id]/        # Single trip
│   │   │   ├── itinerary/
│   │   │   ├── expenses/
│   │   │   ├── balance/
│   │   │   ├── participants/
│   │   │   └── settings/
│   │   └── settings/         # User settings
│   ├── invite/[code]/        # Invite acceptance
│   ├── layout.tsx
│   ├── page.tsx              # Landing page
│   └── manifest.ts           # PWA manifest
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── forms/                # Form components
│   ├── trips/                # Trip-related components
│   ├── itinerary/            # Itinerary components
│   ├── expenses/             # Expense components
│   ├── balance/              # Balance/settlement components
│   └── layout/               # Layout components
├── lib/
│   ├── supabase/             # Supabase client & helpers
│   ├── sync/                 # Offline sync engine
│   ├── validation/           # Zod schemas
│   └── utils/                # Utility functions
├── hooks/                    # Custom React hooks
├── stores/                   # Zustand stores
├── types/                    # TypeScript type definitions
└── styles/                   # Global styles
```

### 2.3 Offline-First Architecture

The sync engine handles bidirectional synchronization between IndexedDB and Supabase:

```
┌─────────────────────────────────────────────────────────────┐
│                      Sync Engine                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Online    │────▶│   Queue     │────▶│   Offline   │   │
│  │   Detector  │     │   Manager   │     │   Storage   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                             │                               │
│                      ┌──────┴──────┐                        │
│                      │  Conflict   │                        │
│                      │  Resolver   │                        │
│                      └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Sync Strategy:
1. All writes go to IndexedDB first (optimistic update)
2. Queue manager batches pending changes
3. When online, sync to Supabase
4. Supabase Realtime pushes changes to all clients
5. Conflict resolver uses last-write-wins with version tracking
```

---

## 3. Data Model

### 3.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │  trip_members    │       │    trips     │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)          │    ┌──│ id (PK)      │
│ email        │  │    │ trip_id (FK)     │────┘  │ name         │
│ name         │  └────│ user_id (FK)     │       │ destination  │
│ avatar_url   │       │ role             │       │ start_date   │
│ created_at   │       │ joined_at        │       │ end_date     │
│ updated_at   │       │ invited_by       │       │ description  │
└──────────────┘       └──────────────────┘       │ cover_url    │
                                                  │ style        │
                                                  │ created_by   │
                                                  │ created_at   │
                                                  │ updated_at   │
                                                  │ archived_at  │
                                                  └──────────────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 │                                 │
                       ▼                                 ▼                                 ▼
              ┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
              │   activities     │             │    expenses      │             │   trip_notes     │
              ├──────────────────┤             ├──────────────────┤             ├──────────────────┤
              │ id (PK)          │             │ id (PK)          │             │ id (PK)          │
              │ trip_id (FK)     │             │ trip_id (FK)     │             │ trip_id (FK)     │
              │ title            │             │ description      │             │ content          │
              │ date             │             │ amount           │             │ created_by (FK)  │
              │ start_time       │             │ currency         │             │ created_at       │
              │ duration_minutes │             │ date             │             │ updated_at       │
              │ location         │             │ category         │             └──────────────────┘
              │ description      │             │ paid_by (FK)     │
              │ category         │             │ created_by (FK)  │
              │ links            │             │ receipt_url      │
              │ sort_order       │             │ notes            │
              │ created_by (FK)  │             │ created_at       │
              │ created_at       │             │ updated_at       │
              │ updated_at       │             └────────┬─────────┘
              └──────────────────┘                      │
                       │                                │
                       ▼                                ▼
              ┌──────────────────┐             ┌──────────────────┐
              │activity_attachments│           │ expense_splits   │
              ├──────────────────┤             ├──────────────────┤
              │ id (PK)          │             │ id (PK)          │
              │ activity_id (FK) │             │ expense_id (FK)  │
              │ file_url         │             │ user_id (FK)     │
              │ file_name        │             │ amount           │
              │ file_type        │             │ percentage       │
              │ created_at       │             │ created_at       │
              └──────────────────┘             └──────────────────┘

              ┌──────────────────┐             ┌──────────────────┐
              │  trip_invites    │             │  settlements     │
              ├──────────────────┤             ├──────────────────┤
              │ id (PK)          │             │ id (PK)          │
              │ trip_id (FK)     │             │ trip_id (FK)     │
              │ code (unique)    │             │ from_user (FK)   │
              │ email            │             │ to_user (FK)     │
              │ invited_by (FK)  │             │ amount           │
              │ expires_at       │             │ settled_at       │
              │ accepted_at      │             │ created_at       │
              │ created_at       │             └──────────────────┘
              └──────────────────┘
```

### 3.2 Table Definitions

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### trips
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  cover_url TEXT,
  style TEXT, -- 'adventure', 'relaxation', 'cultural', 'gastronomic', 'other'
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
```

#### trip_members
```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant', -- 'organizer', 'participant'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  UNIQUE(trip_id, user_id)
);
```

#### activities
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER,
  location TEXT,
  description TEXT,
  category TEXT NOT NULL, -- 'transport', 'accommodation', 'tour', 'meal', 'event', 'other'
  links JSONB DEFAULT '[]', -- [{url, label}]
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### activity_attachments
```sql
CREATE TABLE activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT, -- MIME type
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### expenses
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  date DATE NOT NULL,
  category TEXT NOT NULL, -- 'accommodation', 'food', 'transport', 'tickets', 'shopping', 'other'
  paid_by UUID REFERENCES users(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### expense_splits
```sql
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL, -- calculated share amount
  percentage DECIMAL(5,2), -- if split by percentage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);
```

#### trip_notes
```sql
CREATE TABLE trip_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### trip_invites
```sql
CREATE TABLE trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  email TEXT, -- optional: for email invites
  invited_by UUID REFERENCES users(id) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### settlements
```sql
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  from_user UUID REFERENCES users(id) NOT NULL,
  to_user UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Row-Level Security (RLS) Policies

```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Trips: members can view, organizers can update
CREATE POLICY "Trip members can view trips" ON trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update trips" ON trips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'organizer'
    )
  );

-- Similar policies for all tables following the role-based access pattern
```

---

## 4. API Structure

### 4.1 Supabase Client SDK

All database operations use the Supabase JavaScript client SDK with TypeScript types generated from the database schema.

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

### 4.2 Data Access Layer

```typescript
// lib/supabase/trips.ts
export const tripsApi = {
  // List user's trips
  list: async (client: SupabaseClient) => {
    return client
      .from('trips')
      .select(`
        *,
        trip_members!inner(user_id, role),
        members:trip_members(
          user:users(id, name, avatar_url)
        )
      `)
      .order('start_date', { ascending: false })
  },

  // Get single trip with all related data
  get: async (client: SupabaseClient, tripId: string) => {
    return client
      .from('trips')
      .select(`
        *,
        members:trip_members(
          role,
          user:users(id, name, avatar_url)
        ),
        activities(*),
        expenses(
          *,
          paid_by_user:users!paid_by(id, name, avatar_url),
          splits:expense_splits(*)
        ),
        notes:trip_notes(*)
      `)
      .eq('id', tripId)
      .single()
  },

  // Create trip (also adds creator as organizer)
  create: async (client: SupabaseClient, data: CreateTripInput) => {
    const { data: trip, error } = await client
      .from('trips')
      .insert(data)
      .select()
      .single()

    if (trip) {
      await client.from('trip_members').insert({
        trip_id: trip.id,
        user_id: data.created_by,
        role: 'organizer'
      })
    }

    return { data: trip, error }
  },

  // Update trip
  update: async (client: SupabaseClient, tripId: string, data: UpdateTripInput) => {
    return client
      .from('trips')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', tripId)
  },

  // Archive trip
  archive: async (client: SupabaseClient, tripId: string) => {
    return client
      .from('trips')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', tripId)
  }
}
```

### 4.3 Real-time Subscriptions

```typescript
// hooks/use-trip-realtime.ts
export function useTripRealtime(tripId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `trip_id=eq.${tripId}`
      }, (payload) => {
        queryClient.invalidateQueries(['trip', tripId, 'activities'])
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `trip_id=eq.${tripId}`
      }, (payload) => {
        queryClient.invalidateQueries(['trip', tripId, 'expenses'])
        queryClient.invalidateQueries(['trip', tripId, 'balance'])
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle presence updates
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])
}
```

### 4.4 Edge Functions (Supabase)

For complex operations that need server-side logic:

```typescript
// supabase/functions/calculate-settlements/index.ts
// Calculates optimized debt settlements for a trip

// supabase/functions/send-invite/index.ts
// Sends email invitations via Resend

// supabase/functions/generate-invite-code/index.ts
// Generates unique, short invite codes
```

---

## 5. Key Implementation Patterns

### 5.1 Offline Sync Pattern

```typescript
// lib/sync/sync-engine.ts
export class SyncEngine {
  private db: Dexie // IndexedDB wrapper
  private supabase: SupabaseClient
  private isOnline: boolean

  async write<T>(table: string, data: T): Promise<T> {
    // 1. Write to IndexedDB immediately
    const localId = await this.db.table(table).add({
      ...data,
      _syncStatus: 'pending',
      _localId: crypto.randomUUID(),
      _timestamp: Date.now()
    })

    // 2. If online, sync immediately
    if (this.isOnline) {
      await this.syncToServer(table, localId)
    }

    return data
  }

  async syncToServer(table: string, localId: string) {
    const record = await this.db.table(table).get(localId)

    try {
      const { data, error } = await this.supabase
        .from(table)
        .upsert(record)
        .select()
        .single()

      if (!error) {
        await this.db.table(table).update(localId, {
          ...data,
          _syncStatus: 'synced'
        })
      }
    } catch {
      // Will retry on next sync cycle
    }
  }

  async syncPendingChanges() {
    const tables = ['activities', 'expenses', 'expense_splits']

    for (const table of tables) {
      const pending = await this.db
        .table(table)
        .where('_syncStatus')
        .equals('pending')
        .toArray()

      for (const record of pending) {
        await this.syncToServer(table, record._localId)
      }
    }
  }
}
```

### 5.2 Balance Calculation

```typescript
// lib/balance/calculate-balance.ts
interface Balance {
  userId: string
  totalPaid: number
  totalOwed: number
  netBalance: number // positive = receives, negative = owes
}

interface Settlement {
  from: string
  to: string
  amount: number
}

export function calculateBalances(
  expenses: Expense[],
  splits: ExpenseSplit[]
): Balance[] {
  const balanceMap = new Map<string, Balance>()

  // Calculate what each person paid
  for (const expense of expenses) {
    const balance = balanceMap.get(expense.paid_by) || {
      userId: expense.paid_by,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0
    }
    balance.totalPaid += expense.amount
    balanceMap.set(expense.paid_by, balance)
  }

  // Calculate what each person owes
  for (const split of splits) {
    const balance = balanceMap.get(split.user_id) || {
      userId: split.user_id,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0
    }
    balance.totalOwed += split.amount
    balanceMap.set(split.user_id, balance)
  }

  // Calculate net balance
  for (const balance of balanceMap.values()) {
    balance.netBalance = balance.totalPaid - balance.totalOwed
  }

  return Array.from(balanceMap.values())
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors = balances
    .filter(b => b.netBalance < 0)
    .map(b => ({ userId: b.userId, amount: Math.abs(b.netBalance) }))
    .sort((a, b) => b.amount - a.amount)

  const creditors = balances
    .filter(b => b.netBalance > 0)
    .map(b => ({ userId: b.userId, amount: b.netBalance }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []

  // Greedy algorithm to minimize number of transactions
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0]
    const creditor = creditors[0]
    const amount = Math.min(debtor.amount, creditor.amount)

    settlements.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(amount * 100) / 100 // Round to 2 decimals
    })

    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount < 0.01) debtors.shift()
    if (creditor.amount < 0.01) creditors.shift()
  }

  return settlements
}
```

### 5.3 Form Validation Schemas

```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

export const createTripSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  destination: z.string().min(1, 'Destino obrigatório').max(200),
  start_date: z.string().refine(d => !isNaN(Date.parse(d)), 'Data inválida'),
  end_date: z.string().refine(d => !isNaN(Date.parse(d)), 'Data inválida'),
  description: z.string().max(1000).optional(),
  style: z.enum(['adventure', 'relaxation', 'cultural', 'gastronomic', 'other']).optional()
}).refine(
  data => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'Data de fim deve ser após data de início', path: ['end_date'] }
)

export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória').max(200),
  amount: z.number().positive('Valor deve ser positivo'),
  currency: z.string().default('BRL'),
  date: z.string(),
  category: z.enum(['accommodation', 'food', 'transport', 'tickets', 'shopping', 'other']),
  paid_by: z.string().uuid(),
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional()
  })).min(1, 'Selecione pelo menos um participante')
})

export const createActivitySchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200),
  date: z.string(),
  start_time: z.string().optional(),
  duration_minutes: z.number().positive().optional(),
  location: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(['transport', 'accommodation', 'tour', 'meal', 'event', 'other']),
  links: z.array(z.object({
    url: z.string().url(),
    label: z.string().max(100)
  })).optional()
})
```

---

## 6. Source Code Structure Changes

Since this is a new project (greenfield), the complete structure will be:

```
half-trip/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI
├── public/
│   ├── icons/                     # PWA icons
│   └── manifest.json              # PWA manifest
├── src/
│   ├── app/                       # Next.js App Router pages
│   ├── components/                # React components
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Core libraries
│   ├── stores/                    # Zustand stores
│   ├── styles/                    # Global styles
│   └── types/                     # TypeScript types
├── supabase/
│   ├── migrations/                # Database migrations
│   ├── functions/                 # Edge functions
│   └── seed.sql                   # Seed data
├── tests/
│   ├── unit/                      # Vitest unit tests
│   └── e2e/                       # Playwright E2E tests
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 7. Delivery Phases

### Phase 1: Foundation (Core Infrastructure)
**Goal:** Project setup, authentication, and basic trip CRUD

- [ ] Project scaffolding (Next.js, TypeScript, Tailwind, shadcn/ui)
- [ ] Supabase project setup and configuration
- [ ] Database schema creation (migrations)
- [ ] Authentication flow (register, login, password reset)
- [ ] User profile management
- [ ] Trip CRUD operations
- [ ] Basic trip list and detail views
- [ ] Responsive mobile-first layout

**Verification:**
- User can register, login, logout
- User can create, view, edit, delete trips
- All operations work on mobile viewport

### Phase 2: Collaboration (Multi-user Features)
**Goal:** Invite system, participants, and permissions

- [ ] Invite link generation
- [ ] Invite acceptance flow
- [ ] Email invitations (Resend integration)
- [ ] Participant list management
- [ ] Role-based permissions (organizer vs participant)
- [ ] Remove participant / leave trip functionality

**Verification:**
- Organizer can invite via link and email
- Invited user can accept and join trip
- Permissions work correctly for each role

### Phase 3: Itinerary (Trip Planning)
**Goal:** Full itinerary management with activities

- [ ] Activity CRUD operations
- [ ] Day-by-day view
- [ ] Drag-and-drop reordering
- [ ] Activity categories and icons
- [ ] File attachments (Supabase Storage)
- [ ] Trip notes section
- [ ] Links management

**Verification:**
- User can add, edit, delete activities
- Activities can be reordered
- Files can be uploaded and viewed

### Phase 4: Expenses (Financial Tracking)
**Goal:** Complete expense tracking and splitting

- [ ] Expense CRUD operations
- [ ] Split types (equal, by value, by percentage, custom)
- [ ] Expense list with filters
- [ ] Category visualization
- [ ] Receipt upload

**Verification:**
- User can add expenses with various split types
- Splits are calculated correctly
- Receipts can be uploaded

### Phase 5: Balance & Settlement
**Goal:** Balance calculation and settlement tracking

- [ ] Balance calculation algorithm
- [ ] Individual balance view
- [ ] Settlement suggestions (who pays whom)
- [ ] Mark as settled functionality
- [ ] Trip summary/report view

**Verification:**
- Balances are calculated correctly
- Settlements minimize transactions
- Summary shows accurate totals

### Phase 6: Real-time & Offline
**Goal:** Real-time sync and offline capabilities

- [ ] Supabase Realtime integration
- [ ] Presence indicators
- [ ] IndexedDB setup (Dexie.js)
- [ ] Offline read capability
- [ ] Offline write with queue
- [ ] Conflict resolution
- [ ] Sync status indicators
- [ ] PWA setup (manifest, service worker)

**Verification:**
- Changes appear instantly for all participants
- App works offline (read + write)
- Data syncs correctly when back online
- App installable as PWA

### Phase 7: Polish & Launch
**Goal:** Final polish, testing, and deployment

- [ ] Comprehensive error handling
- [ ] Loading states and skeletons
- [ ] Empty states
- [ ] In-app notifications
- [ ] Performance optimization
- [ ] Accessibility review
- [ ] E2E test coverage
- [ ] Production deployment
- [ ] Monitoring setup

**Verification:**
- All user flows work smoothly
- Performance meets requirements (<3s load)
- No critical accessibility issues
- E2E tests pass

---

## 8. Verification Approach

### 8.1 Linting & Type Checking

```bash
# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run both
pnpm check
```

### 8.2 Unit Tests

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage
```

Key areas to test:
- Balance calculation logic
- Settlement algorithm
- Expense split calculations
- Validation schemas
- Utility functions

### 8.3 E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run in UI mode
pnpm test:e2e:ui
```

Key flows to test:
- Complete user registration and login
- Create trip and invite participants
- Add activities to itinerary
- Add expenses with different split types
- View balance and settlements
- Offline mode behavior

### 8.4 Manual Testing Checklist

- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test PWA installation
- [ ] Test offline mode
- [ ] Test with slow 3G throttling
- [ ] Test with multiple simultaneous users

---

## 9. Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
```

---

## 10. Security Considerations

1. **Authentication**: Supabase Auth with JWT tokens
2. **Authorization**: Row-Level Security (RLS) on all tables
3. **Input Validation**: Zod schemas on client + server
4. **File Uploads**: Restricted file types, size limits, virus scanning (future)
5. **Rate Limiting**: Supabase built-in rate limiting
6. **HTTPS**: Enforced via Vercel
7. **Secrets**: Environment variables, never committed

---

## 11. Performance Considerations

1. **Bundle Size**: Tree-shaking, dynamic imports for heavy components
2. **Images**: Next.js Image optimization, WebP format
3. **Database**: Proper indexes, query optimization
4. **Caching**: React Query caching, service worker caching
5. **Code Splitting**: Route-based splitting via App Router
6. **Lazy Loading**: Defer non-critical components

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **RLS** | Row-Level Security - PostgreSQL feature for access control |
| **PWA** | Progressive Web App - Web app with native-like capabilities |
| **SSR** | Server-Side Rendering |
| **Edge Function** | Serverless function running at the edge |
| **Optimistic Update** | Updating UI before server confirms change |

