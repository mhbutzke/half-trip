'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Plus, Search, Receipt, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FAB } from '@/components/ui/fab';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { DeleteExpenseDialog } from '@/components/expenses';
import { ExpenseDateGroup } from '@/components/expenses/expense-date-group';
import { expenseCategoryList, getCategoryInfo } from '@/lib/utils/expense-categories';
import { deleteExpense } from '@/lib/supabase/expenses';
import { formatAmount } from '@/lib/validation/expense-schemas';
import type { TripMemberWithUser } from '@/lib/supabase/trips';
import type { ExpenseWithDetails } from '@/types/expense';
import type { TripMemberRole, ExpenseCategory } from '@/types/database';
import { usePermissions } from '@/hooks/use-permissions';

const AddExpenseDialog = dynamic(
  () =>
    import('@/components/expenses/add-expense-dialog').then((mod) => ({
      default: mod.AddExpenseDialog,
    })),
  { ssr: false }
);

interface ExpensesListProps {
  tripId: string;
  baseCurrency: string;
  initialExpenses: ExpenseWithDetails[];
  members: TripMemberWithUser[];
  userRole: TripMemberRole | null;
  currentUserId: string;
}

type FilterCategory = ExpenseCategory | 'all';
type FilterPaidBy = string | 'all';

export function ExpensesList({
  tripId,
  baseCurrency,
  initialExpenses,
  members,
  userRole,
  currentUserId,
}: ExpensesListProps) {
  const router = useRouter();
  const permissions = usePermissions({ userRole, currentUserId });
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>(initialExpenses);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithDetails | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleExpenseAdded = () => {
    router.refresh();
  };

  const handlePullRefresh = async () => {
    router.refresh();
    // Small delay to let server re-fetch
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [paidByFilter, setPaidByFilter] = useState<FilterPaidBy>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  // Check if user can edit an expense
  const canEditExpense = (expense: ExpenseWithDetails) => {
    return permissions.canOnOwn('EDIT', expense.created_by);
  };

  // Handle edit expense via dialog
  const handleEditExpense = (expense: ExpenseWithDetails) => {
    setEditingExpense(expense);
  };

  // Handle expense deleted
  const handleExpenseDeleted = (expenseId: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
    setDeletingExpense(null);
  };

  const handleSwipeDelete = async (expense: ExpenseWithDetails) => {
    const result = await deleteExpense(expense.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Despesa excluída');
    handleExpenseDeleted(expense.id);
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = expense.description.toLowerCase().includes(query);
        const matchesNotes = expense.notes?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesNotes) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
        return false;
      }

      // Paid by filter
      if (paidByFilter !== 'all' && expense.paid_by !== paidByFilter) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, categoryFilter, paidByFilter]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (paidByFilter !== 'all') count++;
    return count;
  }, [categoryFilter, paidByFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setPaidByFilter('all');
  };

  // Calculate filtered total (converted to base currency)
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount * (expense.exchange_rate ?? 1),
      0
    );
  }, [filteredExpenses]);

  // Group expenses by date
  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, ExpenseWithDetails[]>();
    filteredExpenses.forEach((exp) => {
      const dateKey = exp.date;
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(exp);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredExpenses]);

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      {/* Controls */}
      <div className="space-y-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar despesa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter toggle button */}
          <Button
            variant={showFilters || activeFiltersCount > 0 ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
            aria-label="Alternar filtros"
          >
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge
                variant="default"
                className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px]"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {/* Add expense dialog */}
          <AddExpenseDialog
            tripId={tripId}
            members={members}
            currentUserId={currentUserId}
            baseCurrency={baseCurrency}
            onSuccess={handleExpenseAdded}
            trigger={
              <Button className="hidden sm:flex">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            }
          />
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
            {/* Category filter */}
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value as FilterCategory)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {expenseCategoryList.map((category) => {
                  const Icon = category.icon;
                  return (
                    <SelectItem key={category.value} value={category.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {category.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Paid by filter */}
            <Select
              value={paidByFilter}
              onValueChange={(value) => setPaidByFilter(value as FilterPaidBy)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Pago por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.users.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters button */}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-11 sm:h-9">
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>
        )}

        {/* Active filter badges */}
        {(categoryFilter !== 'all' || paidByFilter !== 'all') && !showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {categoryFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => setCategoryFilter('all')}
              >
                {getCategoryInfo(categoryFilter).label}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {paidByFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => setPaidByFilter('all')}
              >
                {members.find((m) => m.user_id === paidByFilter)?.users.name || 'Desconhecido'}
                <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredExpenses.length === expenses.length
            ? `${expenses.length} ${expenses.length === 1 ? 'despesa' : 'despesas'}`
            : `${filteredExpenses.length} de ${expenses.length} ${expenses.length === 1 ? 'despesa' : 'despesas'}`}
        </span>
        {filteredExpenses.length > 0 && filteredExpenses.length !== expenses.length && (
          <span className="font-medium text-foreground">
            {formatAmount(filteredTotal, baseCurrency)}
          </span>
        )}
      </div>

      {/* Expenses list */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold">
            {expenses.length === 0 ? 'Nenhuma despesa' : 'Nenhuma despesa encontrada'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {expenses.length === 0
              ? 'Adicione a primeira despesa da viagem'
              : 'Tente ajustar os filtros de busca'}
          </p>
          {expenses.length === 0 && (
            <AddExpenseDialog
              tripId={tripId}
              members={members}
              currentUserId={currentUserId}
              baseCurrency={baseCurrency}
              onSuccess={handleExpenseAdded}
              trigger={
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar primeira despesa
                </Button>
              }
            />
          )}
          {expenses.length > 0 && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedExpenses.map(([date, dateExpenses]) => (
            <ExpenseDateGroup
              key={date}
              date={date}
              expenses={dateExpenses}
              baseCurrency={baseCurrency}
              canEditExpense={canEditExpense}
              onEdit={handleEditExpense}
              onDelete={(exp) => setDeletingExpense(exp)}
              onSwipeDelete={handleSwipeDelete}
            />
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      {expenses.length > 0 && (
        <FAB icon={Plus} label="Adicionar despesa" onClick={() => setIsAddOpen(true)} />
      )}

      <AddExpenseDialog
        tripId={tripId}
        members={members}
        currentUserId={currentUserId}
        baseCurrency={baseCurrency}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleExpenseAdded}
      />

      {/* Edit expense dialog */}
      {editingExpense && (
        <AddExpenseDialog
          tripId={tripId}
          members={members}
          currentUserId={currentUserId}
          baseCurrency={baseCurrency}
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSuccess={handleExpenseAdded}
        />
      )}

      {/* Delete confirmation dialog */}
      <DeleteExpenseDialog
        expense={deletingExpense}
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        onExpenseDeleted={handleExpenseDeleted}
      />
    </PullToRefresh>
  );
}
