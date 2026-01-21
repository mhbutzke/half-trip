# Half Trip - Implementation Plan

## Configuration

- **Artifacts Path**: `.zenflow/tasks/fundacao-b012`

---

## Workflow Steps

### [x] Step: Requirements

<!-- chat-id: 18d79e54-3c82-487b-ac1f-8d35012231ed -->

PRD created at `requirements.md`.

### [x] Step: Technical Specification

<!-- chat-id: fb4808e6-55f2-47d7-aae2-3c271729a089 -->

Technical specification created at `spec.md`.

### [x] Step: Planning

<!-- chat-id: fabbebbf-b41c-42ad-8ddd-ffa027be8c4d -->

Detailed implementation plan created with 34 implementation steps across 7 phases.

---

## Phase 1: Foundation (Core Infrastructure)

### [x] Step 1.1: Project Scaffolding

<!-- chat-id: cb4ca4c5-7a7b-4fe2-9ace-41856f210a37 -->

Set up Next.js 14 project with App Router, TypeScript, and core tooling.

**Tasks:**

1. Create Next.js 14 project with TypeScript (`pnpm create next-app`)
2. Configure Tailwind CSS
3. Set up ESLint, Prettier, and husky with lint-staged
4. Configure path aliases in `tsconfig.json`
5. Create `.env.example` with required variables
6. Set up `.gitignore` with standard Next.js ignores

**Verification:**

- `pnpm dev` starts without errors
- `pnpm lint` passes
- `pnpm build` succeeds

**Completed:** Project scaffolded with Next.js 16 (latest), TypeScript, Tailwind CSS v4, ESLint, Prettier, husky, and lint-staged.

### [x] Step 1.2: UI Component Library Setup

<!-- chat-id: d11785dc-b4de-4fc4-9669-368bffbd73d9 -->

Install and configure shadcn/ui with base components.

**Tasks:**

1. Initialize shadcn/ui (`pnpm dlx shadcn@latest init`)
2. Install core components: Button, Card, Input, Label, Form, Dialog, Sheet, Select, Avatar, Badge, Tabs, Toast
3. Create `src/styles/globals.css` with custom CSS variables for Half Trip theme
4. Configure color palette (brand colors based on tone: simple, fair, collaborative)
5. Create layout components: `Header`, `MobileNav`, `PageContainer`

**Verification:**

- Components render correctly in dev mode
- Responsive layout works on mobile viewport

**Completed:** shadcn/ui initialized with Tailwind v4 support. Installed 17 core components (button, card, input, label, form, dialog, sheet, select, avatar, badge, tabs, sonner, skeleton, dropdown-menu, separator, scroll-area, tooltip). Created custom Half Trip theme with:

- Teal/cyan primary color (travel, trust, exploration)
- Warm amber secondary (collaboration)
- Green success color (fairness in expense splits)
- Custom positive/negative/warning colors for balance display
- Full dark mode support with OKLCH colors

Created layout components:

- `Header` with responsive navigation, theme toggle, user menu
- `MobileNav` bottom navigation for mobile devices
- `PageContainer` for consistent page layouts
- `ThemeProvider` for dark/light mode support

Updated home page with Half Trip landing page showcasing all components.

### [x] Step 1.3: Supabase Project Setup

<!-- chat-id: fd7a7c63-58ad-4155-b441-aa3ae428eff7 -->

Configure Supabase backend and database schema.

**Tasks:**

1. Create `supabase/` directory structure
2. Create initial migration file with all tables from spec:
   - `users`, `trips`, `trip_members`, `activities`, `activity_attachments`
   - `expenses`, `expense_splits`, `trip_notes`, `trip_invites`, `settlements`
3. Add indexes for common queries
4. Create Row-Level Security (RLS) policies
5. Create `supabase/seed.sql` with sample data for development

**Verification:**

- Migrations apply without errors
- RLS policies prevent unauthorized access

**Completed:** Created Supabase project structure with:

- `supabase/migrations/00001_initial_schema.sql`: All 10 tables from spec with proper constraints, foreign keys, and auto-update triggers for `updated_at` columns. Also includes `handle_new_user()` function to auto-create user profiles on auth signup.
- `supabase/migrations/00002_indexes.sql`: 24 indexes covering all common query patterns (trip lookups, member queries, expense filtering, etc.)
- `supabase/migrations/00003_rls_policies.sql`: Comprehensive RLS policies for all tables with helper functions `is_trip_member()` and `is_trip_organizer()`. Policies enforce role-based access control (organizers vs participants).
- `supabase/seed.sql`: Development seed data with 3 test users, 2 trips, 5 activities, 4 expenses with splits, 3 notes, and 1 pending invite. Includes balance calculation summary for testing.

### [x] Step 1.4: Supabase Client Integration

<!-- chat-id: e93b5fbf-1997-43b0-bd29-bd8f5c2793e9 -->

Set up Supabase client for frontend with SSR support.

**Tasks:**

1. Install `@supabase/ssr` and `@supabase/supabase-js`
2. Create `src/lib/supabase/client.ts` (browser client)
3. Create `src/lib/supabase/server.ts` (server client)
4. Create `src/lib/supabase/middleware.ts` for session refresh
5. Generate TypeScript types from database schema
6. Create `src/types/database.ts` with generated types

**Verification:**

- TypeScript types match database schema
- Client connects to Supabase in dev

**Completed:** Supabase client integration fully set up with:

- Installed `@supabase/ssr@0.8.0` and `@supabase/supabase-js@2.91.0`
- `src/lib/supabase/client.ts`: Browser client using `createBrowserClient` with Database type
- `src/lib/supabase/server.ts`: Server client using `createServerClient` with cookie handling for SSR
- `src/lib/supabase/middleware.ts`: Session refresh middleware with auth protection for routes
- `src/middleware.ts`: Next.js middleware that runs session refresh on all routes (except static assets)
- `src/types/database.ts`: Comprehensive TypeScript types matching all 10 database tables:
  - Full Row, Insert, Update types for all tables
  - Relationship definitions for foreign keys
  - Helper types (Tables, InsertTables, UpdateTables)
  - Convenience type aliases (User, Trip, Activity, Expense, etc.)
  - Enum types (TripStyle, TripMemberRole, ActivityCategory, ExpenseCategory)
  - ActivityLink type for JSONB links field
- Middleware protects routes and redirects unauthenticated users to /login with redirect param
- Public routes configured: /, /login, /register, /forgot-password, /invite/\*
- Build and lint pass successfully

### [ ] Step 1.5: Authentication Flow

Implement user registration, login, and password recovery.

**Tasks:**

1. Create auth layout group: `src/app/(auth)/layout.tsx`
2. Create registration page: `src/app/(auth)/register/page.tsx`
3. Create login page: `src/app/(auth)/login/page.tsx`
4. Create password reset page: `src/app/(auth)/forgot-password/page.tsx`
5. Create form components with React Hook Form + Zod validation
6. Create `src/lib/validation/auth-schemas.ts`
7. Implement auth actions using Supabase Auth
8. Add middleware for protected routes

**Verification:**

- User can register with email/password
- User can login and logout
- Password reset flow works
- Protected routes redirect unauthenticated users

### [ ] Step 1.6: User Profile Management

Implement user profile view and edit functionality.

**Tasks:**

1. Create authenticated layout: `src/app/(app)/layout.tsx`
2. Create user settings page: `src/app/(app)/settings/page.tsx`
3. Create `ProfileForm` component for editing name and avatar
4. Implement avatar upload to Supabase Storage
5. Create `useUser` hook for accessing current user

**Verification:**

- User can view and edit profile
- Avatar upload works
- Changes persist after refresh

### [ ] Step 1.7: Trip CRUD Operations

Implement basic trip management.

**Tasks:**

1. Create trip API layer: `src/lib/supabase/trips.ts`
2. Create trips list page: `src/app/(app)/trips/page.tsx`
3. Create trip detail page: `src/app/(app)/trip/[id]/page.tsx`
4. Create `TripCard` component for trip list
5. Create `CreateTripDialog` component with form
6. Create `EditTripDialog` component
7. Create `src/lib/validation/trip-schemas.ts`
8. Implement archive/delete trip functionality

**Verification:**

- User can create, view, edit, archive trips
- Trip list shows user's trips
- Navigation between list and detail works

### [ ] Step 1.8: Responsive Mobile-First Layout

Finalize responsive layout for all Phase 1 pages.

**Tasks:**

1. Create mobile bottom navigation: `BottomNav` component
2. Implement responsive header with hamburger menu
3. Add touch-friendly tap targets (min 44px)
4. Test all pages on mobile viewport sizes
5. Add loading skeletons for async content

**Verification:**

- All pages work on 320px-428px viewport
- Navigation is accessible on mobile
- No horizontal scroll on mobile

---

## Phase 2: Collaboration (Multi-user Features)

### [ ] Step 2.1: Invite Link Generation

Implement shareable invite link functionality.

**Tasks:**

1. Create invite API layer: `src/lib/supabase/invites.ts`
2. Create `generateInviteCode` utility (short, unique codes)
3. Create invite management UI in trip settings
4. Implement invite link generation with expiration
5. Create `CopyInviteLink` component with share functionality

**Verification:**

- Organizer can generate invite link
- Link contains valid invite code
- Copy to clipboard works

### [ ] Step 2.2: Invite Acceptance Flow

Implement the flow for accepting invites.

**Tasks:**

1. Create invite page: `src/app/invite/[code]/page.tsx`
2. Handle three scenarios:
   - User logged in: join trip directly
   - User not logged in but registered: prompt login, then join
   - New user: prompt registration, then join
3. Validate invite code and expiration
4. Add user to trip as participant

**Verification:**

- Valid invite code allows joining trip
- Expired invite shows appropriate message
- User is added as participant with correct role

### [ ] Step 2.3: Email Invitations

Implement email-based invitations using Resend.

**Tasks:**

1. Install Resend SDK
2. Create Supabase Edge Function: `supabase/functions/send-invite/index.ts`
3. Create email template for invitations
4. Create `InviteByEmailForm` component
5. Store email invites in `trip_invites` table

**Verification:**

- Email is sent to invited address
- Email contains valid invite link
- Invite is tracked in database

### [ ] Step 2.4: Participant Management

Implement participant list and management.

**Tasks:**

1. Create participants page: `src/app/(app)/trip/[id]/participants/page.tsx`
2. Create `ParticipantsList` component with avatars and roles
3. Create `ParticipantCard` component
4. Implement remove participant (organizers only)
5. Implement leave trip functionality
6. Create pending invites list

**Verification:**

- Participant list shows all members
- Organizer can remove participants
- User can leave trip
- Pending invites are displayed

### [ ] Step 2.5: Role-Based Permissions

Implement permission checks throughout the app.

**Tasks:**

1. Create `usePermissions` hook
2. Create `can` helper function for permission checks
3. Add permission guards to UI components
4. Update RLS policies for role-based access
5. Hide/disable actions based on role

**Verification:**

- Participants cannot edit trip details
- Participants cannot remove other participants
- Organizers have full access

---

## Phase 3: Itinerary (Trip Planning)

### [ ] Step 3.1: Activity CRUD Operations

Implement activity management.

**Tasks:**

1. Create activity API layer: `src/lib/supabase/activities.ts`
2. Create `src/lib/validation/activity-schemas.ts`
3. Create `AddActivityDialog` component
4. Create `EditActivityDialog` component
5. Implement delete activity with confirmation
6. Create activity categories with icons

**Verification:**

- User can add, edit, delete activities
- Validation works correctly
- Category icons display

### [ ] Step 3.2: Day-by-Day View

Implement itinerary visualization organized by days.

**Tasks:**

1. Create itinerary page: `src/app/(app)/trip/[id]/itinerary/page.tsx`
2. Create `DaySection` component
3. Create `ActivityCard` component
4. Generate day list from trip dates
5. Group activities by date
6. Show empty state for days without activities

**Verification:**

- Days are displayed chronologically
- Activities appear under correct day
- Empty days show add activity prompt

### [ ] Step 3.3: Drag-and-Drop Reordering

Implement activity reordering with drag and drop.

**Tasks:**

1. Install drag-and-drop library (dnd-kit or similar)
2. Add drag handles to `ActivityCard`
3. Implement reorder within same day
4. Implement move between days
5. Update `sort_order` in database
6. Add optimistic updates

**Verification:**

- Activities can be reordered via drag
- Activities can be moved between days
- Order persists after refresh

### [ ] Step 3.4: File Attachments

Implement file upload for activities.

**Tasks:**

1. Configure Supabase Storage bucket for attachments
2. Create `FileUpload` component
3. Create `AttachmentsList` component
4. Implement file upload to activity
5. Support common file types (PDF, images)
6. Implement file preview/download

**Verification:**

- Files can be uploaded to activities
- Files are displayed and downloadable
- File size limits are enforced

### [ ] Step 3.5: Trip Notes

Implement general notes for the trip.

**Tasks:**

1. Create trip notes API layer: `src/lib/supabase/notes.ts`
2. Create notes section in trip detail
3. Create `AddNoteDialog` component
4. Create `NoteCard` component
5. Implement edit and delete notes

**Verification:**

- Notes can be added, edited, deleted
- Notes show author and timestamp
- Notes persist correctly

---

## Phase 4: Expenses (Financial Tracking)

### [ ] Step 4.1: Expense CRUD Operations

Implement expense management.

**Tasks:**

1. Create expense API layer: `src/lib/supabase/expenses.ts`
2. Create `src/lib/validation/expense-schemas.ts`
3. Create expenses page: `src/app/(app)/trip/[id]/expenses/page.tsx`
4. Create `AddExpenseSheet` component (bottom sheet for mobile)
5. Create `EditExpenseSheet` component
6. Implement delete expense with confirmation

**Verification:**

- User can add, edit, delete expenses
- Validation works correctly
- Expenses appear in list

### [ ] Step 4.2: Expense Split Types

Implement different ways to split expenses.

**Tasks:**

1. Create `SplitSelector` component
2. Implement equal split calculation
3. Implement split by specific amounts
4. Implement split by percentage
5. Implement split among selected participants only
6. Create `expense_splits` records automatically

**Verification:**

- All split types calculate correctly
- Splits sum to total expense amount
- Participants can be excluded from split

### [ ] Step 4.3: Expense List and Filters

Implement expense list with filtering and search.

**Tasks:**

1. Create `ExpenseList` component
2. Create `ExpenseCard` component with category icon
3. Implement category filter
4. Implement "paid by" filter
5. Implement date range filter
6. Implement search by description

**Verification:**

- Expenses display with correct info
- Filters work correctly
- Search finds matching expenses

### [ ] Step 4.4: Receipt Upload

Implement receipt photo/file upload.

**Tasks:**

1. Configure Supabase Storage bucket for receipts
2. Create `ReceiptUpload` component with camera capture (mobile)
3. Add receipt preview in expense detail
4. Implement receipt deletion
5. Support image compression for mobile uploads

**Verification:**

- Receipts can be uploaded from gallery
- Camera capture works on mobile
- Receipt preview displays correctly

---

## Phase 5: Balance & Settlement

### [ ] Step 5.1: Balance Calculation

Implement balance calculation algorithm.

**Tasks:**

1. Create `src/lib/balance/calculate-balance.ts`
2. Implement `calculateBalances` function
3. Create `useBalance` hook with React Query
4. Add balance calculation tests

**Verification:**

- Balances calculate correctly
- Net balance = paid - owed
- Total debts equal total credits

### [ ] Step 5.2: Individual Balance View

Implement balance visualization per participant.

**Tasks:**

1. Create balance page: `src/app/(app)/trip/[id]/balance/page.tsx`
2. Create `BalanceSummary` component
3. Create `ParticipantBalance` component
4. Show total paid, total owed, net balance per person
5. Visual indicators for positive/negative balance

**Verification:**

- Each participant's balance displays
- Positive/negative clearly distinguished
- Total expense summary is accurate

### [ ] Step 5.3: Settlement Suggestions

Implement optimized debt settlement algorithm.

**Tasks:**

1. Create `calculateSettlements` function
2. Implement debt simplification (minimize transactions)
3. Create `SettlementsList` component
4. Show "X owes Y amount" clearly

**Verification:**

- Settlements minimize number of transactions
- All debts are covered
- Display is clear and actionable

### [ ] Step 5.4: Settlement Tracking

Implement marking debts as settled.

**Tasks:**

1. Create settlement tracking UI
2. Create `MarkSettledDialog` component
3. Store settlements in database
4. Update balance view to show settled amounts
5. Show settlement history

**Verification:**

- Settlements can be marked as paid
- Balance updates after settlement
- Settlement history is visible

### [ ] Step 5.5: Trip Summary Report

Implement comprehensive trip expense summary.

**Tasks:**

1. Create summary section on balance page
2. Show total trip expenses
3. Show expenses by category (with chart)
4. Show expenses by person
5. Show per-person average

**Verification:**

- Summary totals are accurate
- Category breakdown is correct
- Charts render properly

---

## Phase 6: Real-time & Offline

### [ ] Step 6.1: Supabase Realtime Integration

Implement real-time updates.

**Tasks:**

1. Create `src/hooks/use-trip-realtime.ts`
2. Subscribe to activities changes
3. Subscribe to expenses changes
4. Subscribe to members changes
5. Invalidate React Query caches on changes

**Verification:**

- Changes appear instantly for all users
- No page refresh needed
- Subscriptions clean up properly

### [ ] Step 6.2: Presence Indicators

Show who is currently viewing the trip.

**Tasks:**

1. Implement Supabase Presence tracking
2. Create `OnlineIndicator` component
3. Show online avatars in trip header
4. Track presence per trip channel

**Verification:**

- Online users are displayed
- Presence updates when users join/leave
- Multiple tabs handled correctly

### [ ] Step 6.3: IndexedDB Setup

Set up offline storage with Dexie.js.

**Tasks:**

1. Install Dexie.js
2. Create `src/lib/sync/db.ts` with schema
3. Mirror relevant tables: trips, activities, expenses, splits
4. Create sync status tracking fields
5. Create DB initialization on app load

**Verification:**

- IndexedDB schema created
- Data can be written and read
- Schema matches server structure

### [ ] Step 6.4: Offline Read Capability

Implement reading data when offline.

**Tasks:**

1. Create `useTripOffline` hook
2. Cache trip data on fetch
3. Serve from IndexedDB when offline
4. Show "offline" indicator in UI
5. Create `useOnlineStatus` hook

**Verification:**

- App loads with cached data offline
- Offline indicator displays
- Previously viewed trips accessible

### [ ] Step 6.5: Offline Write with Queue

Implement offline writes with sync queue.

**Tasks:**

1. Create `src/lib/sync/sync-engine.ts`
2. Implement write queue for offline changes
3. Mark local changes as "pending"
4. Show pending sync indicator on items
5. Implement queue processing when online

**Verification:**

- Changes save locally when offline
- Pending items show indicator
- Queue persists across app restarts

### [ ] Step 6.6: Sync and Conflict Resolution

Implement synchronization when back online.

**Tasks:**

1. Implement automatic sync on reconnect
2. Implement last-write-wins conflict resolution
3. Handle sync errors gracefully
4. Show sync status (syncing, synced, error)
5. Allow manual retry for failed syncs

**Verification:**

- Data syncs automatically on reconnect
- Conflicts resolved correctly
- Sync errors can be retried

### [ ] Step 6.7: PWA Setup

Configure Progressive Web App capabilities.

**Tasks:**

1. Install and configure next-pwa
2. Create `src/app/manifest.ts`
3. Generate PWA icons (multiple sizes)
4. Configure service worker caching
5. Add install prompt
6. Configure offline fallback page

**Verification:**

- App installable on mobile
- Works offline after installation
- Service worker caches assets

---

## Phase 7: Polish & Launch

### [ ] Step 7.1: Error Handling

Implement comprehensive error handling.

**Tasks:**

1. Create error boundary components
2. Create user-friendly error messages
3. Handle API errors gracefully
4. Add error logging (console for now)
5. Create `src/app/error.tsx` and `not-found.tsx`

**Verification:**

- Errors don't crash the app
- Users see helpful error messages
- Errors are logged

### [ ] Step 7.2: Loading States

Implement loading states and skeletons.

**Tasks:**

1. Create skeleton components for each card type
2. Add loading states to all async operations
3. Create `loading.tsx` for route transitions
4. Add button loading states
5. Implement optimistic updates where appropriate

**Verification:**

- Loading states visible during fetches
- Skeletons match content layout
- No content flash on navigation

### [ ] Step 7.3: Empty States

Implement empty states for lists.

**Tasks:**

1. Create `EmptyState` component
2. Add empty state for trips list
3. Add empty state for activities
4. Add empty state for expenses
5. Include call-to-action in empty states

**Verification:**

- Empty states display when lists empty
- CTAs lead to add actions
- Illustrations/icons are appropriate

### [ ] Step 7.4: In-App Notifications

Implement notification system.

**Tasks:**

1. Create notification store with Zustand
2. Create `NotificationToast` component
3. Trigger notifications on key events:
   - Expense added
   - Participant joined
   - Activity updated
4. Implement notification settings

**Verification:**

- Notifications display on events
- Can be dismissed
- Settings control notification types

### [ ] Step 7.5: Performance Optimization

Optimize app performance.

**Tasks:**

1. Implement dynamic imports for heavy components
2. Optimize images with next/image
3. Review and optimize bundle size
4. Add React.memo where beneficial
5. Profile and fix re-renders

**Verification:**

- Lighthouse performance score > 90
- First contentful paint < 1.5s
- Time to interactive < 3s

### [ ] Step 7.6: Accessibility Review

Ensure accessibility compliance.

**Tasks:**

1. Audit with axe DevTools
2. Fix color contrast issues
3. Add proper ARIA labels
4. Ensure keyboard navigation works
5. Test with screen reader

**Verification:**

- No critical accessibility violations
- Keyboard navigation complete
- Form labels associated correctly

### [ ] Step 7.7: Unit Tests

Write unit tests for core logic.

**Tasks:**

1. Configure Vitest
2. Test balance calculation
3. Test settlement algorithm
4. Test expense split calculations
5. Test validation schemas
6. Test utility functions

**Verification:**

- `pnpm test` passes
- Coverage > 80% for lib/
- Critical paths tested

### [ ] Step 7.8: E2E Tests

Write end-to-end tests for critical flows.

**Tasks:**

1. Configure Playwright
2. Test registration and login flow
3. Test create trip flow
4. Test add expense flow
5. Test invite and join flow
6. Test balance view

**Verification:**

- `pnpm test:e2e` passes
- Critical user journeys covered
- Tests run in CI

### [ ] Step 7.9: Production Deployment

Deploy to production environment.

**Tasks:**

1. Set up Vercel project
2. Configure environment variables
3. Set up Supabase production project
4. Run migrations on production DB
5. Configure custom domain (if available)
6. Verify deployment

**Verification:**

- App accessible at production URL
- All features work in production
- SSL certificate valid

### [ ] Step 7.10: Monitoring Setup

Set up basic monitoring.

**Tasks:**

1. Enable Vercel Analytics
2. Set up Supabase monitoring
3. Configure error alerting
4. Document operational procedures

**Verification:**

- Analytics tracking page views
- Error alerts configured
- Runbook documented
