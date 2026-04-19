"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, User, Building2, Stethoscope, ChevronRight } from "lucide-react";

const roles = [
  {
    href: "/register/patient",
    icon: User,
    title: "Paciente",
    desc: "Consulte sintomas com IA e localize atendimento próximo",
    accent: "#00d67a",
    dim: "rgba(0,214,122,0.08)",
    border: "rgba(0,214,122,0.2)",
  },
  {
    href: "/register/clinic",
    icon: Building2,
    title: "Clínica",
    desc: "Cadastre sua unidade e monitore dados epidemiológicos",
    accent: "#06b6d4",
    dim: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.2)",
  },
  {
    href: "/register/doctor",
    icon: Stethoscope,
    title: "Médico",
    desc: "Vincule-se a clínicas e acompanhe relatórios sindrômicos",
    accent: "#818cf8",
    dim: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.2)",
  },
];

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Shield className="w-6 h-6 text-[#00d67a]" />
            <span className="font-display font-black text-xl gradient-text">SENTINELA</span>
          </Link>
          <h1 className="font-display font-black text-4xl text-white mb-3">
            Criar conta
          </h1>
          <p className="text-[#3d6e50]">Como você vai usar o Sentinela?</p>
        </motion.div>

        <div className="space-y-3">
          {roles.map((r, i) => (
            <motion.div
              key={r.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={r.href}>
                <div
                  className="card p-5 flex items-center gap-5 cursor-pointer group transition-all duration-200 hover:scale-[1.01]"
                  style={{ borderColor: "var(--border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = r.border; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${r.dim}`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: r.dim, border: `1px solid ${r.border}` }}>
                    <r.icon className="w-6 h-6" style={{ color: r.accent }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-white text-lg">{r.title}</h3>
                    <p className="text-[#3d6e50] text-sm mt-0.5">{r.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#2a5e3a] group-hover:translate-x-1 group-hover:text-[#00d67a] transition-all flex-shrink-0" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-[#3d6e50] mt-8">
          Já tem conta?{" "}
          <Link href="/login" className="text-[#00d67a] hover:text-[#00ff87] transition-colors font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
