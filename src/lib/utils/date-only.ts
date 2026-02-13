/**
 * Parses an ISO date-only string (YYYY-MM-DD) as a local calendar date.
 * This avoids UTC conversion shifts from `new Date('YYYY-MM-DD')`.
 */
export function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00`);
}
