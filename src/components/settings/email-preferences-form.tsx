'use client';

import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateUserEmailPreferences } from '@/lib/supabase/email-preferences';
import {
  emailPreferencesSchema,
  type EmailPreferencesFormData,
} from '@/lib/validation/email-schemas';
import type { UserEmailPreferences } from '@/types/email';

interface EmailPreferencesFormProps {
  preferences: UserEmailPreferences;
}

const EMAIL_TYPES = [
  {
    id: 'inviteEmails' as const,
    label: 'Convites para viagens',
    description: 'Receber emails quando for convidado para uma viagem',
  },
  {
    id: 'tripReminderEmails' as const,
    label: 'Lembretes de viagem',
    description: 'Receber lembrete 3 dias antes da viagem começar',
  },
  {
    id: 'dailySummaryEmails' as const,
    label: 'Resumos diários',
    description: 'Receber resumo diário durante viagens ativas',
  },
  {
    id: 'welcomeEmails' as const,
    label: 'Email de boas-vindas',
    description: 'Receber email de boas-vindas ao criar conta',
  },
] as const;

export function EmailPreferencesForm({ preferences }: EmailPreferencesFormProps) {
  const [isPending, startTransition] = useTransition();

  const { control, handleSubmit, setValue } = useForm<EmailPreferencesFormData>({
    resolver: zodResolver(emailPreferencesSchema),
    defaultValues: {
      inviteEmails: preferences.inviteEmails,
      tripReminderEmails: preferences.tripReminderEmails,
      dailySummaryEmails: preferences.dailySummaryEmails,
      welcomeEmails: preferences.welcomeEmails,
    },
  });
  const watchedValues = useWatch({ control });

  const onSubmit = (data: EmailPreferencesFormData) => {
    startTransition(async () => {
      const result = await updateUserEmailPreferences(data);

      if (result.success) {
        toast.success('Preferências atualizadas com sucesso');
      } else {
        toast.error(result.error || 'Erro ao atualizar preferências');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {EMAIL_TYPES.map((type) => (
          <div key={type.id} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={type.id}>{type.label}</Label>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </div>
            <Switch
              id={type.id}
              checked={watchedValues[type.id]}
              onCheckedChange={(checked) => setValue(type.id, checked)}
              disabled={isPending}
              aria-label={type.label}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar preferências'}
      </Button>
    </form>
  );
}
