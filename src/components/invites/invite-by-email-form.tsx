'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { emailInviteSchema, type EmailInviteInput } from '@/lib/validation/invite-schemas';
import { sendEmailInvite } from '@/lib/supabase/invites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface InviteByEmailFormProps {
  tripId: string;
  onSuccess?: () => void;
}

export function InviteByEmailForm({ tripId, onSuccess }: InviteByEmailFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EmailInviteInput>({
    resolver: zodResolver(emailInviteSchema),
    defaultValues: {
      tripId,
      email: '',
    },
  });

  async function onSubmit(data: EmailInviteInput) {
    setIsLoading(true);

    try {
      const result = await sendEmailInvite(data.tripId, data.email);

      if (result.error && !result.success) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.error) {
        // Partial success - invite created but email failed
        toast.warning(result.error);
      } else {
        toast.success('Convite enviado por email!');
      }

      form.reset();
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email do convidado
              </FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="amigo@email.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...field}
                  />
                  <Button type="submit" loading={isLoading} size="icon" className="shrink-0">
                    {!isLoading && <Send className="h-4 w-4" />}
                    <span className="sr-only">Enviar convite</span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
