import { PageContainer } from '@/components/layout/page-container';
import { ExpensesSkeleton } from './expenses-skeleton';

export default function Loading() {
  return (
    <PageContainer>
      <ExpensesSkeleton />
    </PageContainer>
  );
}
