import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getInviteDetails } from '@/lib/supabase/invites';
import { createClient } from '@/lib/supabase/server';
import { InviteContent } from './invite-content';
import { InviteSkeleton } from './invite-skeleton';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

async function InvitePageContent({ code }: { code: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inviteDetails = await getInviteDetails(code);

  if (!inviteDetails.valid && !inviteDetails.error) {
    notFound();
  }

  return (
    <InviteContent
      code={code}
      inviteDetails={inviteDetails}
      isLoggedIn={!!user}
      currentUserName={user?.user_metadata?.name}
    />
  );
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<InviteSkeleton />}>
        <InvitePageContent code={code} />
      </Suspense>
    </div>
  );
}
