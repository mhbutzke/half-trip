/**
 * Balance Calculation Types
 *
 * This module defines the types used for expense balance calculations
 * in the Half Trip application.
 */

export interface ParticipantBalance {
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalPaid: number; // Total amount this participant paid
  totalOwed: number; // Total amount this participant owes (their share)
  netBalance: number; // paid - owed (positive = owed money, negative = owes money)
}

export interface ExpenseData {
  id: string;
  amount: number;
  paidById: string;
  exchangeRate: number;
  splits: ExpenseSplit[];
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
}

export interface TripMemberData {
  userId: string;
  userName: string;
  userAvatar: string | null;
}

export interface BalanceCalculationResult {
  participants: ParticipantBalance[];
  totalExpenses: number;
  participantCount: number;
}

export interface Settlement {
  from: {
    userId: string;
    userName: string;
    userAvatar: string | null;
  };
  to: {
    userId: string;
    userName: string;
    userAvatar: string | null;
  };
  amount: number;
}

/**
 * Persisted settlement from the database
 * Used to track settlements that have already been made
 */
export interface PersistedSettlement {
  fromUserId: string;
  toUserId: string;
  amount: number;
}
