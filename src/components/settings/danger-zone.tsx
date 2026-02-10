'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteAccount } from '@/lib/supabase/account';

interface DangerZoneProps {
  userEmail: string;
}

export function DangerZone({ userEmail }: DangerZoneProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [open, setOpen] = useState(false);

  const canDelete = confirmText === userEmail;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);

    try {
      const result = await deleteAccount();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Conta excluída com sucesso');
      router.push('/login');
    } catch {
      toast.error('Erro ao excluir conta');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Excluir conta permanentemente</p>
          <p className="text-sm text-muted-foreground">
            Ao excluir sua conta, todos os seus dados serão removidos permanentemente. Viagens que
            você criou serão transferidas para outro organizador, se houver, ou excluídas.
          </p>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Excluir minha conta
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá
              todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Digite <strong>{userEmail}</strong> para confirmar:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={userEmail}
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmText('');
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete}
              loading={isDeleting}
            >
              Excluir conta
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
