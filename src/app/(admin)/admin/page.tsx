import { Suspense } from 'react';
import { getSystemStats } from '@/lib/supabase/admin-actions';
import { DashboardContent } from './dashboard-content';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function DashboardData() {
  const stats = await getSystemStats();
  if (!stats) return null;
  return <DashboardContent stats={stats} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
