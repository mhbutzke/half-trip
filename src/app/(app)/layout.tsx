import { AppHeader } from '@/components/layout/app-header';
import { AppMobileHeader } from '@/components/layout/app-mobile-header';
import { AnimatedPage } from '@/components/layout/animated-page';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SkipNav } from '@/components/layout/skip-nav';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { OfflineIndicator } from '@/components/offline';
import { NotificationToastListener } from '@/components/notifications';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

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
      .select('name, email, avatar_url, blocked_at')
      .eq('id', authUser.id)
      .single();

    // Block active sessions of suspended users
    if (profile?.blocked_at) {
      await supabase.auth.signOut();
      redirect(routes.login());
    }

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
    <div className="flex min-h-svh flex-col overflow-x-hidden">
      <SkipNav />
      {/* Desktop header */}
      <div className="hidden md:block">
        <AppHeader user={user} />
      </div>
      {/* Mobile header */}
      <AppMobileHeader user={user} />
      <OfflineIndicator />
      {/* Main content with bottom padding for mobile nav */}
      <main id="main-content" className="flex-1 pb-24 md:pb-0">
        <AnimatedPage>{children}</AnimatedPage>
      </main>
      {/* Scroll-to-top button (mobile only) */}
      <ScrollToTop />
      {/* Mobile bottom navigation - auto-detects trip context */}
      <MobileNav />
      {/* Notification toast listener */}
      <NotificationToastListener />
    </div>
  );
}
