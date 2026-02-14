import { create } from 'zustand';

interface TripContextState {
  tripName: string | null;
  setTripName: (name: string | null) => void;
}

export const useTripContext = create<TripContextState>((set) => ({
  tripName: null,
  setTripName: (name) => set({ tripName: name }),
}));
