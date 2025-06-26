import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Store the current authentication token
interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      setToken: (token) => {
        set({ token });
      },
      clearToken: () => {
        set({ token: null });
      },
      isAuthenticated: () => {
        // Rely on the in-memory token state for immediate checks.
        // The persist middleware handles localStorage for rehydration.
        return !!get().token; 
      },
    }),
    {
      name: 'auth-storage', 
      storage: createJSONStorage(() => localStorage), 
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export const handleApiUnauthorized = () => {
  console.log("Handling API unauthorized, clearing token.");
  useAuthStore.getState().clearToken();
  // No need to navigate here; App.tsx's ProtectedRoute will handle it.
};