import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "patient" | "clinic" | "doctor";

interface AuthState {
  token: string | null;
  userId: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (token: string, userId: string, role: UserRole) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      role: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (token, userId, role) => set({ token, userId, role, isAuthenticated: true }),
      logout: () => set({ token: null, userId: null, role: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "sentinela-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
