'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { PageContainer } from '@/components/layout/page-container';
import { Plane } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TripsList } from './trips-list';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyTripsIllustration } from '@/components/illustrations';

// Lazy load the create trip dialog - only needed when user clicks create
const CreateTripDialog = dynamic(() =>
  import('@/components/trips/create-trip-dialog').then((mod) => ({ default: mod.CreateTripDialog }))
);

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

function TripsEmptyState() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <>
      <EmptyState
        icon={Plane}
        title="Nenhuma viagem ainda"
        description="Crie sua primeira viagem para começar a planejar com seu grupo e dividir despesas de forma justa"
        illustration={<EmptyTripsIllustration className="size-20" />}
        action={{
          label: 'Criar primeira viagem',
          onClick: () => setCreateDialogOpen(true),
        }}
        tips={[
          'Convide amigos pelo e-mail após criar a viagem',
          'Defina a moeda base para facilitar a divisão de despesas',
        ]}
      />
      <CreateTripDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
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
          <TripsList emptyState={<TripsEmptyState />} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
