import { Suspense } from 'react';
import { listExpenses } from '@/lib/supabase/admin-actions';
import { ExpensesContent } from './expenses-content';
import ExpensesLoading from './loading';

async function ExpensesData() {
  const result = await listExpenses({ page: 0, pageSize: 20 });
  if (!result) return null;
  return <ExpensesContent initialData={result} />;
}

export default function AdminExpensesPage() {
  return (
    <Suspense fallback={<ExpensesLoading />}>
      <ExpensesData />
    </Suspense>
  );
}
