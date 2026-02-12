import { normalizeSelectedActivityIds } from './sync-selection';

describe('normalizeSelectedActivityIds', () => {
  it('returns null when no valid ids are provided', () => {
    expect(normalizeSelectedActivityIds(undefined)).toBeNull();
    expect(normalizeSelectedActivityIds(null)).toBeNull();
    expect(normalizeSelectedActivityIds([])).toBeNull();
    expect(normalizeSelectedActivityIds(['', '   '])).toBeNull();
  });

  it('trims, deduplicates and keeps valid ids only', () => {
    const ids = normalizeSelectedActivityIds(['  a1  ', 'a1', 'b2', '']);

    expect(ids).toEqual(['a1', 'b2']);
  });

  it('limits selection size to avoid abusive payloads', () => {
    const raw = Array.from({ length: 600 }, (_, i) => `id-${i}`);
    const ids = normalizeSelectedActivityIds(raw);

    expect(ids).toHaveLength(500);
    expect(ids?.[0]).toBe('id-0');
    expect(ids?.[499]).toBe('id-499');
  });
});
