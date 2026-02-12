import { describe, expect, it } from 'vitest';
import { createActivitySchema, updateActivitySchema } from './activity-schemas';

describe('activity time validation', () => {
  it('accepts start_time with seconds on update payloads', () => {
    const result = updateActivitySchema.safeParse({
      start_time: '20:00:00',
    });

    expect(result.success).toBe(true);
  });

  it('accepts HH:MM start_time on create payloads', () => {
    const result = createActivitySchema.safeParse({
      trip_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Jantar',
      date: '2026-02-14',
      start_time: '20:00',
      category: 'meal',
    });

    expect(result.success).toBe(true);
  });
});
