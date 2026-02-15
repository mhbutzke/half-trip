import type { TripMemberRole } from '@/types/database';

export type TripReadinessKey = 'participants' | 'itinerary' | 'checklists' | 'budget';

export type TripReadinessItem = {
  key: TripReadinessKey;
  label: string;
  description: string;
  done: boolean;
  /** Optional helper text to clarify permissions (ex: participant can't define budget). */
  note?: string;
};

export type TripReadinessInput = {
  memberCount: number;
  activityCountTotal: number;
  checklistCount: number;
  budgetTotal: number | null;
  userRole: TripMemberRole | null;
};

export type TripReadiness = {
  total: number;
  completed: number;
  missing: number;
  score: number; // 0..100
  items: TripReadinessItem[];
  isReady: boolean;
};

export function computeTripReadiness(input: TripReadinessInput): TripReadiness {
  const participantsDone = input.memberCount >= 2;
  const itineraryDone = input.activityCountTotal > 0;
  const checklistsDone = input.checklistCount > 0;
  const budgetDone = input.budgetTotal != null;

  const items: TripReadinessItem[] = [
    {
      key: 'participants',
      label: 'Participantes',
      description: participantsDone ? 'Grupo definido' : 'Convide pelo menos mais 1 pessoa',
      done: participantsDone,
    },
    {
      key: 'itinerary',
      label: 'Roteiro',
      description: itineraryDone ? 'Roteiro iniciado' : 'Adicione a primeira atividade',
      done: itineraryDone,
    },
    {
      key: 'checklists',
      label: 'Checklists',
      description: checklistsDone
        ? 'Checklists criadas'
        : 'Crie um checklist (mala, tarefas, etc.)',
      done: checklistsDone,
    },
    {
      key: 'budget',
      label: 'Orçamento',
      description: budgetDone
        ? 'Orçamento total definido'
        : 'Defina um orçamento total para a viagem',
      done: budgetDone,
      note:
        !budgetDone && input.userRole !== 'organizer'
          ? 'Somente organizadores podem definir.'
          : undefined,
    },
  ];

  const total = items.length;
  const completed = items.filter((i) => i.done).length;
  const missing = total - completed;
  const score = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    missing,
    score,
    items,
    isReady: missing === 0,
  };
}
