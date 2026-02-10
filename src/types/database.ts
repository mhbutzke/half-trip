export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          name: string;
          destination: string;
          start_date: string;
          end_date: string;
          description: string | null;
          cover_url: string | null;
          style: 'adventure' | 'relaxation' | 'cultural' | 'gastronomic' | 'other' | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          destination: string;
          start_date: string;
          end_date: string;
          description?: string | null;
          cover_url?: string | null;
          style?: 'adventure' | 'relaxation' | 'cultural' | 'gastronomic' | 'other' | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          destination?: string;
          start_date?: string;
          end_date?: string;
          description?: string | null;
          cover_url?: string | null;
          style?: 'adventure' | 'relaxation' | 'cultural' | 'gastronomic' | 'other' | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trips_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_members: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          role: 'organizer' | 'participant';
          joined_at: string;
          invited_by: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          role?: 'organizer' | 'participant';
          joined_at?: string;
          invited_by?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          role?: 'organizer' | 'participant';
          joined_at?: string;
          invited_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_members_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_members_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          trip_id: string;
          title: string;
          date: string;
          start_time: string | null;
          duration_minutes: number | null;
          location: string | null;
          description: string | null;
          category: 'transport' | 'accommodation' | 'tour' | 'meal' | 'event' | 'other';
          links: Json;
          metadata: Json;
          sort_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          title: string;
          date: string;
          start_time?: string | null;
          duration_minutes?: number | null;
          location?: string | null;
          description?: string | null;
          category: 'transport' | 'accommodation' | 'tour' | 'meal' | 'event' | 'other';
          links?: Json;
          metadata?: Json;
          sort_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          title?: string;
          date?: string;
          start_time?: string | null;
          duration_minutes?: number | null;
          location?: string | null;
          description?: string | null;
          category?: 'transport' | 'accommodation' | 'tour' | 'meal' | 'event' | 'other';
          links?: Json;
          metadata?: Json;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activities_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_attachments: {
        Row: {
          id: string;
          activity_id: string;
          file_url: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          file_url: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          file_url?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_attachments_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          description: string;
          amount: number;
          currency: string;
          date: string;
          category: 'accommodation' | 'food' | 'transport' | 'tickets' | 'shopping' | 'other';
          paid_by: string;
          created_by: string;
          receipt_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          description: string;
          amount: number;
          currency?: string;
          date: string;
          category: 'accommodation' | 'food' | 'transport' | 'tickets' | 'shopping' | 'other';
          paid_by: string;
          created_by: string;
          receipt_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          description?: string;
          amount?: number;
          currency?: string;
          date?: string;
          category?: 'accommodation' | 'food' | 'transport' | 'tickets' | 'shopping' | 'other';
          paid_by?: string;
          created_by?: string;
          receipt_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_paid_by_fkey';
            columns: ['paid_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          amount: number;
          percentage: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id: string;
          amount: number;
          percentage?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          user_id?: string;
          amount?: number;
          percentage?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expense_splits_expense_id_fkey';
            columns: ['expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expense_splits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_notes: {
        Row: {
          id: string;
          trip_id: string;
          content: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          content: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          content?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_notes_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_notes_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_invites: {
        Row: {
          id: string;
          trip_id: string;
          code: string;
          email: string | null;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          code: string;
          email?: string | null;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          code?: string;
          email?: string | null;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_invites_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_invites_accepted_by_fkey';
            columns: ['accepted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_budgets: {
        Row: {
          id: string;
          trip_id: string;
          category:
            | 'accommodation'
            | 'food'
            | 'transport'
            | 'tickets'
            | 'shopping'
            | 'other'
            | 'total';
          amount: number;
          currency: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          category:
            | 'accommodation'
            | 'food'
            | 'transport'
            | 'tickets'
            | 'shopping'
            | 'other'
            | 'total';
          amount: number;
          currency?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          category?:
            | 'accommodation'
            | 'food'
            | 'transport'
            | 'tickets'
            | 'shopping'
            | 'other'
            | 'total';
          amount?: number;
          currency?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_budgets_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_budgets_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_checklists: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          description: string | null;
          category: 'packing' | 'todo' | 'shopping' | 'documents' | 'other';
          sort_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
          description?: string | null;
          category: 'packing' | 'todo' | 'shopping' | 'documents' | 'other';
          sort_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          name?: string;
          description?: string | null;
          category?: 'packing' | 'todo' | 'shopping' | 'documents' | 'other';
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_checklists_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_checklists_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_items: {
        Row: {
          id: string;
          checklist_id: string;
          title: string;
          is_completed: boolean;
          assigned_to: string | null;
          completed_by: string | null;
          completed_at: string | null;
          quantity: number;
          sort_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          title: string;
          is_completed?: boolean;
          assigned_to?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          quantity?: number;
          sort_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          checklist_id?: string;
          title?: string;
          is_completed?: boolean;
          assigned_to?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          quantity?: number;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_items_checklist_id_fkey';
            columns: ['checklist_id'];
            isOneToOne: false;
            referencedRelation: 'trip_checklists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_items_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_items_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      settlements: {
        Row: {
          id: string;
          trip_id: string;
          from_user: string;
          to_user: string;
          amount: number;
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          from_user: string;
          to_user: string;
          amount: number;
          settled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          from_user?: string;
          to_user?: string;
          amount?: number;
          settled_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'settlements_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'settlements_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'settlements_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_trip_with_member: {
        Args: {
          p_name: string;
          p_destination: string;
          p_start_date: string;
          p_end_date: string;
          p_description?: string | null;
          p_style?: string | null;
        };
        Returns: string;
      };
      is_trip_member: {
        Args: {
          trip_id: string;
        };
        Returns: boolean;
      };
      is_trip_organizer: {
        Args: {
          trip_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience type aliases
export type User = Tables<'users'>;
export type Trip = Tables<'trips'>;
export type TripMember = Tables<'trip_members'>;
export type Activity = Tables<'activities'>;
export type ActivityAttachment = Tables<'activity_attachments'>;
export type Expense = Tables<'expenses'>;
export type ExpenseSplit = Tables<'expense_splits'>;
export type TripNote = Tables<'trip_notes'>;
export type TripInvite = Tables<'trip_invites'>;
export type Settlement = Tables<'settlements'>;
export type TripBudgetRow = Tables<'trip_budgets'>;

// Insert types
export type InsertUser = InsertTables<'users'>;
export type InsertTrip = InsertTables<'trips'>;
export type InsertTripMember = InsertTables<'trip_members'>;
export type InsertActivity = InsertTables<'activities'>;
export type InsertActivityAttachment = InsertTables<'activity_attachments'>;
export type InsertExpense = InsertTables<'expenses'>;
export type InsertExpenseSplit = InsertTables<'expense_splits'>;
export type InsertTripNote = InsertTables<'trip_notes'>;
export type InsertTripInvite = InsertTables<'trip_invites'>;
export type InsertSettlement = InsertTables<'settlements'>;
export type InsertTripBudget = InsertTables<'trip_budgets'>;

// Update types
export type UpdateUser = UpdateTables<'users'>;
export type UpdateTrip = UpdateTables<'trips'>;
export type UpdateTripMember = UpdateTables<'trip_members'>;
export type UpdateActivity = UpdateTables<'activities'>;
export type UpdateActivityAttachment = UpdateTables<'activity_attachments'>;
export type UpdateExpense = UpdateTables<'expenses'>;
export type UpdateExpenseSplit = UpdateTables<'expense_splits'>;
export type UpdateTripNote = UpdateTables<'trip_notes'>;
export type UpdateTripInvite = UpdateTables<'trip_invites'>;
export type UpdateSettlement = UpdateTables<'settlements'>;
export type UpdateTripBudget = UpdateTables<'trip_budgets'>;

// Enum types extracted from database constraints
export type TripStyle = 'adventure' | 'relaxation' | 'cultural' | 'gastronomic' | 'other';
export type TripMemberRole = 'organizer' | 'participant';
export type ActivityCategory = 'transport' | 'accommodation' | 'tour' | 'meal' | 'event' | 'other';
export type ExpenseCategory =
  | 'accommodation'
  | 'food'
  | 'transport'
  | 'tickets'
  | 'shopping'
  | 'other';

export type BudgetCategory = ExpenseCategory | 'total';

// Activity link type
export type ActivityLink = {
  url: string;
  label: string;
};
