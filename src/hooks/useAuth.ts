"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { auth, type AuthResponse } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: AuthResponse["user"] | null;
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, companyName?: string) => Promise<boolean>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      mfaRequired: false,

      login: async (email: string, password: string, mfaCode?: string) => {
        set({ loading: true, error: null });
        try {
          const res = await auth.login(email, password, mfaCode);
          set({ token: res.token, user: res.user, loading: false, error: null, mfaRequired: false });
          return true;
        } catch (err) {
          const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : undefined;
          if (code === "MFA_REQUIRED" || code === "MFA_INVALID") {
            set({
              loading: false,
              mfaRequired: true,
              error: code === "MFA_INVALID" ? "Invalid authenticator code. Try again." : null,
            });
            return false;
          }
          set({ loading: false, error: err instanceof Error ? err.message : "Login failed" });
          return false;
        }
      },

      signup: async (name: string, email: string, password: string, companyName?: string) => {
        set({ loading: true, error: null });
        try {
          const res = await auth.signup(name, email, password, companyName);
          set({ token: res.token, user: res.user, loading: false, error: null });
          return true;
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : "Signup failed" });
          return false;
        }
      },

      logout: () => {
        auth.logout().catch(() => {});
        set({ token: null, user: null, error: null, mfaRequired: false });
      },

      loadUser: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await auth.me(token);
          set({ user: res.user });
        } catch {
          set({ token: null, user: null });
        }
      },
    }),
    { name: "kiki-auth", partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
