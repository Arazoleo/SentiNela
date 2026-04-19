import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
}

interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  isTyping: boolean;
  syndrome: SyndromeResult | null;
  nearestClinics: NearestClinic[];
  isConnected: boolean;
  addMessage: (msg: ChatMessage) => void;
  setTyping: (v: boolean) => void;
  setSyndrome: (s: SyndromeResult) => void;
  setNearestClinics: (c: NearestClinic[]) => void;
  setSessionId: (id: string) => void;
  setConnected: (v: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  messages: [],
  isTyping: false,
  syndrome: null,
  nearestClinics: [],
  isConnected: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setTyping: (isTyping) => set({ isTyping }),
  setSyndrome: (syndrome) => set({ syndrome }),
  setNearestClinics: (nearestClinics) => set({ nearestClinics }),
  setSessionId: (sessionId) => set({ sessionId }),
  setConnected: (isConnected) => set({ isConnected }),
  reset: () => set({ sessionId: null, messages: [], syndrome: null, nearestClinics: [], isTyping: false }),
}));
