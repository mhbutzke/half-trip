import { Suspense } from 'react';
import { listAdmins } from '@/lib/supabase/admin-actions';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { AdminsContent } from './admins-content';
import { Skeleton } from '@/components/ui/skeleton';

function AdminsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function AdminsData() {
  const [auth, admins] = await Promise.all([requireAdmin(), listAdmins()]);

  if (!auth.ok || !admins) return null;

  return <AdminsContent admins={admins} adminRole={auth.adminRole} />;
}

export default function AdminAdminsPage() {
  return (
    <Suspense fallback={<AdminsSkeleton />}>
      <AdminsData />
    </Suspense>
  );
}
