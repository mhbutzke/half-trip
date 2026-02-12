import type { Activity } from '@/types/database';
import { buildGoogleCalendarEvent } from './event-payload';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    trip_id: 't1',
    title: 'Jantar em Gramado',
    date: '2026-02-14',
    start_time: '20:00:00',
    duration_minutes: 120,
    location: 'Osteria di Lucca',
    description: 'Reserva confirmada',
    category: 'meal',
    links: [],
    metadata: {},
    sort_order: 0,
    created_by: 'u1',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildGoogleCalendarEvent', () => {
  it('builds timed events with timezone and calculated end', () => {
    const activity = makeActivity({
      start_time: '13:00:00',
      duration_minutes: 90,
      title: 'Almoço',
      date: '2026-02-15',
    });

    const event = buildGoogleCalendarEvent(activity, {
      tripName: 'Carnaval em Gramado',
      timezone: 'America/Sao_Paulo',
    });

    expect(event.summary).toBe('Almoço');
    expect(event.start).toEqual({
      dateTime: '2026-02-15T13:00:00',
      timeZone: 'America/Sao_Paulo',
    });
    expect(event.end).toEqual({
      dateTime: '2026-02-15T14:30:00',
      timeZone: 'America/Sao_Paulo',
    });
    expect(event.description).toContain('Carnaval em Gramado');
  });

  it('builds all-day events when activity has no start time', () => {
    const activity = makeActivity({
      start_time: null,
      duration_minutes: null,
      title: 'Check-out no hotel',
      date: '2026-02-18',
    });

    const event = buildGoogleCalendarEvent(activity, {
      tripName: 'Carnaval em Gramado',
      timezone: 'America/Sao_Paulo',
    });

    expect(event.start).toEqual({ date: '2026-02-18' });
    expect(event.end).toEqual({ date: '2026-02-19' });
  });
});
