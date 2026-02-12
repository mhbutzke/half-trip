import type { UpdateTripInput } from '@/lib/supabase/trips';
import type { SupportedCurrency } from '@/types/currency';
import type { TransportType, TripStyle } from '@/types/database';

export type TripEditComparable = {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string | null;
  style: TripStyle | null;
  base_currency: string;
  transport_type: TransportType;
};

export type TripEditFormValues = {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  style?: TripStyle | null;
  base_currency: SupportedCurrency;
  transport_type: TransportType;
};

function normalizeDescription(value?: string | null) {
  return value || null;
}

function normalizeStyle(value?: TripStyle | null) {
  return value || null;
}

export function buildTripUpdatePayload(
  trip: TripEditComparable,
  values: TripEditFormValues
): UpdateTripInput {
  const payload: UpdateTripInput = {};

  if (values.name !== trip.name) payload.name = values.name;
  if (values.destination !== trip.destination) payload.destination = values.destination;
  if (values.start_date !== trip.start_date) payload.start_date = values.start_date;
  if (values.end_date !== trip.end_date) payload.end_date = values.end_date;

  const nextDescription = normalizeDescription(values.description);
  const currentDescription = normalizeDescription(trip.description);
  if (nextDescription !== currentDescription) payload.description = nextDescription;

  const nextStyle = normalizeStyle(values.style);
  const currentStyle = normalizeStyle(trip.style);
  if (nextStyle !== currentStyle) payload.style = nextStyle;

  if (values.base_currency !== trip.base_currency) payload.base_currency = values.base_currency;
  if (values.transport_type !== trip.transport_type) payload.transport_type = values.transport_type;

  return payload;
}
