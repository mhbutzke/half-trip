import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { routes } from '@/lib/routes';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    redirect(routes.trips());
  }

  return (
    <div className="flex min-h-svh">
      <AdminSidebar adminRole={auth.adminRole} />
      <div className="flex flex-1 flex-col">
        <AdminHeader user={auth.user} adminRole={auth.adminRole} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
