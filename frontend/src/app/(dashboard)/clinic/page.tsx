"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Users, Stethoscope, BarChart3, ChevronRight, Activity, ArrowUpRight } from "lucide-react";
import AlertsPanel from "@/components/alerts/AlertsPanel";
import { useAlertsStore } from "@/store/alertsStore";

const cards = [
  {
    href: "/clinic/doctors",
    icon: Stethoscope,
    title: "Médicos",
    desc: "Gerencie sua equipe médica e vínculos ativos",
    accent: "#00d67a",
    tag: "Equipe",
  },
  {
    href: "/clinic/requests",
    icon: Users,
    title: "Solicitações",
    desc: "Pedidos de vínculo pendentes de aprovação",
    accent: "#06b6d4",
    tag: "Pendentes",
  },
  {
    href: "/clinic/forecast",
    icon: BarChart3,
    title: "Forecasting",
    desc: "Previsão de surtos com Prophet na sua região",
    accent: "#818cf8",
    tag: "Prophet",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};

export default function ClinicDashboard() {
  const { alerts } = useAlertsStore();
  const criticalCount = alerts.filter((a) => a.severity === "critical" || a.severity === "high").length;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-sm font-mono mb-1" style={{ color: "#2a5e3a" }}>Painel da clínica</p>
        <div className="flex items-end justify-between">
          <h1 className="font-display font-black text-3xl text-white">
            Central de{" "}
            <span style={{
              background: "linear-gradient(135deg, #00ff87, #00d67a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Vigilância
            </span>
          </h1>
          {criticalCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
                boxShadow: "0 0 12px rgba(239,68,68,0.15)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {criticalCount} alerta{criticalCount > 1 ? "s" : ""} crítico{criticalCount > 1 ? "s" : ""}
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Coluna principal */}
        <div className="space-y-6">
          {/* Cards de navegação */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
            {cards.map((card) => (
              <motion.div key={card.href} variants={item}>
                <Link href={card.href}>
                  <div
                    className="rounded-xl p-4 cursor-pointer group transition-all duration-200 h-full"
                    style={{ background: "rgba(5,16,9,0.9)", border: "1px solid rgba(13,51,32,0.7)" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = card.accent + "40";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${card.accent}10`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(13,51,32,0.7)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: card.accent + "12", border: `1px solid ${card.accent}25` }}>
                      <card.icon className="w-4 h-4" style={{ color: card.accent }} />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">{card.title}</p>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "#3d6e50" }}>{card.desc}</p>
                    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: card.accent }}>
                      Acessar
                      <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Status strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(3,12,6,0.8)", border: "1px solid rgba(13,51,32,0.5)" }}
          >
            <Activity className="w-3.5 h-3.5 text-[#00d67a] flex-shrink-0" />
            <p className="text-xs" style={{ color: "#2a5e3a" }}>
              Vigilância sindrômica ativa · Canal de alertas em tempo real conectado
            </p>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00ff87] flex-shrink-0"
              style={{ boxShadow: "0 0 6px #00ff87" }} />
          </motion.div>
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
