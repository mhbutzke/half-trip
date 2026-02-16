import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';
import { PageContainer } from '@/components/layout/page-container';
import { ProfileForm } from '@/components/profile/profile-form';
import { PasswordChangeForm } from '@/components/settings/password-change-form';
import { DangerZone } from '@/components/settings/danger-zone';
import { GoogleCalendarSettings } from '@/components/settings/google-calendar-settings';
import { EmailPreferencesForm } from '@/components/settings/email-preferences-form';
import { getUserProfile } from '@/lib/supabase/profile';
import { getGoogleCalendarConnectionStatus } from '@/lib/supabase/google-calendar';
import { getUserEmailPreferences } from '@/lib/supabase/email-preferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Configurações | Half Trip',
  description: 'Gerencie suas configurações de perfil',
};

interface SettingsPageProps {
  searchParams: Promise<{
    google_calendar?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [
    { google_calendar: googleCalendarStatus },
    user,
    googleCalendarConnection,
    emailPreferences,
  ] = await Promise.all([
    searchParams,
    getUserProfile(),
    getGoogleCalendarConnectionStatus(),
    getUserEmailPreferences(),
  ]);

  if (!user) {
    redirect(routes.login());
  }

  return (
    <PageContainer bottomNav>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações de perfil e preferências.
          </p>
          {googleCalendarStatus === 'connected' && (
            <p className="mt-2 text-sm text-emerald-600">Google Agenda conectado com sucesso.</p>
          )}
          {googleCalendarStatus === 'error' && (
            <p className="mt-2 text-sm text-destructive">
              Não foi possível conectar com o Google Agenda. Tente novamente.
            </p>
          )}
          {googleCalendarStatus === 'missing_env' && (
            <p className="mt-2 text-sm text-destructive">
              Integração indisponível: faltam variáveis Google OAuth no ambiente.
            </p>
          )}
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

        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
            <CardDescription>
              Conecte serviços externos para automatizar seu roteiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleCalendarSettings
              connected={googleCalendarConnection.connected}
              googleEmail={googleCalendarConnection.googleEmail}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações por Email</CardTitle>
            <CardDescription>Gerencie quais emails você deseja receber.</CardDescription>
          </CardHeader>
          <CardContent>
            {emailPreferences ? (
              <EmailPreferencesForm preferences={emailPreferences} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Erro ao carregar preferências de email.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Altere sua senha de acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de perigo</CardTitle>
            <CardDescription>
              Ações irreversíveis que afetam permanentemente sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <DangerZone userEmail={user.email} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
