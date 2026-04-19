import { create } from "zustand";

export interface EpidemicAlert {
  id: string;
  syndrome: string;
  icd10?: string;
  city: string;
  state: string;
  centroid_lat?: number;
  centroid_lng?: number;
  radius_km: number;
  case_count: number;
  severity: "low" | "moderate" | "high" | "critical";
  window_days: number;
  created_at: string;
}

interface AlertsState {
  alerts: EpidemicAlert[];
  unreadCount: number;
  setAlerts: (alerts: EpidemicAlert[]) => void;
  addAlert: (alert: EpidemicAlert) => void;
  resolveAlert: (id: string) => void;
  markAllRead: () => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  unreadCount: 0,
  setAlerts: (alerts) => set({ alerts, unreadCount: alerts.length }),
  addAlert: (alert) =>
    set((s) => ({
      alerts: [alert, ...s.alerts.filter((a) => a.id !== alert.id)],
      unreadCount: s.unreadCount + 1,
    })),
  resolveAlert: (id) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  markAllRead: () => set({ unreadCount: 0 }),
}));
