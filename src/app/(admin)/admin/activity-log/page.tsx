import { Suspense } from 'react';
import { getAdminActivityLog } from '@/lib/supabase/admin-actions';
import { ActivityLogContent } from './activity-log-content';
import { Skeleton } from '@/components/ui/skeleton';

function ActivityLogSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function ActivityLogData() {
  const result = await getAdminActivityLog({ page: 0, pageSize: 20 });
  if (!result) return null;
  return <ActivityLogContent initialData={result} />;
}

export default function AdminActivityLogPage() {
  return (
    <Suspense fallback={<ActivityLogSkeleton />}>
      <ActivityLogData />
    </Suspense>
  );
}
