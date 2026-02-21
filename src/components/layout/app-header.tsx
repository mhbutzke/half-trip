'use client';

import { useRouter } from 'next/navigation';
import { Header } from './header';
import { signOutWithoutRedirect } from '@/lib/supabase/auth';
import { cleanupOnLogout } from '@/lib/auth/logout';
import { createClient } from '@/lib/supabase/client';

interface AppHeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  } | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    // 1. Clean up local caches (IndexedDB, localStorage, SW)
    await cleanupOnLogout();

    // 2. Sign out on the server (clear server-side session cookies)
    await signOutWithoutRedirect();

    // 3. Sign out on the browser client (clear client-side auth state)
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Don't block redirect if browser signout fails
    }

    // 4. Redirect to login page from the client
    router.push('/login');
    router.refresh();
  };

  return <Header user={user} onSignOut={handleSignOut} />;
}
