'use client';

/**
 * Notification Settings
 *
 * Component for managing notification preferences
 */

import { useNotificationStore } from '@/lib/notifications/notification-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: NotificationSettingsDialogProps) {
  const settings = useNotificationStore((state) => state.settings);
  const updateSettings = useNotificationStore((state) => state.updateSettings);

  const handleSave = () => {
    toast.success('Configurações salvas', {
      description: 'Suas preferências de notificação foram atualizadas',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Notificações</DialogTitle>
          <DialogDescription>Escolha quais notificações você deseja receber</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Global toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-base font-semibold">
                Habilitar notificações
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar todas as notificações
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            />
          </div>

          <Separator />

          {/* Expense notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Despesas</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="expenseAdded" className="font-normal">
                  Nova despesa adicionada
                </Label>
                <Switch
                  id="expenseAdded"
                  checked={settings.expenseAdded}
                  onCheckedChange={(checked) => updateSettings({ expenseAdded: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="expenseUpdated" className="font-normal">
                  Despesa atualizada
                </Label>
                <Switch
                  id="expenseUpdated"
                  checked={settings.expenseUpdated}
                  onCheckedChange={(checked) => updateSettings({ expenseUpdated: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="expenseDeleted" className="font-normal">
                  Despesa removida
                </Label>
                <Switch
                  id="expenseDeleted"
                  checked={settings.expenseDeleted}
                  onCheckedChange={(checked) => updateSettings({ expenseDeleted: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Participant notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Participantes</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="participantJoined" className="font-normal">
                  Novo participante entrou
                </Label>
                <Switch
                  id="participantJoined"
                  checked={settings.participantJoined}
                  onCheckedChange={(checked) => updateSettings({ participantJoined: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="participantLeft" className="font-normal">
                  Participante saiu/removido
                </Label>
                <Switch
                  id="participantLeft"
                  checked={settings.participantLeft}
                  onCheckedChange={(checked) => updateSettings({ participantLeft: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Atividades</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="activityAdded" className="font-normal">
                  Nova atividade adicionada
                </Label>
                <Switch
                  id="activityAdded"
                  checked={settings.activityAdded}
                  onCheckedChange={(checked) => updateSettings({ activityAdded: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="activityUpdated" className="font-normal">
                  Atividade atualizada
                </Label>
                <Switch
                  id="activityUpdated"
                  checked={settings.activityUpdated}
                  onCheckedChange={(checked) => updateSettings({ activityUpdated: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="activityDeleted" className="font-normal">
                  Atividade removida
                </Label>
                <Switch
                  id="activityDeleted"
                  checked={settings.activityDeleted}
                  onCheckedChange={(checked) => updateSettings({ activityDeleted: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Note notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Anotações</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="noteAdded" className="font-normal">
                  Nova anotação adicionada
                </Label>
                <Switch
                  id="noteAdded"
                  checked={settings.noteAdded}
                  onCheckedChange={(checked) => updateSettings({ noteAdded: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="noteUpdated" className="font-normal">
                  Anotação atualizada
                </Label>
                <Switch
                  id="noteUpdated"
                  checked={settings.noteUpdated}
                  onCheckedChange={(checked) => updateSettings({ noteUpdated: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Settlement notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Pagamentos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="settlementMarkPaid" className="font-normal">
                  Pagamento marcado/desmarcado
                </Label>
                <Switch
                  id="settlementMarkPaid"
                  checked={settings.settlementMarkPaid}
                  onCheckedChange={(checked) => updateSettings({ settlementMarkPaid: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Other notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Outros</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tripUpdated" className="font-normal">
                  Viagem atualizada
                </Label>
                <Switch
                  id="tripUpdated"
                  checked={settings.tripUpdated}
                  onCheckedChange={(checked) => updateSettings({ tripUpdated: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="inviteAccepted" className="font-normal">
                  Convite aceito
                </Label>
                <Switch
                  id="inviteAccepted"
                  checked={settings.inviteAccepted}
                  onCheckedChange={(checked) => updateSettings({ inviteAccepted: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncCompleted" className="font-normal">
                  Sincronização concluída
                </Label>
                <Switch
                  id="syncCompleted"
                  checked={settings.syncCompleted}
                  onCheckedChange={(checked) => updateSettings({ syncCompleted: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncFailed" className="font-normal">
                  Erro na sincronização
                </Label>
                <Switch
                  id="syncFailed"
                  checked={settings.syncFailed}
                  onCheckedChange={(checked) => updateSettings({ syncFailed: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
