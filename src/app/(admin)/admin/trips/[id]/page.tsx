import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTripDetail } from '@/lib/supabase/admin-actions';
import { TripDetailContent } from './trip-detail-content';
import { Skeleton } from '@/components/ui/skeleton';

function TripDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-72" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function TripDetailData({ id }: { id: string }) {
  const trip = await getTripDetail(id);
  if (!trip) notFound();
  return <TripDetailContent trip={trip} />;
}

export default async function AdminTripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<TripDetailSkeleton />}>
      <TripDetailData id={id} />
    </Suspense>
  );
}
