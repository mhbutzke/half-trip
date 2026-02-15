import { describe, expect, it } from 'vitest';
import { computeTripProgress } from './trip-progress';

describe('computeTripProgress', () => {
  it('returns currentDay=0 before the trip starts', () => {
    const r = computeTripProgress('2099-01-10', '2099-01-12', new Date('2099-01-09T12:00:00'));
    expect(r.totalDays).toBe(3);
    expect(r.currentDay).toBe(0);
    expect(r.percentage).toBe(0);
  });

  it('returns currentDay=1 on the first day', () => {
    const r = computeTripProgress('2099-01-10', '2099-01-12', new Date('2099-01-10T23:59:59'));
    expect(r.totalDays).toBe(3);
    expect(r.currentDay).toBe(1);
    expect(r.percentage).toBeGreaterThan(0);
  });

  it('returns currentDay=n during the trip', () => {
    const r = computeTripProgress('2099-01-10', '2099-01-12', new Date('2099-01-11T12:00:00'));
    expect(r.totalDays).toBe(3);
    expect(r.currentDay).toBe(2);
  });

  it('returns currentDay=totalDays after the trip ends', () => {
    const r = computeTripProgress('2099-01-10', '2099-01-12', new Date('2099-01-13T00:00:01'));
    expect(r.totalDays).toBe(3);
    expect(r.currentDay).toBe(3);
    expect(r.percentage).toBe(100);
  });
});
