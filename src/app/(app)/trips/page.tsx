import { Suspense } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Plane } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TripsList } from './trips-list';
import { CreateTripDialog } from '@/components/trips/create-trip-dialog';

function TripsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-20 mb-2" />
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex -space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Plane className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">Nenhuma viagem ainda</CardTitle>
        <CardDescription>
          Crie sua primeira viagem para começar a planejar com seu grupo
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <CreateTripDialog />
      </CardContent>
    </Card>
  );
}

export default function TripsPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Minhas Viagens</h1>
          <CreateTripDialog />
        </div>

        <Suspense fallback={<TripsLoading />}>
          <TripsList emptyState={<EmptyState />} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
