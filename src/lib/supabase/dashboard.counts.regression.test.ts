import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('DashboardData counts regression', () => {
  it('includes server-side count queries for activities and checklists', () => {
    const filePath = resolve(process.cwd(), 'src/lib/supabase/dashboard.ts');
    const source = readFileSync(filePath, 'utf8');

    expect(source).toMatch(/from\('activities'\)/);
    expect(source).toMatch(/count:\s*'exact'/);
    expect(source).toMatch(/head:\s*true/);

    expect(source).toMatch(/from\('trip_checklists'\)/);
    expect(source).toMatch(/activityCountTotal/);
    expect(source).toMatch(/checklistCount/);
  });
});
