export interface TripRecapInput {
  trip: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    baseCurrency: string;
  };
  expenses: Array<{
    amount: number;
    category: string;
    paidByName: string;
    exchangeRate: number;
  }>;
  participants: Array<{
    name: string;
    avatar: string | null;
  }>;
  activitiesCount: number;
  checklistCompletionPercent: number;
}

export interface TripRecapData {
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  durationDays: number;
  participantCount: number;
  totalSpent: number;
  expenseCount: number;
  averagePerDay: number;
  averagePerPerson: number;
  topCategory: string;
  topCategoryAmount: number;
  biggestSpender: string;
  biggestSpenderAmount: number;
  activitiesCount: number;
  checklistCompletionPercent: number;
  categoryBreakdown: Array<{ category: string; amount: number; percent: number }>;
}

const categoryLabels: Record<string, string> = {
  accommodation: 'Hospedagem',
  food: 'Alimentação',
  transport: 'Transporte',
  tickets: 'Ingressos',
  shopping: 'Compras',
  other: 'Outros',
};

export function computeTripRecap(input: TripRecapInput): TripRecapData {
  const { trip, expenses, participants, activitiesCount, checklistCompletionPercent } = input;

  // Duration
  const start = new Date(trip.startDate + 'T00:00:00');
  const end = new Date(trip.endDate + 'T00:00:00');
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

  // Total
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0);

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const converted = e.amount * (e.exchangeRate || 1);
    byCategory[e.category] = (byCategory[e.category] || 0) + converted;
  }

  const categoryBreakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percent: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryBreakdown[0]?.category || 'other';
  const topCategoryAmount = categoryBreakdown[0]?.amount || 0;

  // Biggest spender
  const byPerson: Record<string, number> = {};
  for (const e of expenses) {
    const converted = e.amount * (e.exchangeRate || 1);
    byPerson[e.paidByName] = (byPerson[e.paidByName] || 0) + converted;
  }

  const sortedSpenders = Object.entries(byPerson).sort(([, a], [, b]) => b - a);
  const biggestSpender = sortedSpenders[0]?.[0] || '';
  const biggestSpenderAmount = sortedSpenders[0]?.[1] || 0;

  return {
    tripName: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    baseCurrency: trip.baseCurrency,
    durationDays,
    participantCount: participants.length,
    totalSpent,
    expenseCount: expenses.length,
    averagePerDay: totalSpent / durationDays,
    averagePerPerson: participants.length > 0 ? totalSpent / participants.length : 0,
    topCategory,
    topCategoryAmount,
    biggestSpender,
    biggestSpenderAmount,
    activitiesCount,
    checklistCompletionPercent,
    categoryBreakdown,
  };
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}
