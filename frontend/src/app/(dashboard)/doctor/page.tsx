"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Building2, Users, BarChart3, ChevronRight, Stethoscope, Activity } from "lucide-react";

const cards = [
  {
    href: "/doctor/clinics",
    icon: Building2,
    title: "Clínicas",
    desc: "Busque e solicite vínculo com unidades de saúde",
    accent: "#00d67a",
    tag: "Buscar",
  },
  {
    href: "/doctor/patients",
    icon: Users,
    title: "Pacientes",
    desc: "Histórico de atendimentos e relatórios sindrômicos",
    accent: "#06b6d4",
    tag: "Histórico",
  },
  {
    href: "/doctor/reports",
    icon: BarChart3,
    title: "Relatórios",
    desc: "Análises sindrômicas consolidadas da sua prática",
    accent: "#818cf8",
    tag: "Análises",
  },
];

export default function DoctorDashboard() {
  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-online" />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#3d6e50" }}>Sistema ativo</span>
        </div>
        <h1 className="font-display font-black text-4xl text-white mb-2">
          Área do <span className="gradient-text">Profissional</span>
        </h1>
        <p style={{ color: "#3d6e50" }}>Gerencie seus vínculos e acompanhe os pacientes</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={card.href}>
              <div
                className="card p-6 flex flex-col gap-5 h-full cursor-pointer group transition-all duration-200 hover:scale-[1.02]"
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = card.accent + "40";
                  el.style.boxShadow = `0 0 30px ${card.accent}12`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "";
                  el.style.boxShadow = "";
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: card.accent + "12", border: `1px solid ${card.accent}30` }}>
                    <card.icon className="w-6 h-6" style={{ color: card.accent }} />
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded-full"
                    style={{ background: card.accent + "10", color: card.accent, border: `1px solid ${card.accent}20` }}>
                    {card.tag}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-white text-lg mb-1.5">{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#3d6e50" }}>{card.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium transition-all"
                  style={{ color: card.accent }}>
                  Acessar
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="card p-5"
        style={{ borderColor: "rgba(0,214,122,0.15)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-4 h-4 text-[#00d67a]" />
          <h2 className="font-display font-semibold text-white text-sm">Status Profissional</h2>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: "#3d6e50" }}>
          <span className="status-online" />
          Perfil ativo. Vincule-se a clínicas para receber pacientes.
        </div>
      </motion.div>
    </div>
  );
}
