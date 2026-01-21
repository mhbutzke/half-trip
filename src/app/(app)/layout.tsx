import { AppHeader } from '@/components/layout/app-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Get user profile from database
  let user = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from('users')
      .select('name, email, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      user = {
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar_url || undefined,
      };
    } else {
      // Fallback to auth user data if profile not found
      user = {
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar: authUser.user_metadata?.avatar_url,
      };
    }
  }

  return (
    <div className="min-h-svh flex flex-col">
      <AppHeader user={user} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
