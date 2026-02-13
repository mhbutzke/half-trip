import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripChecklists } from '@/lib/supabase/checklists';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { ChecklistsContent } from './checklists-content';
import ChecklistsLoading from './loading';
import { routes } from '@/lib/routes';

interface ChecklistsPageProps {
  params: Promise<{ id: string }>;
}

async function ChecklistsPageContent({ tripId }: { tripId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login());
  }

  const [trip, checklists, userRole] = await Promise.all([
    getTripById(tripId),
    getTripChecklists(tripId),
    getUserRoleInTrip(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
            <Link href={routes.trip.overview(tripId)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{trip.name}</span>
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklists</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Organize itens e tarefas da viagem</span>
          </div>
        </div>
      </div>

      <ChecklistsContent
        tripId={tripId}
        initialChecklists={checklists}
        isOrganizer={userRole === 'organizer'}
        currentUserId={user.id}
      />
    </div>
  );
}

export default async function ChecklistsPage({ params }: ChecklistsPageProps) {
  const { id } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<ChecklistsLoading />}>
        <ChecklistsPageContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
