'use client';

import { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ExpenseCard,
  AddExpenseSheet,
  EditExpenseSheet,
  DeleteExpenseDialog,
} from '@/components/expenses';
import type { ExpenseWithDetails } from '@/lib/supabase/expenses';
import type { TripMemberWithUser } from '@/lib/supabase/trips';
import type { TripMemberRole } from '@/types/database';

interface ExpensesListProps {
  tripId: string;
  initialExpenses: ExpenseWithDetails[];
  members: TripMemberWithUser[];
  userRole: TripMemberRole | null;
  currentUserId: string;
}

export function ExpensesList({
  tripId,
  initialExpenses,
  members,
  userRole,
  currentUserId,
}: ExpensesListProps) {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>(initialExpenses);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithDetails | null>(null);

  const handleExpenseCreated = (newExpense: ExpenseWithDetails) => {
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const handleExpenseUpdated = (updatedExpense: ExpenseWithDetails) => {
    setExpenses((prev) =>
      prev.map((expense) => (expense.id === updatedExpense.id ? updatedExpense : expense))
    );
    setEditingExpense(null);
  };

  const handleExpenseDeleted = (expenseId: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
    setDeletingExpense(null);
  };

  const canEditExpense = (expense: ExpenseWithDetails) => {
    return userRole === 'organizer' || expense.created_by === currentUserId;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {expenses.length === 0
            ? 'Nenhuma despesa registrada'
            : `${expenses.length} ${expenses.length === 1 ? 'despesa' : 'despesas'}`}
        </p>
        <AddExpenseSheet
          tripId={tripId}
          members={members}
          currentUserId={currentUserId}
          onExpenseCreated={handleExpenseCreated}
        />
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold">Nenhuma despesa</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre os gastos da viagem para dividir no final
          </p>
          <AddExpenseSheet
            tripId={tripId}
            members={members}
            currentUserId={currentUserId}
            onExpenseCreated={handleExpenseCreated}
            trigger={
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeira despesa
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              canEdit={canEditExpense(expense)}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => setDeletingExpense(expense)}
            />
          ))}
        </div>
      )}

      <EditExpenseSheet
        expense={editingExpense}
        members={members}
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
        onExpenseUpdated={handleExpenseUpdated}
      />

      <DeleteExpenseDialog
        expense={deletingExpense}
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        onExpenseDeleted={handleExpenseDeleted}
      />
    </>
  );
}
