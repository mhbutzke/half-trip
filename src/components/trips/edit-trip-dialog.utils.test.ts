import { describe, it, expect } from 'vitest';
import {
  buildTripUpdatePayload,
  type TripEditComparable,
  type TripEditFormValues,
} from './edit-trip-dialog.utils';

const baseTrip: TripEditComparable = {
  name: 'Carnaval em Gramado',
  destination: 'Gramado - RS',
  start_date: '2026-02-13',
  end_date: '2026-02-17',
  description: null,
  style: 'gastronomic',
  base_currency: 'BRL',
  transport_type: 'car',
};

const baseFormValues: TripEditFormValues = {
  name: baseTrip.name,
  destination: baseTrip.destination,
  start_date: baseTrip.start_date,
  end_date: baseTrip.end_date,
  description: undefined,
  style: baseTrip.style,
  base_currency: 'BRL',
  transport_type: baseTrip.transport_type,
};

describe('buildTripUpdatePayload', () => {
  it('includes date fields when only dates change and omits unchanged base_currency', () => {
    const payload = buildTripUpdatePayload(baseTrip, {
      ...baseFormValues,
      start_date: '2026-02-14',
      end_date: '2026-02-18',
    });

    expect(payload).toEqual({
      start_date: '2026-02-14',
      end_date: '2026-02-18',
    });
    expect(payload.base_currency).toBeUndefined();
  });

  it('returns an empty payload when no fields changed', () => {
    const payload = buildTripUpdatePayload(baseTrip, {
      ...baseFormValues,
      description: '',
    });

    expect(payload).toEqual({});
  });

  it('includes base_currency when it actually changes', () => {
    const payload = buildTripUpdatePayload(baseTrip, {
      ...baseFormValues,
      base_currency: 'USD',
    });

    expect(payload).toEqual({
      base_currency: 'USD',
    });
  });
});
