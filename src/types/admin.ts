import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SystemAdminRole } from './database';

// Auth result types
export type AdminAuthResult =
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      adminClient: SupabaseClient<Database>;
      user: { id: string; email: string };
      adminRole: SystemAdminRole;
    }
  | { ok: false; error: string };

// Generic action result
export type ActionResult = {
  success?: boolean;
  error?: string;
};

// Dashboard stats
export type SystemStats = {
  totalUsers: number;
  blockedUsers: number;
  totalTrips: number;
  totalExpenses: number;
  totalSettlements: number;
  newUsersThisMonth: number;
  activeTripsThisMonth: number;
};

// User management types
export type UserWithStats = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  blocked_at: string | null;
  created_at: string;
  tripCount: number;
  expenseCount: number;
};

export type UserDetail = UserWithStats & {
  blocked_by: string | null;
  updated_at: string;
  trips: UserTripInfo[];
  recentExpenses: UserExpenseInfo[];
};

export type UserTripInfo = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  role: string;
  memberCount: number;
};

export type UserExpenseInfo = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  tripName: string;
  tripId: string;
};

// Trip management types
export type TripWithDetails = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  base_currency: string;
  archived_at: string | null;
  created_at: string;
  created_by: string;
  createdByName: string;
  memberCount: number;
  expenseCount: number;
};

export type AdminTripDetail = TripWithDetails & {
  description: string | null;
  style: string | null;
  transport_type: string;
  members: {
    userId: string;
    name: string;
    email: string;
    role: string;
  }[];
  expenses: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    category: string;
    paidByName: string;
  }[];
  settlements: {
    id: string;
    fromName: string;
    toName: string;
    amount: number;
    settled_at: string | null;
  }[];
};

// Expense management types
export type ExpenseWithTrip = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  tripId: string;
  tripName: string;
  paidByName: string;
  created_at: string;
};

// Admin management types
export type AdminUser = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: SystemAdminRole;
  granted_by: string | null;
  grantedByName: string | null;
  granted_at: string;
};

// Admin activity log types
export type AdminActivityLogEntry = {
  id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// Pagination
export type PaginatedResult<T> = {
  items: T[];
  total: number;
};
