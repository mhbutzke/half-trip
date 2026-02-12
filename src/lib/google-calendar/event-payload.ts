import type { Activity } from '@/types/database';

type GoogleDateTime = {
  dateTime: string;
  timeZone: string;
};

type GoogleDate = {
  date: string;
};

export type GoogleCalendarEventPayload = {
  summary: string;
  description?: string;
  location?: string;
  start: GoogleDateTime | GoogleDate;
  end: GoogleDateTime | GoogleDate;
  extendedProperties?: {
    private: Record<string, string>;
  };
};

export type BuildGoogleCalendarEventOptions = {
  tripName: string;
  timezone: string;
};

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function addDays(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addMinutes(
  dateISO: string,
  time: string,
  minutes: number
): { date: string; time: string } {
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hours, mins, secs = '00'] = time.split(':');

  const date = new Date(
    Date.UTC(year, month - 1, day, Number(hours), Number(mins) + minutes, Number(secs))
  );

  return {
    date: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`,
  };
}

function buildDescription(activity: Activity, tripName: string): string | undefined {
  const lines = [`Viagem: ${tripName}`];

  if (activity.description) {
    lines.push('', activity.description);
  }

  lines.push('', 'Criado pelo Half Trip');

  return lines.join('\n');
}

export function buildGoogleCalendarEvent(
  activity: Activity,
  options: BuildGoogleCalendarEventOptions
): GoogleCalendarEventPayload {
  const payload: GoogleCalendarEventPayload = {
    summary: activity.title,
    description: buildDescription(activity, options.tripName),
    location: activity.location ?? undefined,
    start: { date: activity.date },
    end: { date: addDays(activity.date, 1) },
    extendedProperties: {
      private: {
        half_trip_activity_id: activity.id,
        half_trip_trip_id: activity.trip_id,
      },
    },
  };

  if (!activity.start_time) {
    return payload;
  }

  const durationMinutes = activity.duration_minutes ?? 60;
  const endDateTime = addMinutes(activity.date, activity.start_time, durationMinutes);

  payload.start = {
    dateTime: `${activity.date}T${activity.start_time}`,
    timeZone: options.timezone,
  };
  payload.end = {
    dateTime: `${endDateTime.date}T${endDateTime.time}`,
    timeZone: options.timezone,
  };

  return payload;
}
