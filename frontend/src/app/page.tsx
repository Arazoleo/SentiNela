"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import {
  Activity, MapPin, Brain, BarChart3,
  ChevronRight, Shield, Stethoscope, AlertTriangle, Clock, Building2
} from "lucide-react";

// ─── ECG SVG path ──────────────────────────────────────────
function ECGLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 60" className={className} fill="none" preserveAspectRatio="none">
      <path
        d="M0,30 L80,30 L100,30 L110,5 L120,55 L130,5 L140,30 L160,30
           L240,30 L260,30 L270,5 L280,55 L290,5 L300,30 L320,30
           L400,30 L420,30 L430,5 L440,55 L450,5 L460,30 L480,30 L600,30"
        stroke="url(#ecgGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        strokeDashoffset="1000"
        style={{
          animation: "draw-ecg 3s ease-out forwards, pulse-ecg 3s ease-in-out 3s infinite"
        }}
      />
      <defs>
        <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#00d67a" stopOpacity="0" />
          <stop offset="30%"  stopColor="#00d67a" stopOpacity="0.8" />
          <stop offset="70%"  stopColor="#00ff87" stopOpacity="1" />
          <stop offset="100%" stopColor="#00d67a" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Partículas flutuantes ─────────────────────────────────
// Valores fixos para evitar hydration mismatch (Math.random() SSR ≠ client)
const PARTICLE_DATA = [
  { id: 0,  x: 12.4, y: 8.7,  size: 2.1, delay: 0.3, duration: 11.2 },
  { id: 1,  x: 87.3, y: 15.2, size: 1.4, delay: 1.7, duration: 8.6  },
  { id: 2,  x: 34.6, y: 72.1, size: 2.8, delay: 0.9, duration: 13.4 },
  { id: 3,  x: 65.9, y: 44.3, size: 1.7, delay: 2.4, duration: 9.1  },
  { id: 4,  x: 5.2,  y: 58.6, size: 2.3, delay: 3.1, duration: 10.7 },
  { id: 5,  x: 92.1, y: 81.4, size: 1.2, delay: 0.6, duration: 7.8  },
  { id: 6,  x: 47.8, y: 23.9, size: 2.6, delay: 1.3, duration: 12.3 },
  { id: 7,  x: 73.5, y: 67.2, size: 1.9, delay: 2.8, duration: 9.9  },
  { id: 8,  x: 21.3, y: 91.5, size: 2.4, delay: 0.2, duration: 14.1 },
  { id: 9,  x: 56.7, y: 36.8, size: 1.6, delay: 3.6, duration: 8.3  },
  { id: 10, x: 38.9, y: 54.1, size: 2.0, delay: 1.1, duration: 11.8 },
  { id: 11, x: 79.4, y: 9.3,  size: 1.3, delay: 2.2, duration: 7.4  },
  { id: 12, x: 14.7, y: 33.7, size: 2.7, delay: 3.9, duration: 13.7 },
  { id: 13, x: 61.2, y: 88.6, size: 1.8, delay: 0.7, duration: 10.2 },
  { id: 14, x: 43.1, y: 17.4, size: 2.2, delay: 1.5, duration: 8.9  },
  { id: 15, x: 95.6, y: 52.3, size: 1.5, delay: 2.9, duration: 12.6 },
  { id: 16, x: 27.8, y: 76.9, size: 2.9, delay: 0.4, duration: 9.4  },
  { id: 17, x: 68.3, y: 29.5, size: 1.1, delay: 3.3, duration: 14.8 },
  { id: 18, x: 50.5, y: 63.2, size: 2.5, delay: 1.8, duration: 7.1  },
  { id: 19, x: 83.7, y: 45.8, size: 1.0, delay: 2.6, duration: 11.5 },
];

function Particles() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {PARTICLE_DATA.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(0,214,122,0.6)",
            boxShadow: "0 0 6px rgba(0,214,122,0.5)",
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Stats animados ────────────────────────────────────────
function AnimatedStat({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="stat-number mb-1">{value}</div>
      <div className="text-xs text-[#3d6e50] uppercase tracking-widest font-mono">{label}</div>
    </motion.div>
  );
}

// ─── Feature card ──────────────────────────────────────────
const features = [
  {
    icon: Brain,
    title: "IA Sindrômica",
    desc: "MedGemma analisa sintomas em linguagem natural e classifica síndromes com precisão médica.",
    tag: "MedGemma 4B",
  },
  {
    icon: MapPin,
    title: "Grafo de Localização",
    desc: "Algoritmo Dijkstra encontra a clínica mais próxima com a especialidade certa em milissegundos.",
    tag: "NetworkX",
  },
  {
    icon: BarChart3,
    title: "Forecasting",
    desc: "Prophet + LSTM preveem surtos com até 90 dias de antecedência por cidade e síndrome.",
    tag: "Prophet + LSTM",
  },
  {
    icon: Shield,
    title: "Vigilância Ativa",
    desc: "Cada consulta alimenta o mapa epidemiológico nacional em tempo real.",
    tag: "Real-time",
  },
];

const roles = [
  { Icon: Activity,    title: "Paciente",  desc: "Consulte seus sintomas e receba orientação imediata" },
  { Icon: Building2,   title: "Clínica",   desc: "Gerencie sua equipe e monitore dados epidemiológicos" },
  { Icon: Stethoscope, title: "Médico",    desc: "Vincule-se a clínicas e acompanhe relatórios sindrômicos" },
];

export default function LandingPage() {
  const [tick, setTick] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  // Contador de "casos monitorados"
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + Math.floor(Math.random() * 3));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen">
      {/* ─── Navbar ─────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#0d3320]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <Shield className="w-8 h-8 text-[#00d67a]" />
              <span className="status-online absolute -top-0.5 -right-0.5" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide text-[#00d67a] text-glow-sm">
              SENTINELA
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#3d6e50]">
            <span className="status-online inline-block" />
            <span>Sistema ativo · {(47382 + tick).toLocaleString("pt-BR")} casos monitorados</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm py-2 px-4">Entrar</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-5">Cadastrar</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
        <Particles />

        {/* Círculos de radar */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[300, 500, 700, 900].map((r, i) => (
            <motion.div
              key={r}
              className="absolute rounded-full border border-[#0d3320]"
              style={{ width: r, height: r }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.15, duration: 1 }}
            />
          ))}
          {/* Crosshair */}
          <div className="absolute w-4 h-4">
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#00d67a]/40" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-[#00d67a]/40" />
          </div>
        </div>

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 text-center max-w-5xl mx-auto"
        >
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[#0d3320] text-xs font-mono text-[#00d67a] mb-10"
          >
            <span className="status-online" />
            Vigilância epidemiológica ativa · Brasil
          </motion.div>

          {/* Wordmark principal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <h1 className="font-display font-black leading-none tracking-[-0.04em] select-none">
              <span
                className="block text-[clamp(5rem,18vw,14rem)] gradient-text"
                style={{ lineHeight: 0.9 }}
              >
                SENTINELA
              </span>
              <span className="block text-[clamp(1rem,3vw,2rem)] text-[#2a5e3a] font-mono font-normal tracking-[0.3em] mt-3 uppercase">
                Vigilância · Diagnóstico · Previsão
              </span>
            </h1>
          </motion.div>

          {/* ECG animado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="my-10 max-w-2xl mx-auto h-12 relative overflow-hidden"
          >
            <svg viewBox="0 0 600 48" fill="none" className="w-full h-full">
              <polyline
                points="0,24 60,24 80,24 90,4 100,44 110,4 120,24 140,24
                        220,24 240,24 250,4 260,44 270,4 280,24 300,24
                        380,24 400,24 410,4 420,44 430,4 440,24 460,24 600,24"
                stroke="url(#ecgG)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray="1200"
                strokeDashoffset="0"
                style={{ filter: "drop-shadow(0 0 6px #00d67a)" }}
              />
              <defs>
                <linearGradient id="ecgG" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#00d67a" stopOpacity="0" />
                  <stop offset="20%"  stopColor="#00d67a" stopOpacity="0.7" />
                  <stop offset="50%"  stopColor="#00ff87" stopOpacity="1" />
                  <stop offset="80%"  stopColor="#00d67a" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#00d67a" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Descrição */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-[#5a8a6a] text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Assistente sindrômico com <strong className="text-[#00d67a]">MedGemma</strong>,
            forecasting de epidemias e mapeamento inteligente de clínicas —
            tudo em um sistema de vigilância de saúde pública.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register" className="btn-primary text-base px-8 py-3.5">
              Acessar o sistema
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="btn-ghost text-base px-8 py-3.5">
              Já tenho conta
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="absolute bottom-0 left-0 right-0 glass border-t border-[#0d3320] px-8"
        >
          <div className="max-w-5xl mx-auto py-4 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-[#0d3320]">
            {[
              { v: "98.2%",   l: "Precisão" },
              { v: "< 3s",    l: "Análise" },
              { v: "30 dias", l: "Previsão" },
              { v: "24 / 7",  l: "Operação" },
            ].map((s, i) => (
              <div key={i} className={`${i > 0 ? "pl-6" : ""} flex items-center gap-3`}>
                <Activity className="w-4 h-4 text-[#00d67a] flex-shrink-0" />
                <div>
                  <div className="font-mono text-lg font-bold text-[#00d67a]">{s.v}</div>
                  <div className="text-[10px] text-[#3d6e50] uppercase tracking-widest">{s.l}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Features ───────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="text-xs font-mono text-[#00d67a] uppercase tracking-[0.3em] mb-3">
              [ tecnologia ]
            </p>
            <h2 className="font-display font-black text-4xl md:text-5xl text-white mb-4">
              Construído para <span className="gradient-text">salvar vidas</span>
            </h2>
            <p className="text-[#3d6e50] max-w-xl mx-auto">
              Cada componente foi projetado com precisão clínica e rigor científico
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card card-hover p-6 flex flex-col gap-4 scan-wrap"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--bio-dim)", border: "1px solid rgba(0,214,122,0.2)" }}>
                  <f.icon className="w-5 h-5 text-[#00d67a]" />
                </div>
                <div>
                  <div className="chip mb-2">{f.tag}</div>
                  <h3 className="font-display font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-[#3d6e50] text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Roles ──────────────────────────────────────── */}
      <section className="py-24 px-6 relative">
        {/* Linha decorativa */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 opacity-20"
          style={{ background: "linear-gradient(to bottom, transparent, #00d67a 30%, #00d67a 70%, transparent)" }} />

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-xs font-mono text-[#00d67a] uppercase tracking-[0.3em] mb-3">
              [ acesso ]
            </p>
            <h2 className="font-display font-black text-4xl text-white">
              Quem usa o <span className="gradient-text">Sentinela</span>?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="card p-8 text-center card-hover border-glow"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)" }}>
                  <r.Icon className="w-7 h-7 text-[#00d67a]" />
                </div>
                <h3 className="font-display font-bold text-2xl text-white mb-2">{r.title}</h3>
                <p className="text-[#3d6e50] text-sm">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA final ──────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto card p-14 text-center glow-bio scan-wrap"
          style={{ borderColor: "rgba(0,214,122,0.2)" }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ background: "var(--bio-dim)", border: "1px solid rgba(0,214,122,0.25)" }}>
            <Stethoscope className="w-10 h-10 text-[#00d67a]" />
          </div>
          <h2 className="font-display font-black text-4xl text-white mb-4">
            Faça parte da rede
          </h2>
          <p className="text-[#3d6e50] mb-10 text-lg">
            Cada cadastro fortalece a vigilância epidemiológica do Brasil.
          </p>
          <Link href="/register" className="btn-primary text-lg px-10 py-4 inline-flex">
            Criar conta gratuita
            <ChevronRight className="w-6 h-6" />
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-[#0d3320] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00d67a]" />
            <span className="font-display font-bold text-sm text-[#00d67a]">SENTINELA</span>
          </div>
          <p className="text-[#2a5e3a] text-xs font-mono">
            © 2026 — Vigilância Epidemiológica Inteligente
          </p>
          <div className="flex items-center gap-1 text-xs font-mono text-[#2a5e3a]">
            <span className="status-online" />
            Sistema operacional
          </div>
        </div>
      </footer>
    </main>
  );
}
