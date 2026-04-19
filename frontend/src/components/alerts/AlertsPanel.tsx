"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MapPin, Users, CheckCircle, Loader2, Radio } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAlertsStore, EpidemicAlert } from "@/store/alertsStore";
import { ClinicAlertsWS } from "@/lib/alertsWebSocket";
import { api } from "@/lib/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const severityConfig = {
  low:      { label: "Baixa",    color: "#facc15", bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.2)" },
  moderate: { label: "Moderada", color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)" },
  high:     { label: "Alta",     color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
  critical: { label: "Crítica",  color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.35)" },
};

function AlertCard({ alert, onResolve }: { alert: EpidemicAlert; onResolve: (id: string) => void }) {
  const cfg = severityConfig[alert.severity] || severityConfig.moderate;
  const isCritical = alert.severity === "critical" || alert.severity === "high";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: isCritical ? `0 0 16px ${cfg.color}18` : "none",
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <AlertTriangle className="w-4 h-4" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{alert.syndrome}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: "#2a5e3a" }}>
                {formatDistanceToNow(parseISO(alert.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs mb-3" style={{ color: "#3d6e50" }}>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {alert.city} — {alert.state}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            {alert.case_count} casos · {alert.window_days}d
          </span>
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3" />
            {alert.radius_km} km
          </span>
        </div>

        <button
          onClick={() => onResolve(alert.id)}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: "rgba(0,214,122,0.06)",
            border: "1px solid rgba(0,214,122,0.15)",
            color: "#3d6e50",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,214,122,0.12)";
            (e.currentTarget as HTMLButtonElement).style.color = "#00d67a";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,214,122,0.06)";
            (e.currentTarget as HTMLButtonElement).style.color = "#3d6e50";
          }}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Marcar como resolvido
        </button>
      </div>
    </motion.div>
  );
}

export default function AlertsPanel() {
  const { token, role } = useAuthStore();
  const { alerts, setAlerts, addAlert, resolveAlert, markAllRead } = useAlertsStore();
  const wsRef = useRef<ClinicAlertsWS | null>(null);

  // Carrega alertas existentes
  useEffect(() => {
    if (role !== "clinic") return;
    api.get("/alerts/active").then((r) => setAlerts(r.data)).catch(() => {});
  }, [role]);

  // Conecta WebSocket para alertas em tempo real
  useEffect(() => {
    if (!token || role !== "clinic") return;
    const ws = new ClinicAlertsWS(token);
    wsRef.current = ws;

    const unsub = ws.onMessage((msg) => {
      if (msg.type === "epidemic_alert") {
        addAlert({
          id: msg.alert_id!,
          syndrome: msg.syndrome!,
          city: msg.city!,
          state: msg.state!,
          case_count: msg.case_count!,
          severity: msg.severity as any,
          radius_km: msg.radius_km!,
          centroid_lat: msg.centroid_lat,
          centroid_lng: msg.centroid_lng,
          window_days: msg.window_days!,
          created_at: msg.created_at!,
        });
      }
    });

    ws.connect();
    markAllRead();
    return () => { unsub(); ws.disconnect(); };
  }, [token, role]);

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/resolve`);
      resolveAlert(id);
    } catch {
      resolveAlert(id); // otimista
    }
  };

  if (role !== "clinic") return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff87]" style={{ boxShadow: "0 0 6px #00ff87" }} />
          <h2 className="text-sm font-semibold text-white">Alertas Epidemiológicos</h2>
          {alerts.length > 0 && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              {alerts.length}
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono" style={{ color: "#1e4a2e" }}>
          tempo real · /ws/alerts
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {alerts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-6 text-center"
            style={{ background: "rgba(3,12,6,0.8)", border: "1px solid rgba(13,51,32,0.5)" }}
          >
            <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#1e4a2e" }} />
            <p className="text-sm" style={{ color: "#2a5e3a" }}>Nenhum alerta ativo</p>
            <p className="text-xs mt-1" style={{ color: "#1e4a2e" }}>Monitoramento contínuo em andamento</p>
          </motion.div>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={handleResolve} />
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
