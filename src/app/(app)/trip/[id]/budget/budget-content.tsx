'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyBudgetIllustration } from '@/components/illustrations';
import { BudgetSummaryCard } from '@/components/budget/budget-summary';
import { BudgetCategoryCard } from '@/components/budget/budget-category-card';
import { BudgetFormDialog } from '@/components/budget/budget-form-dialog';
import { DeleteBudgetDialog } from '@/components/budget/delete-budget-dialog';
import type { BudgetSummary, BudgetWithSpending, TripBudget } from '@/types/budget';

interface BudgetContentProps {
  tripId: string;
  initialSummary: BudgetSummary;
  allBudgets: TripBudget[];
  isOrganizer: boolean;
}

export function BudgetContent({
  tripId,
  initialSummary,
  allBudgets,
  isOrganizer,
}: BudgetContentProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetWithSpending | TripBudget | null>(null);
  const [deleteBudgetItem, setDeleteBudgetItem] = useState<BudgetWithSpending | TripBudget | null>(
    null
  );

  const existingCategories = allBudgets.map((b) => b.category);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleEdit = (budget: BudgetWithSpending) => {
    setEditBudget(budget);
    setIsFormOpen(true);
  };

  const handleDelete = (budget: BudgetWithSpending) => {
    setDeleteBudgetItem(budget);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditBudget(null);
  };

  // Find total budget entry for display
  const totalBudgetEntry = allBudgets.find((b) => b.category === 'total');
  const totalBudgetWithSpending: BudgetWithSpending | null = totalBudgetEntry
    ? {
        ...totalBudgetEntry,
        spent: initialSummary.totalSpent,
        remaining: totalBudgetEntry.amount - initialSummary.totalSpent,
        percentage:
          totalBudgetEntry.amount > 0
            ? (initialSummary.totalSpent / totalBudgetEntry.amount) * 100
            : 0,
        status:
          totalBudgetEntry.amount > 0 && initialSummary.totalSpent / totalBudgetEntry.amount >= 1
            ? 'exceeded'
            : totalBudgetEntry.amount > 0 &&
                initialSummary.totalSpent / totalBudgetEntry.amount >= 0.8
              ? 'warning'
              : 'safe',
      }
    : null;

  const hasAnyBudget = allBudgets.length > 0;

  return (
    <>
      {!hasAnyBudget ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum orçamento definido"
          description="Defina limites de gastos para acompanhar o orçamento da viagem."
          illustration={<EmptyBudgetIllustration className="size-20" />}
          action={
            isOrganizer
              ? { label: 'Definir orçamento', onClick: () => setIsFormOpen(true) }
              : undefined
          }
          tips={[
            'Defina um orçamento total e por categoria para melhor controle',
            'Acompanhe os alertas quando estiver perto do limite',
          ]}
        />
      ) : (
        <div className="space-y-4">
          {isOrganizer && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Adicionar categoria
              </Button>
            </div>
          )}

          <BudgetSummaryCard summary={initialSummary} />

          {totalBudgetWithSpending && (
            <BudgetCategoryCard
              budget={totalBudgetWithSpending}
              isOrganizer={isOrganizer}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {initialSummary.categoryBudgets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Por categoria</h3>
              {initialSummary.categoryBudgets.map((budget) => (
                <BudgetCategoryCard
                  key={budget.id}
                  budget={budget}
                  isOrganizer={isOrganizer}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <BudgetFormDialog
        tripId={tripId}
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        editBudget={editBudget}
        existingCategories={existingCategories}
        onSuccess={refresh}
      />

      <DeleteBudgetDialog
        budget={deleteBudgetItem}
        open={!!deleteBudgetItem}
        onOpenChange={(open) => {
          if (!open) setDeleteBudgetItem(null);
        }}
        onSuccess={refresh}
      />
    </>
  );
}
