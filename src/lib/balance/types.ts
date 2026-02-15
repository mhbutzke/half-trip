/**
 * Balance Calculation Types
 *
 * This module defines the types used for expense balance calculations
 * in the Half Trip application.
 *
 * All participant references use participantId (trip_participants.id)
 * which works for both registered users and guests.
 */

export interface ParticipantBalance {
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  participantType: 'member' | 'guest';
  totalPaid: number; // Total amount this participant paid
  totalOwed: number; // Total amount this participant owes (their share)
  netBalance: number; // paid - owed (positive = owed money, negative = owes money)
}

export interface ExpenseData {
  id: string;
  amount: number;
  paidByParticipantId: string;
  exchangeRate?: number;
  splits: ExpenseSplitData[];
}

export interface ExpenseSplitData {
  participantId: string;
  amount: number;
}

export interface ParticipantData {
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  participantType: 'member' | 'guest';
}

export interface BalanceCalculationResult {
  participants: ParticipantBalance[];
  totalExpenses: number;
  participantCount: number;
}

export interface Settlement {
  from: {
    participantId: string;
    participantName: string;
    participantAvatar: string | null;
  };
  to: {
    participantId: string;
    participantName: string;
    participantAvatar: string | null;
  };
  amount: number;
}

/**
 * Persisted settlement from the database
 * Used to track settlements that have already been made
 */
export interface PersistedSettlement {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
}

// --- Group Balance Types (Fase 3) ---

export interface GroupData {
  groupId: string;
  groupName: string;
  memberParticipantIds: string[];
}

export interface EntityBalance {
  entityId: string; // participantId OR groupId
  entityType: 'participant' | 'group';
  displayName: string;
  displayAvatar: string | null;
  members?: ParticipantData[];
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}
