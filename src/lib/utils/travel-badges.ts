export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface BadgeInput {
  tripCount: number;
  totalExpenses: number;
  hasReceipt: boolean;
  budgetKept: boolean;
  checklistComplete: boolean;
  participantCount: number;
  activitiesCount: number;
  daysCount: number;
}

const BADGE_DEFINITIONS: Array<{
  badge: Badge;
  condition: (input: BadgeInput) => boolean;
}> = [
  {
    badge: {
      id: 'first_trip',
      name: 'Primeira Viagem',
      description: 'Completou sua primeira viagem no Half Trip',
      emoji: '🎉',
    },
    condition: (i) => i.tripCount >= 1,
  },
  {
    badge: {
      id: 'budget_master',
      name: 'Budget Master',
      description: 'Não estourou o orçamento da viagem',
      emoji: '💰',
    },
    condition: (i) => i.budgetKept,
  },
  {
    badge: {
      id: 'receipt_collector',
      name: 'Coletor de Recibos',
      description: 'Anexou pelo menos um comprovante',
      emoji: '🧾',
    },
    condition: (i) => i.hasReceipt,
  },
  {
    badge: {
      id: 'planner',
      name: 'Organizador',
      description: 'Planejou 10 ou mais atividades',
      emoji: '📋',
    },
    condition: (i) => i.activitiesCount >= 10,
  },
  {
    badge: {
      id: 'big_group',
      name: 'Turma Grande',
      description: 'Viajou com 5 ou mais pessoas',
      emoji: '👥',
    },
    condition: (i) => i.participantCount >= 5,
  },
  {
    badge: {
      id: 'checklist_done',
      name: 'Checklist Completo',
      description: 'Completou 100% dos itens de checklist',
      emoji: '✅',
    },
    condition: (i) => i.checklistComplete,
  },
  {
    badge: {
      id: 'frequent_traveler',
      name: 'Viajante Frequente',
      description: 'Completou 5 ou mais viagens',
      emoji: '✈️',
    },
    condition: (i) => i.tripCount >= 5,
  },
  {
    badge: {
      id: 'long_trip',
      name: 'Maratonista',
      description: 'Viagem de 10 dias ou mais',
      emoji: '🏃',
    },
    condition: (i) => i.daysCount >= 10,
  },
  {
    badge: {
      id: 'expense_tracker',
      name: 'Contador',
      description: 'Registrou 20 ou mais despesas',
      emoji: '🔢',
    },
    condition: (i) => i.totalExpenses >= 20,
  },
];

export function computeBadges(input: BadgeInput): Badge[] {
  return BADGE_DEFINITIONS.filter(({ condition }) => condition(input)).map(({ badge }) => badge);
}

export function getAllBadges(): Badge[] {
  return BADGE_DEFINITIONS.map(({ badge }) => badge);
}
