"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { BarChart3, TrendingUp, Loader2, Activity } from "lucide-react";

interface SyndromeCount {
  syndrome_name: string;
  count: number;
  trend: "rising" | "stable" | "falling";
}

export default function DoctorReportsPage() {
  const [data, setData] = useState<SyndromeCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/summary").then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const trendColor = (trend: string) =>
    trend === "rising" ? "#ef4444" : trend === "falling" ? "#00d67a" : "#3d6e50";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-online" />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#3d6e50" }}>Vigilância sindrômica</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Relatórios Epidemiológicos</h1>
        <p className="text-sm mt-1" style={{ color: "#3d6e50" }}>Análise consolidada das síndromes atendidas</p>
      </motion.div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#00d67a" }} />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}>
          <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: "#0d3320" }} />
          <p style={{ color: "#3d6e50" }}>Dados insuficientes para relatório</p>
        </div>
      ) : (
        <div className="rounded-2xl p-6 space-y-4" style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}>
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-4 h-4" style={{ color: "#00d67a" }} />
            <h2 className="font-display font-semibold text-white text-sm">Distribuição por Síndrome</h2>
          </div>
          {data.map((item, i) => (
            <motion.div
              key={item.syndrome_name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">{item.syndrome_name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono" style={{ color: trendColor(item.trend) }}>
                    {item.count} casos
                  </span>
                  <TrendingUp className="w-3 h-3" style={{ color: trendColor(item.trend) }} />
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#061a0e" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#00d67a,#00ff87)" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
