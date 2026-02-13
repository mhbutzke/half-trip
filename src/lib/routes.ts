/**
 * Centralized type-safe route builders.
 * All navigation and revalidation paths should use these constants.
 */
export const routes = {
  home: () => '/' as const,
  login: (redirect?: string) =>
    redirect ? (`/login?redirect=${encodeURIComponent(redirect)}` as const) : ('/login' as const),
  register: (redirect?: string) =>
    redirect
      ? (`/register?redirect=${encodeURIComponent(redirect)}` as const)
      : ('/register' as const),
  forgotPassword: () => '/forgot-password' as const,
  resetPassword: () => '/reset-password' as const,
  trips: () => '/trips' as const,
  settings: () => '/settings' as const,
  offline: () => '/offline' as const,
  unsubscribe: () => '/unsubscribe' as const,
  invite: (code: string) => `/invite/${code}` as const,
  trip: {
    overview: (id: string) => `/trip/${id}` as const,
    itinerary: (id: string) => `/trip/${id}/itinerary` as const,
    expenses: (id: string) => `/trip/${id}/expenses` as const,
    expenseAdd: (id: string) => `/trip/${id}/expenses/add` as const,
    expenseEdit: (tripId: string, expenseId: string) =>
      `/trip/${tripId}/expenses/${expenseId}/edit` as const,
    balance: (id: string) => `/trip/${id}/balance` as const,
    budget: (id: string) => `/trip/${id}/budget` as const,
    participants: (id: string) => `/trip/${id}/participants` as const,
    checklists: (id: string) => `/trip/${id}/checklists` as const,
    notes: (id: string) => `/trip/${id}/notes` as const,
  },
  api: {
    health: () => '/api/health' as const,
    googleCalendar: {
      connect: (redirect?: string) =>
        redirect
          ? (`/api/google-calendar/connect?redirect=${encodeURIComponent(redirect)}` as const)
          : ('/api/google-calendar/connect' as const),
      callback: () => '/api/google-calendar/callback' as const,
      disconnect: () => '/api/google-calendar/disconnect' as const,
      sync: () => '/api/google-calendar/sync' as const,
    },
  },
} as const;
