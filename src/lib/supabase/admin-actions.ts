'use server';

import { requireAdmin, requireSuperAdmin } from './admin-auth';
import { logAdminAction } from './admin-log';
import type {
  SystemStats,
  UserWithStats,
  UserDetail,
  TripWithDetails,
  AdminTripDetail,
  ExpenseWithTrip,
  AdminUser,
  AdminActivityLogEntry,
  ActionResult,
  PaginatedResult,
} from '@/types/admin';

// ============================================================
// Dashboard
// ============================================================

export async function getSystemStats(): Promise<SystemStats | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [users, trips, expenses, settlements, blockedUsers, newUsers, activeTrips] =
    await Promise.all([
      adminClient.from('users').select('id', { count: 'exact', head: true }),
      adminClient.from('trips').select('id', { count: 'exact', head: true }),
      adminClient.from('expenses').select('id', { count: 'exact', head: true }),
      adminClient.from('settlements').select('id', { count: 'exact', head: true }),
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .not('blocked_at', 'is', null),
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),
      adminClient
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .gte('end_date', now.toISOString().split('T')[0])
        .is('archived_at', null),
    ]);

  return {
    totalUsers: users.count ?? 0,
    blockedUsers: blockedUsers.count ?? 0,
    totalTrips: trips.count ?? 0,
    totalExpenses: expenses.count ?? 0,
    totalSettlements: settlements.count ?? 0,
    newUsersThisMonth: newUsers.count ?? 0,
    activeTripsThisMonth: activeTrips.count ?? 0,
  };
}

// ============================================================
// Users
// ============================================================

export async function listUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  filter?: 'all' | 'active' | 'blocked';
}): Promise<PaginatedResult<UserWithStats> | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;
  const { page, pageSize, search, filter } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from('users')
    .select('id, name, email, avatar_url, blocked_at, created_at', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (filter === 'active') {
    query = query.is('blocked_at', null);
  } else if (filter === 'blocked') {
    query = query.not('blocked_at', 'is', null);
  }

  const { data: users, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (!users) return { items: [], total: 0 };

  // Get trip and expense counts for each user
  const userIds = users.map((u) => u.id);

  const [tripCounts, expenseCounts] = await Promise.all([
    adminClient.from('trip_members').select('user_id').in('user_id', userIds),
    adminClient.from('expenses').select('created_by').in('created_by', userIds),
  ]);

  const tripCountMap = new Map<string, number>();
  tripCounts.data?.forEach((tm) => {
    tripCountMap.set(tm.user_id, (tripCountMap.get(tm.user_id) ?? 0) + 1);
  });

  const expenseCountMap = new Map<string, number>();
  expenseCounts.data?.forEach((e) => {
    expenseCountMap.set(e.created_by, (expenseCountMap.get(e.created_by) ?? 0) + 1);
  });

  const items: UserWithStats[] = users.map((u) => ({
    ...u,
    tripCount: tripCountMap.get(u.id) ?? 0,
    expenseCount: expenseCountMap.get(u.id) ?? 0,
  }));

  return { items, total: count ?? 0 };
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;

  const { data: user } = await adminClient.from('users').select('*').eq('id', userId).single();

  if (!user) return null;

  // Get user's trips
  const { data: memberships } = await adminClient
    .from('trip_members')
    .select(
      'trip_id, role, trips!trip_members_trip_id_fkey(id, name, destination, start_date, end_date)'
    )
    .eq('user_id', userId);

  const trips = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const trip = m.trips as unknown as {
        id: string;
        name: string;
        destination: string;
        start_date: string;
        end_date: string;
      };
      const { count } = await adminClient
        .from('trip_members')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', m.trip_id);
      return {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        role: m.role,
        memberCount: count ?? 0,
      };
    })
  );

  // Get recent expenses
  const { data: expenses } = await adminClient
    .from('expenses')
    .select('id, description, amount, currency, date, trip_id, trips!expenses_trip_id_fkey(name)')
    .eq('created_by', userId)
    .order('date', { ascending: false })
    .limit(10);

  const recentExpenses = (expenses ?? []).map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    currency: e.currency,
    date: e.date,
    tripId: e.trip_id,
    tripName: (e.trips as unknown as { name: string })?.name ?? 'Viagem removida',
  }));

  // Count totals
  const { count: tripCount } = await adminClient
    .from('trip_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: expenseCount } = await adminClient
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    blocked_at: user.blocked_at,
    blocked_by: user.blocked_by,
    created_at: user.created_at,
    updated_at: user.updated_at,
    tripCount: tripCount ?? 0,
    expenseCount: expenseCount ?? 0,
    trips,
    recentExpenses,
  };
}

export async function toggleUserBlock(userId: string, block: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { adminClient, user: adminUser } = auth;

  // Prevent blocking yourself
  if (userId === adminUser.id) {
    return { error: 'Você não pode bloquear a si mesmo' };
  }

  const { error } = await adminClient
    .from('users')
    .update({
      blocked_at: block ? new Date().toISOString() : null,
      blocked_by: block ? adminUser.id : null,
    })
    .eq('id', userId);

  if (error) {
    return { error: 'Erro ao atualizar status do usuário' };
  }

  await logAdminAction({
    adminUserId: adminUser.id,
    action: block ? 'block_user' : 'unblock_user',
    entityType: 'user',
    entityId: userId,
  });

  return { success: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { adminClient, user: adminUser } = auth;

  // Prevent deleting yourself
  if (userId === adminUser.id) {
    return { error: 'Você não pode excluir a si mesmo' };
  }

  // Get user info for log before deletion
  const { data: targetUser } = await adminClient
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .single();

  // Log before deletion
  await logAdminAction({
    adminUserId: adminUser.id,
    action: 'delete_user',
    entityType: 'user',
    entityId: userId,
    metadata: { userName: targetUser?.name, userEmail: targetUser?.email },
  });

  // Delete from public.users (cascades trip_members, participants, etc.)
  const { error: dbError } = await adminClient.from('users').delete().eq('id', userId);
  if (dbError) {
    return { error: 'Erro ao excluir usuário do banco de dados' };
  }

  // Delete from auth.users
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
  if (authError) {
    return { error: 'Usuário removido do banco, mas erro ao remover autenticação' };
  }

  return { success: true };
}

// ============================================================
// Trips
// ============================================================

export async function listTrips(params: {
  page: number;
  pageSize: number;
  search?: string;
  filter?: 'all' | 'active' | 'archived';
}): Promise<PaginatedResult<TripWithDetails> | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;
  const { page, pageSize, search, filter } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from('trips')
    .select(
      'id, name, destination, start_date, end_date, base_currency, archived_at, created_at, created_by, users!trips_created_by_fkey(name)',
      { count: 'exact' }
    );

  if (search) {
    query = query.or(`name.ilike.%${search}%,destination.ilike.%${search}%`);
  }

  if (filter === 'active') {
    query = query.is('archived_at', null);
  } else if (filter === 'archived') {
    query = query.not('archived_at', 'is', null);
  }

  const { data: trips, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (!trips) return { items: [], total: 0 };

  const tripIds = trips.map((t) => t.id);

  const [memberCounts, expenseCounts] = await Promise.all([
    adminClient.from('trip_members').select('trip_id').in('trip_id', tripIds),
    adminClient.from('expenses').select('trip_id').in('trip_id', tripIds),
  ]);

  const memberCountMap = new Map<string, number>();
  memberCounts.data?.forEach((m) => {
    memberCountMap.set(m.trip_id, (memberCountMap.get(m.trip_id) ?? 0) + 1);
  });

  const expenseCountMap = new Map<string, number>();
  expenseCounts.data?.forEach((e) => {
    expenseCountMap.set(e.trip_id, (expenseCountMap.get(e.trip_id) ?? 0) + 1);
  });

  const items: TripWithDetails[] = trips.map((t) => ({
    id: t.id,
    name: t.name,
    destination: t.destination,
    start_date: t.start_date,
    end_date: t.end_date,
    base_currency: t.base_currency,
    archived_at: t.archived_at,
    created_at: t.created_at,
    created_by: t.created_by,
    createdByName: (t.users as unknown as { name: string })?.name ?? 'Desconhecido',
    memberCount: memberCountMap.get(t.id) ?? 0,
    expenseCount: expenseCountMap.get(t.id) ?? 0,
  }));

  return { items, total: count ?? 0 };
}

export async function getTripDetail(tripId: string): Promise<AdminTripDetail | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;

  const { data: trip } = await adminClient
    .from('trips')
    .select('*, users!trips_created_by_fkey(name)')
    .eq('id', tripId)
    .single();

  if (!trip) return null;

  const [membersResult, expensesResult, settlementsResult] = await Promise.all([
    adminClient
      .from('trip_members')
      .select('user_id, role, users!trip_members_user_id_fkey(name, email)')
      .eq('trip_id', tripId),
    adminClient
      .from('expenses')
      .select(
        'id, description, amount, currency, date, category, paid_by_participant_id, trip_participants!expenses_paid_by_participant_id_fkey(guest_name, users!trip_participants_user_id_fkey(name))'
      )
      .eq('trip_id', tripId)
      .order('date', { ascending: false })
      .limit(50),
    adminClient
      .from('settlements')
      .select('id, amount, settled_at, from_participant_id, to_participant_id')
      .eq('trip_id', tripId),
  ]);

  const members = (membersResult.data ?? []).map((m) => {
    const user = m.users as unknown as { name: string; email: string };
    return {
      userId: m.user_id,
      name: user?.name ?? 'Desconhecido',
      email: user?.email ?? '',
      role: m.role,
    };
  });

  const expenses = (expensesResult.data ?? []).map((e) => {
    const participant = e.trip_participants as unknown as {
      guest_name: string | null;
      users: { name: string } | null;
    } | null;
    return {
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
      category: e.category,
      paidByName: participant?.users?.name ?? participant?.guest_name ?? 'Desconhecido',
    };
  });

  const settlements = (settlementsResult.data ?? []).map((s) => ({
    id: s.id,
    fromName: s.from_participant_id ?? 'Desconhecido',
    toName: s.to_participant_id ?? 'Desconhecido',
    amount: s.amount,
    settled_at: s.settled_at,
  }));

  const { count: memberCount } = await adminClient
    .from('trip_members')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  const { count: expenseCount } = await adminClient
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    base_currency: trip.base_currency,
    archived_at: trip.archived_at,
    created_at: trip.created_at,
    created_by: trip.created_by,
    createdByName: (trip.users as unknown as { name: string })?.name ?? 'Desconhecido',
    description: trip.description,
    style: trip.style,
    transport_type: trip.transport_type,
    memberCount: memberCount ?? 0,
    expenseCount: expenseCount ?? 0,
    members,
    expenses,
    settlements,
  };
}

export async function deleteTrip(tripId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { adminClient, user: adminUser } = auth;

  const { data: trip } = await adminClient.from('trips').select('name').eq('id', tripId).single();

  await logAdminAction({
    adminUserId: adminUser.id,
    action: 'delete_trip',
    entityType: 'trip',
    entityId: tripId,
    metadata: { tripName: trip?.name },
  });

  const { error } = await adminClient.from('trips').delete().eq('id', tripId);
  if (error) {
    return { error: 'Erro ao excluir viagem' };
  }

  return { success: true };
}

// ============================================================
// Expenses
// ============================================================

export async function listExpenses(params: {
  page: number;
  pageSize: number;
  search?: string;
  tripId?: string;
}): Promise<PaginatedResult<ExpenseWithTrip> | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;
  const { page, pageSize, search, tripId } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from('expenses')
    .select(
      'id, description, amount, currency, date, category, trip_id, created_at, paid_by_participant_id, trips!expenses_trip_id_fkey(name), trip_participants!expenses_paid_by_participant_id_fkey(guest_name, users!trip_participants_user_id_fkey(name))',
      { count: 'exact' }
    );

  if (search) {
    query = query.ilike('description', `%${search}%`);
  }

  if (tripId) {
    query = query.eq('trip_id', tripId);
  }

  const { data: expenses, count } = await query.order('date', { ascending: false }).range(from, to);

  if (!expenses) return { items: [], total: 0 };

  const items: ExpenseWithTrip[] = expenses.map((e) => {
    const trip = e.trips as unknown as { name: string } | null;
    const participant = e.trip_participants as unknown as {
      guest_name: string | null;
      users: { name: string } | null;
    } | null;
    return {
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
      category: e.category,
      tripId: e.trip_id,
      tripName: trip?.name ?? 'Viagem removida',
      paidByName: participant?.users?.name ?? participant?.guest_name ?? 'Desconhecido',
      created_at: e.created_at,
    };
  });

  return { items, total: count ?? 0 };
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { adminClient, user: adminUser } = auth;

  const { data: expense } = await adminClient
    .from('expenses')
    .select('description, amount, trip_id')
    .eq('id', expenseId)
    .single();

  await logAdminAction({
    adminUserId: adminUser.id,
    action: 'delete_expense',
    entityType: 'expense',
    entityId: expenseId,
    metadata: {
      description: expense?.description,
      amount: expense?.amount,
      tripId: expense?.trip_id,
    },
  });

  const { error } = await adminClient.from('expenses').delete().eq('id', expenseId);
  if (error) {
    return { error: 'Erro ao excluir despesa' };
  }

  return { success: true };
}

// ============================================================
// Admins
// ============================================================

export async function listAdmins(): Promise<AdminUser[] | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;

  const { data: admins } = await adminClient
    .from('system_admins')
    .select(
      'id, user_id, email, role, granted_by, granted_at, users!system_admins_user_id_fkey(name, avatar_url)'
    )
    .order('granted_at', { ascending: true });

  if (!admins) return [];

  // Get grantedBy names
  const grantedByIds = admins.map((a) => a.granted_by).filter((id): id is string => id !== null);

  const { data: granters } =
    grantedByIds.length > 0
      ? await adminClient.from('users').select('id, name').in('id', grantedByIds)
      : { data: [] };

  const granterMap = new Map<string, string>();
  granters?.forEach((g) => granterMap.set(g.id, g.name));

  return admins.map((a) => {
    const user = a.users as unknown as { name: string; avatar_url: string | null };
    return {
      id: a.id,
      user_id: a.user_id,
      email: a.email,
      name: user?.name ?? a.email,
      avatar_url: user?.avatar_url ?? null,
      role: a.role,
      granted_by: a.granted_by,
      grantedByName: a.granted_by ? (granterMap.get(a.granted_by) ?? null) : null,
      granted_at: a.granted_at,
    };
  });
}

export async function addAdmin(
  email: string,
  role: 'admin' | 'super_admin'
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  const { adminClient, user: adminUser } = auth;

  // Find user by email
  const { data: targetUser } = await adminClient
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (!targetUser) {
    return { error: 'Usuário não encontrado com este email' };
  }

  // Check if already admin
  const { data: existing } = await adminClient
    .from('system_admins')
    .select('id')
    .eq('user_id', targetUser.id)
    .single();

  if (existing) {
    return { error: 'Este usuário já é administrador' };
  }

  const { error } = await adminClient.from('system_admins').insert({
    user_id: targetUser.id,
    email: targetUser.email,
    role,
    granted_by: adminUser.id,
  });

  if (error) {
    return { error: 'Erro ao adicionar administrador' };
  }

  await logAdminAction({
    adminUserId: adminUser.id,
    action: 'add_admin',
    entityType: 'admin',
    entityId: targetUser.id,
    metadata: { email: targetUser.email, role },
  });

  return { success: true };
}

export async function removeAdmin(adminId: string): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  const { adminClient, user: adminUser } = auth;

  // Get admin to be removed
  const { data: targetAdmin } = await adminClient
    .from('system_admins')
    .select('id, user_id, email')
    .eq('id', adminId)
    .single();

  if (!targetAdmin) {
    return { error: 'Administrador não encontrado' };
  }

  // Cannot remove self
  if (targetAdmin.user_id === adminUser.id) {
    return { error: 'Você não pode remover a si mesmo como administrador' };
  }

  // Ensure at least 1 super_admin remains
  const { count } = await adminClient
    .from('system_admins')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin');

  const { data: targetRecord } = await adminClient
    .from('system_admins')
    .select('role')
    .eq('id', adminId)
    .single();

  if (targetRecord?.role === 'super_admin' && (count ?? 0) <= 1) {
    return { error: 'Deve haver pelo menos um super admin no sistema' };
  }

  const { error } = await adminClient.from('system_admins').delete().eq('id', adminId);
  if (error) {
    return { error: 'Erro ao remover administrador' };
  }

  await logAdminAction({
    adminUserId: adminUser.id,
    action: 'remove_admin',
    entityType: 'admin',
    entityId: targetAdmin.user_id,
    metadata: { email: targetAdmin.email },
  });

  return { success: true };
}

export async function updateAdminRole(
  adminId: string,
  role: 'admin' | 'super_admin'
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  const { adminClient, user: adminUser } = auth;

  // If downgrading from super_admin, ensure at least 1 remains
  if (role === 'admin') {
    const { data: targetRecord } = await adminClient
      .from('system_admins')
      .select('role, user_id')
      .eq('id', adminId)
      .single();

    if (targetRecord?.role === 'super_admin') {
      const { count } = await adminClient
        .from('system_admins')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      if ((count ?? 0) <= 1) {
        return { error: 'Deve haver pelo menos um super admin no sistema' };
      }
    }
  }

  const { error } = await adminClient.from('system_admins').update({ role }).eq('id', adminId);

  if (error) {
    return { error: 'Erro ao atualizar role do administrador' };
  }

  await logAdminAction({
    adminUserId: adminUser.id,
    action: 'update_admin_role',
    entityType: 'admin',
    entityId: adminId,
    metadata: { newRole: role },
  });

  return { success: true };
}

// ============================================================
// Activity Log
// ============================================================

export async function getAdminActivityLog(params: {
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<AdminActivityLogEntry> | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const { adminClient } = auth;
  const { page, pageSize } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data: logs, count } = await adminClient
    .from('admin_activity_log')
    .select(
      'id, action, entity_type, entity_id, metadata, created_at, admin_user_id, users!admin_activity_log_admin_user_id_fkey(name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (!logs) return { items: [], total: 0 };

  const items: AdminActivityLogEntry[] = logs.map((log) => {
    const admin = log.users as unknown as { name: string; email: string };
    return {
      id: log.id,
      adminName: admin?.name ?? 'Desconhecido',
      adminEmail: admin?.email ?? '',
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      metadata: (log.metadata as Record<string, unknown>) ?? {},
      created_at: log.created_at,
    };
  });

  return { items, total: count ?? 0 };
}
