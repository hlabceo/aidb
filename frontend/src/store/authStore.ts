import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  points: number;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, password) => {
        const form = new URLSearchParams();
        form.append("username", email);
        form.append("password", password);
        const { data } = await api.post("/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        localStorage.setItem("access_token", data.access_token);
        set({ user: data.user, token: data.access_token });
      },

      signup: async (email, password, name, phone) => {
        const { data } = await api.post("/auth/signup", { email, password, name, phone });
        localStorage.setItem("access_token", data.access_token);
        set({ user: data.user, token: data.access_token });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get("/auth/me");
          set((state) => ({ user: { ...state.user, ...data } }));
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "aidb-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
