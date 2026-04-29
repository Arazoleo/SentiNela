const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type WSMessage = {
  type: "connected" | "history" | "typing" | "message" | "classification" | "error";
  session_id?: string;
  message?: string;
  role?: string;
  messages?: { id: string; role: string; content: string; timestamp: string }[];
  syndrome?: string;        // final_syndrome string on "history"
  urgency_level?: string;
  syndrome_result?: {       // full syndrome object on "classification"
    syndrome_name: string;
    icd10_code: string;
    confidence: number;
    urgency_level: string;
    symptoms: string[];
    recommendations: string[];
  };
  nearest_clinic?: object;
  nearest_clinics?: object[];
};

type Handler = (msg: WSMessage) => void;

export class SentinelaWS {
  private ws: WebSocket | null = null;
  private handlers: Handler[] = [];
  private retries = 0;
  private maxRetries = 5;
  private shouldReconnect = true;
  private token: string;
  private lat?: number;
  private lng?: number;
  private forceNew: boolean;

  constructor(token: string, forceNew = false, lat?: number, lng?: number) {
    this.token    = token;
    this.forceNew = forceNew;
    this.lat      = lat;
    this.lng      = lng;
  }

  connect() {
    this.shouldReconnect = true;
    const params = new URLSearchParams({ token: this.token });
    if (this.lat)       params.set("lat",         String(this.lat));
    if (this.lng)       params.set("lng",         String(this.lng));
    if (this.forceNew)  params.set("new_session", "true");

    this.ws = new WebSocket(`${WS_URL}/ws/chat?${params}`);

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WSMessage;
        this.handlers.forEach((h) => h(data));
      } catch {
        console.error("WS parse error", e.data);
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect && this.retries < this.maxRetries) {
        const delay = Math.min(1000 * 2 ** this.retries, 30000);
        setTimeout(() => { this.retries++; this.connect(); }, delay);
      }
    };

    this.ws.onerror = () => { this.ws?.close(); };
  }

  send(message: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message }));
    }
  }

  onMessage(handler: Handler) {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter((h) => h !== handler); };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
