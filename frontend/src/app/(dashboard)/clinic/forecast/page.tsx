"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import ForecastChart from "@/components/forecast/ForecastChart";
import AlertsPanel from "@/components/alerts/AlertsPanel";
import { BarChart3, RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";
import { useAlertsStore } from "@/store/alertsStore";

const inputStyle = {
  background: "rgba(4,18,9,0.8)",
  border: "1px solid rgba(13,51,32,0.8)",
  color: "#d4edda",
  outline: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  transition: "border-color 0.2s",
};

export default function ClinicForecastPage() {
  const [city, setCity] = useState("São Paulo");
  const [state, setState] = useState("SP");
  const [syndrome, setSyndrome] = useState("Síndrome Gripal");
  const [syndromes, setSyndromes] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { alerts } = useAlertsStore();

  useEffect(() => {
    api.get("/forecast/syndromes/list").then((r) => {
      const list = r.data.map((s: any) => s.syndrome);
      setSyndromes(list);
      if (list.length > 0) setSyndrome(list[0]);
    }).catch(() => {});
  }, []);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/forecast/${state}/${city}`, { params: { syndrome, periods: 30 } });
      setData(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // Alertas ativos para a cidade/estado atual
  const localAlerts = alerts.filter(
    (a) => a.city.toLowerCase() === city.toLowerCase() || a.state === state
  );

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-sm font-mono mb-1" style={{ color: "#2a5e3a" }}>Modelo preditivo</p>
        <h1 className="font-display font-black text-3xl text-white mb-1">
          Forecasting{" "}
          <span style={{
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Epidemiológico
          </span>
        </h1>
        <p className="text-sm" style={{ color: "#3d6e50" }}>
          Série temporal com Prophet · previsão de {data?.periods || 30} dias
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Coluna principal */}
        <div className="space-y-5">
          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5"
            style={{ background: "rgba(4,14,8,0.95)", border: "1px solid rgba(13,51,32,0.7)" }}
          >
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "#1e4a2e" }}>
              Parâmetros
            </p>
            <div className="grid grid-cols-[1fr_80px_1fr] gap-3 items-end">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-mono block mb-1.5"
                  style={{ color: "#2a5e3a" }}>Cidade</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,214,122,0.3)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(13,51,32,0.8)")}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-mono block mb-1.5"
                  style={{ color: "#2a5e3a" }}>UF</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,214,122,0.3)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(13,51,32,0.8)")}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-mono block mb-1.5"
                  style={{ color: "#2a5e3a" }}>Síndrome</label>
                <div className="relative">
                  <input
                    list="syndromes-list"
                    value={syndrome}
                    onChange={(e) => setSyndrome(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,214,122,0.3)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(13,51,32,0.8)")}
                  />
                  <datalist id="syndromes-list">
                    {syndromes.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
            </div>

            <motion.button
              onClick={fetchForecast}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,#818cf8,#6366f1)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(129,140,248,0.25)",
              }}
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Calculando...</>
                : <><TrendingUp className="w-4 h-4" /> Gerar previsão</>
              }
            </motion.button>
          </motion.div>

          {/* Alertas locais */}
          <AnimatePresence>
            {localAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center gap-2 text-sm"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span style={{ color: "#fca5a5" }}>
                    {localAlerts.length} alerta{localAlerts.length > 1 ? "s" : ""} ativo{localAlerts.length > 1 ? "s" : ""} em {city} — {state}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gráfico */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl flex items-center justify-center h-64"
                style={{ background: "rgba(4,14,8,0.95)", border: "1px solid rgba(13,51,32,0.7)" }}
              >
                <div className="text-center space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#818cf8]" />
                  <p className="text-xs font-mono" style={{ color: "#2a5e3a" }}>Treinando modelo Prophet...</p>
                </div>
              </motion.div>
            ) : data ? (
              <motion.div
                key="chart"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              >
                {data.forecast?.length > 0 ? (
                  <ForecastChart
                    data={data.forecast}
                    trend={data.trend}
                    syndrome={data.syndrome}
                    location={data.location}
                  />
                ) : (
                  <div className="rounded-2xl p-10 text-center"
                    style={{ background: "rgba(4,14,8,0.95)", border: "1px solid rgba(13,51,32,0.7)" }}>
                    <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: "#1e4a2e" }} />
                    <p className="text-sm" style={{ color: "#3d6e50" }}>
                      {data.message || "Dados insuficientes — mínimo 10 registros históricos"}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl p-10 text-center"
                style={{ background: "rgba(4,14,8,0.95)", border: "1px solid rgba(13,51,32,0.7)" }}
              >
                <TrendingUp className="w-10 h-10 mx-auto mb-3" style={{ color: "#1e4a2e" }} />
                <p className="text-sm" style={{ color: "#3d6e50" }}>Configure os parâmetros e gere a previsão</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Coluna de alertas */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 28 }}
        >
          <AlertsPanel />
        </motion.div>
      </div>
    </div>
  );
}
