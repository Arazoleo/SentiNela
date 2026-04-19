const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type AlertWSMessage = {
  type: "connected" | "epidemic_alert" | "pong";
  clinic_id?: string;
  message?: string;
  alert_id?: string;
  syndrome?: string;
  city?: string;
  state?: string;
  case_count?: number;
  severity?: string;
  radius_km?: number;
  centroid_lat?: number;
  centroid_lng?: number;
  window_days?: number;
  created_at?: string;
};

type Handler = (msg: AlertWSMessage) => void;

export class ClinicAlertsWS {
  private ws: WebSocket | null = null;
  private handlers: Handler[] = [];
  private retries = 0;
  private maxRetries = 8;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  connect() {
    this.ws = new WebSocket(`${WS_URL}/ws/alerts?token=${this.token}`);

    this.ws.onopen = () => {
      this.retries = 0;
      // Keepalive ping a cada 25s
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send("ping");
        }
      }, 25000);
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AlertWSMessage;
        this.handlers.forEach((h) => h(data));
      } catch {
        // pong é texto simples
      }
    };

    this.ws.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      if (this.retries < this.maxRetries) {
        const delay = Math.min(1000 * 2 ** this.retries, 30000);
        setTimeout(() => { this.retries++; this.connect(); }, delay);
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  onMessage(handler: Handler) {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter((h) => h !== handler); };
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
    this.ws = null;
  }
}
