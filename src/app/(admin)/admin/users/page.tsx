import { Suspense } from 'react';
import { listUsers } from '@/lib/supabase/admin-actions';
import { UsersContent } from './users-content';
import UsersLoading from './loading';

async function UsersData() {
  const result = await listUsers({ page: 0, pageSize: 20 });
  if (!result) return null;
  return <UsersContent initialData={result} />;
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<UsersLoading />}>
      <UsersData />
    </Suspense>
  );
}
