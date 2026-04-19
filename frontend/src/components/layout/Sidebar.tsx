"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield, MessageSquare, Map, BarChart3, Users,
  Settings, Stethoscope, Building2, Bell, LogOut, Activity, Home,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const navByRole = {
  patient: [
    { href: "/patient",         icon: Home,           label: "Início" },
    { href: "/patient/chat",    icon: MessageSquare,  label: "Assistente" },
    { href: "/patient/map",     icon: Map,            label: "Mapa" },
    { href: "/patient/history", icon: BarChart3,      label: "Histórico" },
  ],
  clinic: [
    { href: "/clinic",          icon: Home,           label: "Início" },
    { href: "/clinic/doctors",  icon: Stethoscope,    label: "Médicos" },
    { href: "/clinic/requests", icon: Users,          label: "Solicitações" },
    { href: "/clinic/forecast", icon: BarChart3,      label: "Epidemiologia" },
    { href: "/clinic/settings", icon: Settings,       label: "Configurações" },
  ],
  doctor: [
    { href: "/doctor",          icon: Home,           label: "Início" },
    { href: "/doctor/clinics",  icon: Building2,      label: "Clínicas" },
    { href: "/doctor/patients", icon: Users,          label: "Pacientes" },
    { href: "/doctor/reports",  icon: BarChart3,      label: "Relatórios" },
  ],
};

const roleLabel = { patient: "Paciente", clinic: "Clínica", doctor: "Médico" };

export default function Sidebar() {
  const pathname = usePathname();
  const { role, logout } = useAuthStore();
  const router = useRouter();
  const nav = navByRole[role as keyof typeof navByRole] || [];

  return (
    <aside
      className="w-56 h-screen flex flex-col fixed left-0 top-0 z-40"
      style={{
        background: "rgba(2,10,5,0.97)",
        borderRight: "1px solid rgba(13,51,32,0.6)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <Link href={`/${role}`} className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "rgba(0,214,122,0.1)", border: "1px solid rgba(0,214,122,0.25)" }}>
            <Shield className="w-4 h-4 text-[#00d67a]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00ff87]"
              style={{ boxShadow: "0 0 6px #00ff87" }} />
          </div>
          <span className="font-display font-black text-base tracking-wide text-[#00d67a]"
            style={{ textShadow: "0 0 20px rgba(0,214,122,0.4)" }}>
            SENTINELA
          </span>
        </Link>
      </div>

      {/* Role chip */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(0,214,122,0.05)", border: "1px solid rgba(0,214,122,0.1)" }}>
          <Activity className="w-3 h-3 text-[#00d67a]" />
          <span className="text-xs font-mono text-[#3d6e50]">{roleLabel[role as keyof typeof roleLabel] || "—"}</span>
        </div>
      </div>

      {/* Divisor */}
      <div className="mx-5 mb-3 h-px" style={{ background: "rgba(13,51,32,0.6)" }} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const isActive = pathname === item.href ||
            (item.href.split("/").length > 2 && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group"
                style={isActive ? {
                  background: "rgba(0,214,122,0.1)",
                  color: "#00d67a",
                } : {
                  color: "#4a7a5e",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: "#00d67a", boxShadow: "0 0 8px #00d67a" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-[#00d67a]" : "text-[#2a5e3a] group-hover:text-[#4a7a5e]"}`} />
                <span className={`transition-colors ${isActive ? "text-[#00d67a]" : "group-hover:text-[#a8d5b5]"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00d67a]"
                    style={{ boxShadow: "0 0 6px #00d67a" }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5 pt-3 space-y-0.5" style={{ borderTop: "1px solid rgba(13,51,32,0.6)" }}>
        <Link href="/notifications">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#2a5e3a] hover:text-[#a8d5b5] hover:bg-[rgba(0,214,122,0.04)] transition-all cursor-pointer">
            <Bell className="w-4 h-4" />
            Notificações
          </div>
        </Link>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#2a5e3a] hover:text-red-400 hover:bg-[rgba(239,68,68,0.05)] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
