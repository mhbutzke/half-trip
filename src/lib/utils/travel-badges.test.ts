import { describe, it, expect } from 'vitest';
import { computeBadges, getAllBadges } from './travel-badges';
import type { BadgeInput } from './travel-badges';

describe('computeBadges', () => {
  const baseInput: BadgeInput = {
    tripCount: 1,
    totalExpenses: 5,
    hasReceipt: true,
    budgetKept: true,
    checklistComplete: true,
    participantCount: 4,
    activitiesCount: 10,
    daysCount: 7,
  };

  it('should award "Primeira Viagem" for first trip', () => {
    const badges = computeBadges({ ...baseInput, tripCount: 1 });
    expect(badges.some((b) => b.id === 'first_trip')).toBe(true);
  });

  it('should award "Budget Master" when budget kept', () => {
    const badges = computeBadges({ ...baseInput, budgetKept: true });
    expect(badges.some((b) => b.id === 'budget_master')).toBe(true);
  });

  it('should NOT award "Budget Master" when budget exceeded', () => {
    const badges = computeBadges({ ...baseInput, budgetKept: false });
    expect(badges.some((b) => b.id === 'budget_master')).toBe(false);
  });

  it('should award "Organizador" for 10+ activities', () => {
    const badges = computeBadges({ ...baseInput, activitiesCount: 10 });
    expect(badges.some((b) => b.id === 'planner')).toBe(true);
  });

  it('should award "Turma Grande" for 5+ participants', () => {
    const badges = computeBadges({ ...baseInput, participantCount: 5 });
    expect(badges.some((b) => b.id === 'big_group')).toBe(true);
  });

  it('should award "Checklist Completo" when 100% complete', () => {
    const badges = computeBadges({ ...baseInput, checklistComplete: true });
    expect(badges.some((b) => b.id === 'checklist_done')).toBe(true);
  });

  it('should award "Viajante Frequente" for 5+ trips', () => {
    const badges = computeBadges({ ...baseInput, tripCount: 5 });
    expect(badges.some((b) => b.id === 'frequent_traveler')).toBe(true);
  });

  it('should award "Maratonista" for 10+ days', () => {
    const badges = computeBadges({ ...baseInput, daysCount: 10 });
    expect(badges.some((b) => b.id === 'long_trip')).toBe(true);
  });

  it('should NOT award "Maratonista" for short trips', () => {
    const badges = computeBadges({ ...baseInput, daysCount: 5 });
    expect(badges.some((b) => b.id === 'long_trip')).toBe(false);
  });
});

describe('getAllBadges', () => {
  it('should return all 9 badge definitions', () => {
    expect(getAllBadges()).toHaveLength(9);
  });
});
