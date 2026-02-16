import type { ExpenseCategory } from './database';
import type {
  EntityBalance,
  EntitySettlement,
  ParticipantBalance,
  Settlement,
} from '@/lib/balance';
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
  baseCurrency: string;
  totalExpenses: number;
  expenseCount: number;
  hasGroups: boolean;
  // Individual mode (hasGroups = false)
  participants: ParticipantBalance[];
  suggestedSettlements: Settlement[];
  // Entity mode (hasGroups = true)
  entities?: EntityBalance[];
  entitySettlements?: EntitySettlement[];
  // Always present
  settledSettlements: SettlementWithUsers[];
};
