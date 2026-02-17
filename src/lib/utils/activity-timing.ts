import { format } from 'date-fns';

export type ActivityTimingStatus = 'now' | 'next';

/**
 * Determines the "now" and "next" activity IDs from a list of activities.
 * Returns a Map of activity ID → status.
 *
 * "now" = the activity whose time range contains the current time
 * "next" = the first future activity (after "now", or first of the day if none started)
 */
export function computeActivityTimingMap(
  activities: Array<{
    id: string;
    date: string;
    start_time: string | null;
    duration_minutes: number | null;
  }>,
  now: Date = new Date()
): Map<string, ActivityTimingStatus> {
  const map = new Map<string, ActivityTimingStatus>();
  const todayStr = format(now, 'yyyy-MM-dd');
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Filter to today's activities with start_time, sorted by start_time
  const todayActivities = activities
    .filter((a) => a.date === todayStr && a.start_time)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!));

  let foundNow = false;
  let foundNext = false;

  for (const activity of todayActivities) {
    const [h, m] = activity.start_time!.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + (activity.duration_minutes || 60);

    if (!foundNow && nowMinutes >= startMinutes && nowMinutes < endMinutes) {
      map.set(activity.id, 'now');
      foundNow = true;
    } else if (foundNow && !foundNext && nowMinutes < startMinutes) {
      map.set(activity.id, 'next');
      foundNext = true;
      break;
    } else if (!foundNow && nowMinutes < startMinutes) {
      // No "now" activity, first future one is "next"
      map.set(activity.id, 'next');
      foundNext = true;
      break;
    }
  }

  return map;
}
