import { redirect } from 'next/navigation';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { UnsubscribeForm } from '@/components/email/unsubscribe-form';

export const metadata = {
  title: 'Cancelar Inscrição | Half Trip',
  description: 'Gerencie suas preferências de email',
};

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  invite: 'Convites para viagens',
  trip_reminder: 'Lembretes de viagem',
  daily_summary: 'Resumos diários',
  welcome: 'Emails de boas-vindas',
  all: 'Todos os emails',
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect('/');
  }

  const payload = verifyUnsubscribeToken(token);

  if (!payload) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-bold">Link Inválido</h1>
        <p className="mt-4 text-muted-foreground">
          Este link de cancelamento de inscrição é inválido ou expirou.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold">Cancelar Inscrição</h1>
      <p className="mt-4 text-muted-foreground">
        Você está cancelando a inscrição de emails do tipo:{' '}
        <strong>{EMAIL_TYPE_LABELS[payload.emailType] || payload.emailType}</strong>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Email: {payload.email}</p>

      <UnsubscribeForm payload={payload} />
    </div>
  );
}
