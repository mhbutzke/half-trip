import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripNotes } from '@/lib/supabase/notes';
import { PageContainer } from '@/components/layout/page-container';
import { NotesHeader } from './notes-header';
import { NotesList } from './notes-list';
import { NotesSkeleton } from './notes-skeleton';

interface NotesPageProps {
  params: Promise<{ id: string }>;
}

async function NotesContent({ tripId }: { tripId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [trip, notes, userRole] = await Promise.all([
    getTripById(tripId),
    getTripNotes(tripId),
    getUserRoleInTrip(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <NotesHeader tripId={tripId} tripName={trip.name} />
      <NotesList tripId={tripId} initialNotes={notes} userRole={userRole} currentUserId={user.id} />
    </div>
  );
}

export default async function NotesPage({ params }: NotesPageProps) {
  const { id } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<NotesSkeleton />}>
        <NotesContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
