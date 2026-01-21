import { ExpensesSkeleton } from './expenses-skeleton';
import { PageContainer } from '@/components/layout/page-container';

export default function ExpensesLoading() {
  return (
    <PageContainer>
      <ExpensesSkeleton />
    </PageContainer>
  );
}
