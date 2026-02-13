import { describe, expect, it } from 'vitest';
import { parseDateOnly } from './date-only';

describe('parseDateOnly', () => {
  it('preserva o dia do calendário para datas ISO sem horário', () => {
    const parsed = parseDateOnly('2026-02-14');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(14);
  });
});
