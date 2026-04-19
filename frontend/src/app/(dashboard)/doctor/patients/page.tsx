"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Users, Clock, Loader2, ChevronRight, AlertTriangle, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Report {
  id: string;
  patient_id: string;
  syndrome_name: string;
  urgency_level: "low" | "medium" | "high" | "emergency";
  confidence: number;
  created_at: string;
}

const urgencyConfig = {
  low:       { label: "Baixa",      class: "badge-low" },
  medium:    { label: "Média",      class: "badge-medium" },
  high:      { label: "Alta",       class: "badge-high" },
  emergency: { label: "Emergência", class: "badge-emergency" },
};

export default function DoctorPatientsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/clinic").then((r) => setReports(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-online" />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#3d6e50" }}>Atendimentos</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Histórico de Pacientes</h1>
        <p className="text-sm mt-1" style={{ color: "#3d6e50" }}>
          {reports.length} atendimento(s) registrado(s)
        </p>
      </motion.div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#00d67a" }} />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}>
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "#0d3320" }} />
          <p style={{ color: "#3d6e50" }}>Nenhum atendimento registrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report, i) => {
            const urgency = urgencyConfig[report.urgency_level] || urgencyConfig.low;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl p-4 flex items-center justify-between gap-4"
                style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.15)" }}>
                    <Users className="w-4 h-4" style={{ color: "#00d67a" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{report.syndrome_name}</p>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#2a5e3a" }}>
                      <Clock className="w-3 h-3" />
                      {format(parseISO(report.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: "#2a5e3a" }}>
                    {Math.round(report.confidence * 100)}% conf.
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${urgency.class}`}>
                    {urgency.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
