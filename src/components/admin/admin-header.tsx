'use client';

import { Badge } from '@/components/ui/badge';
import { AdminMobileSidebar } from './admin-sidebar';
import type { SystemAdminRole } from '@/types/database';

interface AdminHeaderProps {
  user: { id: string; email: string };
  adminRole: SystemAdminRole;
}

export function AdminHeader({ user, adminRole }: AdminHeaderProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
      <AdminMobileSidebar adminRole={adminRole} />

      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Painel Admin</h1>
        <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
          {adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
        </Badge>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
      </div>
    </header>
  );
}
