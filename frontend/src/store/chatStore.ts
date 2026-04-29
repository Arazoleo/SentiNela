import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string — serializable para persist
}

export interface SyndromeResult {
  syndrome_name: string;
  icd10_code: string;
  confidence: number;
  urgency_level: "low" | "medium" | "high" | "emergency";
  symptoms: string[];
  recommendations: string[];
}

export interface NearestClinic {
  clinic_id: string;
  clinic_name: string;
  distance_km: number;
  estimated_minutes: number;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  is_emergency: boolean;
  specialties: string[];
  node_type?: string;
  registered?: boolean;
}

interface ChatState {
  sessionId:      string | null;
  messages:       ChatMessage[];
  isTyping:       boolean;
  syndrome:       SyndromeResult | null;
  nearestClinics: NearestClinic[];
  isConnected:    boolean;
  _hasHydrated:   boolean;

  addMessage:        (msg: ChatMessage) => void;
  setMessages:       (msgs: ChatMessage[]) => void;
  clearHistory:      () => void;
  setTyping:         (v: boolean) => void;
  setSyndrome:       (s: SyndromeResult | null) => void;
  setNearestClinics: (c: NearestClinic[]) => void;
  setSessionId:      (id: string | null) => void;
  setConnected:      (v: boolean) => void;
  setHasHydrated:    (v: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sessionId:      null,
      messages:       [],
      isTyping:       false,
      syndrome:       null,
      nearestClinics: [],
      isConnected:    false,
      _hasHydrated:   false,

      addMessage:        (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setMessages:       (messages) => set({ messages }),
      clearHistory:      () => set({ messages: [], syndrome: null, nearestClinics: [], sessionId: null }),
      setTyping:         (isTyping) => set({ isTyping }),
      setSyndrome:       (syndrome) => set({ syndrome }),
      setNearestClinics: (nearestClinics) => set({ nearestClinics }),
      setSessionId:      (sessionId) => set({ sessionId }),
      setConnected:      (isConnected) => set({ isConnected }),
      setHasHydrated:    (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "sentinela-chat",
      partialize: (s) => ({
        sessionId:      s.sessionId,
        messages:       s.messages,
        syndrome:       s.syndrome,
        nearestClinics: s.nearestClinics,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
