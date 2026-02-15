import { describe, expect, it } from 'vitest';
import { computeTripReadiness } from './trip-readiness';

describe('computeTripReadiness', () => {
  it('returns 0% when nothing is ready', () => {
    const r = computeTripReadiness({
      memberCount: 1,
      activityCountTotal: 0,
      checklistCount: 0,
      budgetTotal: null,
      userRole: 'organizer',
    });

    expect(r.score).toBe(0);
    expect(r.completed).toBe(0);
    expect(r.missing).toBe(4);
    expect(r.isReady).toBe(false);
  });

  it('returns 100% when all essentials are ready', () => {
    const r = computeTripReadiness({
      memberCount: 2,
      activityCountTotal: 1,
      checklistCount: 1,
      budgetTotal: 100,
      userRole: 'participant',
    });

    expect(r.score).toBe(100);
    expect(r.completed).toBe(4);
    expect(r.missing).toBe(0);
    expect(r.isReady).toBe(true);
  });

  it('adds a permissions note when budget is missing and user is not organizer', () => {
    const r = computeTripReadiness({
      memberCount: 2,
      activityCountTotal: 1,
      checklistCount: 1,
      budgetTotal: null,
      userRole: 'participant',
    });

    const budget = r.items.find((i) => i.key === 'budget');
    expect(budget?.done).toBe(false);
    expect(budget?.note).toMatch(/Somente organizadores/);
  });
});
