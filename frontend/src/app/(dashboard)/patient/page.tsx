"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Map, BarChart3, ChevronRight, Activity, ArrowUpRight } from "lucide-react";

const cards = [
  {
    href: "/patient/chat",
    icon: MessageSquare,
    title: "Assistente Sentinela",
    desc: "Descreva seus sintomas e receba análise sindrômica com IA médica especializada",
    accent: "#00d67a",
    tag: "MedGemma · IA",
    cta: "Iniciar consulta",
    featured: true,
  },
  {
    href: "/patient/map",
    icon: Map,
    title: "Mapa de Clínicas",
    desc: "Encontre unidades próximas com a especialidade que você precisa",
    accent: "#06b6d4",
    tag: "Geolocalização",
    cta: "Ver mapa",
    featured: false,
  },
  {
    href: "/patient/history",
    icon: BarChart3,
    title: "Histórico",
    desc: "Consultas anteriores e relatórios sindrômicos gerados",
    accent: "#818cf8",
    tag: "Relatórios",
    cta: "Ver histórico",
    featured: false,
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};

export default function PatientDashboard() {
  const featured = cards[0];
  const rest = cards.slice(1);

  return (
    <div className="p-8 max-w-3xl">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="text-sm font-mono mb-1" style={{ color: "#2a5e3a" }}>
          {getGreeting()}
        </p>
        <h1 className="font-display font-black text-3xl text-white leading-tight mb-2">
          Como você está<br />
          <span style={{
            background: "linear-gradient(135deg, #00ff87, #00d67a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>se sentindo hoje?</span>
        </h1>
        <p className="text-sm" style={{ color: "#3d6e50" }}>
          O Sentinela está pronto para te ajudar.
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
        {/* Card principal */}
        <motion.div variants={item}>
          <Link href={featured.href}>
            <div
              className="relative rounded-2xl p-6 overflow-hidden cursor-pointer group transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(0,214,122,0.1) 0%, rgba(0,100,50,0.06) 100%)",
                border: "1px solid rgba(0,214,122,0.2)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,214,122,0.4)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 40px rgba(0,214,122,0.1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,214,122,0.2)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              {/* Fundo decorativo */}
              <div className="absolute right-0 top-0 w-48 h-48 opacity-[0.04] pointer-events-none"
                style={{
                  background: "radial-gradient(circle, #00ff87 0%, transparent 70%)",
                  transform: "translate(30%, -30%)",
                }} />

              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(0,214,122,0.12)", border: "1px solid rgba(0,214,122,0.25)" }}>
                  <featured.icon className="w-5 h-5 text-[#00d67a]" />
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(0,214,122,0.08)", color: "#00d67a", border: "1px solid rgba(0,214,122,0.15)" }}>
                  {featured.tag}
                </span>
              </div>

              <h3 className="font-display font-bold text-white text-xl mb-2">{featured.title}</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "#4a7a5e" }}>{featured.desc}</p>

              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#00d67a" }}>
                {featured.cta}
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Cards menores */}
        <div className="grid grid-cols-2 gap-4">
          {rest.map((card) => (
            <motion.div key={card.href} variants={item}>
              <Link href={card.href}>
                <div
                  className="rounded-2xl p-5 cursor-pointer group transition-all duration-300 h-full"
                  style={{
                    background: "rgba(5,16,9,0.9)",
                    border: "1px solid rgba(13,51,32,0.7)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = card.accent + "40";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(8,22,13,0.95)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(13,51,32,0.7)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(5,16,9,0.9)";
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: card.accent + "12", border: `1px solid ${card.accent}25` }}>
                    <card.icon className="w-4 h-4" style={{ color: card.accent }} />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1.5">{card.title}</h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "#3d6e50" }}>{card.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-medium" style={{ color: card.accent }}>
                    {card.cta}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Status strip */}
        <motion.div variants={item}>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(3,12,6,0.8)", border: "1px solid rgba(13,51,32,0.5)" }}
          >
            <Activity className="w-3.5 h-3.5 text-[#00d67a] flex-shrink-0" />
            <p className="text-xs" style={{ color: "#2a5e3a" }}>
              Sistema de vigilância epidemiológica ativo · Monitoramento contínuo
            </p>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00ff87] flex-shrink-0"
              style={{ boxShadow: "0 0 6px #00ff87" }} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
