"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface Props {
  data: ForecastPoint[];
  trend: "rising" | "falling" | "stable";
  syndrome: string;
  location: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs space-y-1"
      style={{ background: "rgba(4,18,9,0.97)", border: "1px solid #0d3320" }}>
      <p className="font-mono" style={{ color: "#2a5e3a" }}>{label}</p>
      <p style={{ color: "#00d67a" }}>Previsto: <span className="font-bold">{payload[1]?.value?.toFixed(1)}</span></p>
      <p style={{ color: "#3d6e50" }}>Faixa: {payload[0]?.value?.toFixed(1)} – {payload[2]?.value?.toFixed(1)}</p>
    </div>
  );
};

export default function ForecastChart({ data, trend, syndrome, location }: Props) {
  const TrendIcon = trend === "rising" ? TrendingUp : trend === "falling" ? TrendingDown : Minus;
  const trendColor = trend === "rising" ? "#ef4444" : trend === "falling" ? "#00d67a" : "#3d6e50";

  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
  }));

  const maxValue = Math.max(...data.map((d) => d.upper), 1);
  const threshold = maxValue * 0.7;

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(4,18,9,0.95)", border: "1px solid #0d3320" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-semibold text-white">{syndrome}</h3>
          <p className="text-xs" style={{ color: "#2a5e3a" }}>{location}</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: trendColor }}>
          <TrendIcon className="w-4 h-4" />
          {trend === "rising" ? "Crescente" : trend === "falling" ? "Decrescente" : "Estável"}
        </div>
      </div>

      {/* Alerta */}
      {trend === "rising" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Tendência de aumento detectada nos próximos 7 dias
        </div>
      )}

      {/* Gráfico */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d67a" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d67a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d67a" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#00d67a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,51,32,0.8)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#2a5e3a", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#0d3320" }}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis tick={{ fill: "#2a5e3a", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={threshold} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 2" />

            <Area dataKey="lower" stroke="none" fill="url(#gradBand)" fillOpacity={1} legendType="none" />
            <Area dataKey="upper" stroke="none" fill="url(#gradBand)" fillOpacity={0.5} legendType="none" />
            <Area
              dataKey="predicted"
              stroke="#00d67a"
              strokeWidth={2}
              fill="url(#gradBio)"
              dot={false}
              activeDot={{ r: 4, fill: "#00d67a", stroke: "#00ff87" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-xs" style={{ color: "#2a5e3a" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 inline-block" style={{ background: "#00d67a" }} /> Previsto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 inline-block opacity-40" style={{ background: "#00d67a", borderBottom: "1px dashed #00d67a" }} /> Intervalo de confiança
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 inline-block bg-red-500/50" /> Limiar de alerta
        </span>
      </div>
    </div>
  );
}
