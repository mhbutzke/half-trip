import { Suspense } from 'react';
import { listTrips } from '@/lib/supabase/admin-actions';
import { TripsContent } from './trips-content';
import TripsLoading from './loading';

async function TripsData() {
  const result = await listTrips({ page: 0, pageSize: 20 });
  if (!result) return null;
  return <TripsContent initialData={result} />;
}

export default function AdminTripsPage() {
  return (
    <Suspense fallback={<TripsLoading />}>
      <TripsData />
    </Suspense>
  );
}
