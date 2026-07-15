import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Agent, Notification } from "@/types";

// ── Toast Type ──────────────────────────────────────────────
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

// ── Store State ─────────────────────────────────────────────
interface KikiStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Agents (client-side cache, overridden by API data)
  agents: Agent[];
  toggleAgent: (id: string) => void;

  // Wallet (client-side cache)
  walletBalance: number;
  topUpWallet: (amount: number) => void;

  // Notifications (client-side cache)
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;

  // System health
  systemStatus: "nominal" | "degraded" | "outage";

  // Command palette
  cmdPaletteOpen: boolean;
  setCmdPaletteOpen: (open: boolean) => void;
}

// ── Store ───────────────────────────────────────────────────
export const useKikiStore = create<KikiStore>()(
  persist(
    (set, get) => ({
      // Auth — start unauthenticated; login flow sets user
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Agents — default set, overridden by API when token is available
      agents: [],
      toggleAgent: (id) =>
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id
              ? { ...a, status: a.status === "running" ? "paused" : "running" }
              : a
          ),
        })),

      // Wallet
      walletBalance: 0,
      topUpWallet: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        set((s) => ({ walletBalance: s.walletBalance + amount }));
      },

      // Notifications
      notifications: [],
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      // Toasts
      toasts: [],
      addToast: (type, message) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
        setTimeout(() => get().removeToast(id), 4500);
      },
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // System
      systemStatus: "nominal",

      // Command palette
      cmdPaletteOpen: false,
      setCmdPaletteOpen: (open) => set({ cmdPaletteOpen: open }),
    }),
    {
      name: "kiki-store",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);

// ── Derived Selectors ───────────────────────────────────────
export const useUnreadCount = () =>
  useKikiStore((s) => s.notifications.filter((n) => !n.read).length);

export const useRunningAgents = () =>
  useKikiStore((s) => s.agents.filter((a) => a.status === "running").length);

export const useAgentCount = () => useKikiStore((s) => s.agents.length);

export const useSystemStatus = () => useKikiStore((s) => s.systemStatus);
