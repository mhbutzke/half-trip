import { notFound } from 'next/navigation';
import { getUserDetail } from '@/lib/supabase/admin-actions';
import { UserDetailContent } from './user-detail-content';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const user = await getUserDetail(id);

  if (!user) {
    notFound();
  }

  return <UserDetailContent user={user} />;
}
