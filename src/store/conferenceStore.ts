import { EventPermissions } from '@/api/types';
import { create } from 'zustand';

export interface ActiveConference {
  name: string;
  slug: string;
  permissions: EventPermissions;
  voting_enabled: boolean;
}

// Store votes for the current conference
interface ConferenceStoreState {
  activeConference: ActiveConference | null;
  setActiveConference: (conference: ActiveConference | null) => void;
}

export const useConferenceStore = create<ConferenceStoreState>((set) => ({
  activeConference: null,
  setActiveConference: (conference) => set({ activeConference: conference }),
}));