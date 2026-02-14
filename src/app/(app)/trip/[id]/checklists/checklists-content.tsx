'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FAB } from '@/components/ui/fab';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyChecklistsIllustration } from '@/components/illustrations';
import { ChecklistCard } from '@/components/checklists/checklist-card';
import { ChecklistFormDialog } from '@/components/checklists/checklist-form-dialog';
import { DeleteChecklistDialog } from '@/components/checklists/delete-checklist-dialog';
import type { ChecklistWithItems } from '@/types/checklist';

interface ChecklistsContentProps {
  tripId: string;
  initialChecklists: ChecklistWithItems[];
  isOrganizer: boolean;
  currentUserId: string;
}

export function ChecklistsContent({
  tripId,
  initialChecklists,
  isOrganizer,
  currentUserId,
}: ChecklistsContentProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistWithItems | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      {initialChecklists.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma checklist criada"
          description="Crie listas de bagagem, tarefas ou compras para a viagem."
          illustration={<EmptyChecklistsIllustration className="size-20" />}
          action={{ label: 'Criar checklist', onClick: () => setIsFormOpen(true) }}
          tips={[
            'Crie listas separadas para bagagem, documentos e compras',
            'Atribua itens a membros específicos do grupo',
          ]}
        />
      ) : (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nova checklist
            </Button>
          </div>

          {initialChecklists.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              isOrganizer={isOrganizer}
              currentUserId={currentUserId}
              onDelete={setDeleteTarget}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <ChecklistFormDialog
        tripId={tripId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={refresh}
      />

      <DeleteChecklistDialog
        checklist={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={refresh}
      />

      {/* Mobile FAB */}
      <FAB icon={Plus} label="Nova checklist" onClick={() => setIsFormOpen(true)} />
    </>
  );
}
