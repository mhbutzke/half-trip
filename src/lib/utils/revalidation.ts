import { revalidatePath } from 'next/cache';
import { routes } from '@/lib/routes';

/**
 * Centralized revalidation strategies by domain.
 * Each function handles cascade invalidation.
 */
export const revalidate = {
  trips: () => {
    revalidatePath(routes.trips());
  },
  trip: (tripId: string) => {
    revalidatePath(routes.trip.overview(tripId));
    revalidatePath(routes.trips());
  },
  tripExpenses: (tripId: string) => {
    revalidatePath(routes.trip.expenses(tripId));
    revalidatePath(routes.trip.balance(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },
  tripBalance: (tripId: string) => {
    revalidatePath(routes.trip.balance(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },
  tripBudget: (tripId: string) => {
    revalidatePath(routes.trip.budget(tripId));
    revalidatePath(routes.trip.expenses(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },
  tripItinerary: (tripId: string) => {
    revalidatePath(routes.trip.itinerary(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },
  tripChecklists: (tripId: string) => {
    revalidatePath(routes.trip.checklists(tripId));
  },
  tripNotes: (tripId: string) => {
    revalidatePath(routes.trip.notes(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },
  tripParticipants: (tripId: string) => {
    revalidatePath(routes.trip.participants(tripId));
    revalidatePath(routes.trip.overview(tripId));
    revalidatePath(routes.trips());
  },
  settings: () => {
    revalidatePath(routes.settings());
    revalidatePath(routes.trips());
  },
};
