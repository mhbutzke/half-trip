import type { ExpenseCategory } from './database';
import type { ParticipantBalance, Settlement } from '@/lib/balance';
import type { SettlementWithUsers } from '@/lib/supabase/settlements';

export type CategorySummary = {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
};

export type PersonExpenseSummary = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalPaid: number;
  expenseCount: number;
  percentage: number;
};

export type TripExpenseSummary = {
  tripId: string;
  totalExpenses: number;
  expenseCount: number;
  participants: ParticipantBalance[];
  suggestedSettlements: Settlement[];
  settledSettlements: SettlementWithUsers[];
};
