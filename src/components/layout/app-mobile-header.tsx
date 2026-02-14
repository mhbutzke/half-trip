'use client';

import { useRouter } from 'next/navigation';
import { MobileHeader } from './mobile-header';
import { signOut } from '@/lib/supabase/auth';

interface AppMobileHeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  } | null;
}

export function AppMobileHeader({ user }: AppMobileHeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return <MobileHeader user={user} onSignOut={handleSignOut} />;
}
