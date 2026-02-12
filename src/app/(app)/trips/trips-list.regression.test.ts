import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TripsList client data loading', () => {
  it('does not call server-only readers from useEffect', () => {
    const filePath = resolve(process.cwd(), 'src/app/(app)/trips/trips-list.tsx');
    const source = readFileSync(filePath, 'utf8');

    expect(source).not.toMatch(/\bgetUserTrips\s*\(/);
    expect(source).not.toMatch(/\bgetArchivedTrips\s*\(/);
    expect(source).not.toMatch(/\bgetUser\s*\(/);
  });
});
