import { create } from 'zustand';

export interface ActiveUser {
  name: string;
  email: string;
}

// Keep the current user
interface ActiveUserState {
  activeUser: ActiveUser | null;
  setActiveUser: (user: ActiveUser | null) => void;
}

export const useUserStore = create<ActiveUserState>((set) => ({
  activeUser: null,
  setActiveUser: (user) => set({ activeUser: user }),
}));