'use client';

import { useRouter } from 'next/navigation';
import { Header } from './header';
import { signOut } from '@/lib/supabase/auth';

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
    await signOut();
    router.refresh();
  };

  return <Header user={user} onSignOut={handleSignOut} />;
}
