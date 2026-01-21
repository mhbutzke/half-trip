import { redirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { ProfileForm } from '@/components/profile/profile-form';
import { getUserProfile } from '@/lib/supabase/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Configurações | Half Trip',
  description: 'Gerencie suas configurações de perfil',
};

export default async function SettingsPage() {
  const user = await getUserProfile();

  if (!user) {
    redirect('/login');
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações de perfil e preferências.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Suas informações pessoais visíveis para outros participantes das viagens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
