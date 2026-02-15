import { parseDateOnly } from '@/lib/utils/date-only';

export type TripProgress = {
  currentDay: number; // 0 (pre-trip) .. totalDays
  totalDays: number; // >= 1
  percentage: number; // 0..100
};

/**
 * Compute trip progress using the user's local timezone.
 * Dates are treated as calendar days (YYYY-MM-DD), not instants.
 */
export function computeTripProgress(
  startDate: string,
  endDate: string,
  now: Date = new Date()
): TripProgress {
  const normalizeToMidnight = (d: Date) => {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
  };

  const start = normalizeToMidnight(parseDateOnly(startDate));
  const end = normalizeToMidnight(parseDateOnly(endDate));
  const today = normalizeToMidnight(now);

  const MS_DAY = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / MS_DAY) + 1);

  let currentDay = 0;
  if (today.getTime() < start.getTime()) {
    currentDay = 0;
  } else if (today.getTime() > end.getTime()) {
    currentDay = totalDays;
  } else {
    currentDay = Math.floor((today.getTime() - start.getTime()) / MS_DAY) + 1;
    currentDay = Math.max(1, Math.min(totalDays, currentDay));
  }

  const percentage =
    currentDay <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((currentDay / totalDays) * 100)));

  return { currentDay, totalDays, percentage };
}
