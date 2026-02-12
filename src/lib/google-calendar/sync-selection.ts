const MAX_SELECTED_ACTIVITIES = 500;

export function normalizeSelectedActivityIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (normalized.length === 0) {
    return null;
  }

  const unique = Array.from(new Set(normalized));

  return unique.slice(0, MAX_SELECTED_ACTIVITIES);
}
