"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { BarChart3, Clock, ChevronDown, AlertTriangle, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Report {
  id: string;
  syndrome_name: string;
  urgency_level: "low" | "medium" | "high" | "emergency";
  confidence: number;
  symptoms: string[];
  recommendations: string[];
  created_at: string;
  icd10_code?: string;
}

const urgencyConfig = {
  low:       { label: "Baixa",      class: "badge-low",       icon: CheckCircle },
  medium:    { label: "Média",      class: "badge-medium",    icon: AlertTriangle },
  high:      { label: "Alta",       class: "badge-high",      icon: AlertTriangle },
  emergency: { label: "EMERGÊNCIA", class: "badge-emergency", icon: AlertTriangle },
};

export default function PatientHistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.get("/reports/my").then((r) => setReports(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-online" />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#3d6e50" }}>Seus dados</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Histórico de Consultas</h1>
        <p className="text-sm mt-1" style={{ color: "#3d6e50" }}>
          {reports.length} relatório(s) sindrômico(s) gerado(s)
        </p>
      </motion.div>

      {loading ? (
        <div className="text-center py-16 font-mono text-sm" style={{ color: "#2a5e3a" }}>
          Carregando histórico...
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}>
          <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: "#0d3320" }} />
          <p style={{ color: "#3d6e50" }}>Nenhuma consulta realizada ainda</p>
          <p className="text-xs mt-1" style={{ color: "#1a4a28" }}>
            Use o Assistente Sentinela para iniciar uma consulta
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => {
            const urgency = urgencyConfig[report.urgency_level] || urgencyConfig.low;
            const UrgencyIcon = urgency.icon;
            const isOpen = expanded === report.id;
            const confidence = Math.round(report.confidence * 100);

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}
              >
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setExpanded(isOpen ? null : report.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)" }}>
                      <BarChart3 className="w-4 h-4" style={{ color: "#00d67a" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{report.syndrome_name}</p>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#2a5e3a" }}>
                        <Clock className="w-3 h-3" />
                        {format(parseISO(report.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${urgency.class}`}>
                      <UrgencyIcon className="w-3 h-3" />
                      {urgency.label}
                    </span>
                    <ChevronDown
                      className="w-4 h-4 transition-transform"
                      style={{ color: "#2a5e3a", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="px-4 pb-4 space-y-3"
                    style={{ borderTop: "1px solid #0d3320" }}
                  >
                    {/* Confiança */}
                    <div className="pt-3">
                      <div className="flex justify-between text-xs mb-1" style={{ color: "#2a5e3a" }}>
                        <span>Confiança diagnóstica</span>
                        <span className="font-mono" style={{ color: "#00d67a" }}>{confidence}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#061a0e" }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${confidence}%`, background: "linear-gradient(90deg,#00d67a,#00ff87)" }} />
                      </div>
                    </div>

                    {report.icd10_code && (
                      <p className="text-xs font-mono" style={{ color: "rgba(0,214,122,0.5)" }}>
                        CID-10: {report.icd10_code}
                      </p>
                    )}

                    {report.symptoms?.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#2a5e3a" }}>
                          Sintomas relatados
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.symptoms.map((s) => (
                            <span key={s} className="px-2 py-1 rounded text-xs"
                              style={{ background: "rgba(0,214,122,0.06)", border: "1px solid rgba(0,214,122,0.12)", color: "#a8d5b5" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.recommendations?.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#2a5e3a" }}>
                          Recomendações
                        </p>
                        <ul className="space-y-1">
                          {report.recommendations.map((r, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs" style={{ color: "#a8d5b5" }}>
                              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#00d67a" }} />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
