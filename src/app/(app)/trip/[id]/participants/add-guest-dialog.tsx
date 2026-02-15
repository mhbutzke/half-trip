'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { addGuest } from '@/lib/supabase/participants';

interface AddGuestDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddGuestDialog({ tripId, open, onOpenChange }: AddGuestDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Informe o nome do convidado');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addGuest(tripId, trimmedName, email.trim() || undefined);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`${trimmedName} adicionado como convidado`);
      setName('');
      setEmail('');
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Erro ao adicionar convidado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Adicionar Convidado
          </DialogTitle>
          <DialogDescription>
            Adicione alguém que não tem conta no Half Trip. Convidados participam das despesas
            normalmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guest-name"
              placeholder="Ex: Maria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-email">Email (opcional)</Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="maria@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Se informado, quando essa pessoa criar uma conta com este email, o histórico será
              vinculado automaticamente.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
