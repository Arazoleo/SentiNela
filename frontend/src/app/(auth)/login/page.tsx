"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Shield, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setError("");
    try {
      const res = await api.post("/auth/login", data);
      setAuth(res.data.access_token, res.data.user_id, res.data.role);
      router.push(`/${res.data.role}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Credenciais inválidas.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — decorativo */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center relative overflow-hidden bg-[#020b07] border-r border-[#0d3320]">
        {/* Círculos radar */}
        {[200, 340, 480, 620].map((r, i) => (
          <motion.div
            key={r}
            className="absolute rounded-full border border-[#0d3320]"
            style={{ width: r, height: r }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 glow-bio"
            style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.25)" }}>
            <Shield className="w-10 h-10 text-[#00d67a]" />
          </div>
          <h1 className="font-display font-black text-6xl gradient-text mb-4">SENTINELA</h1>
          <p className="text-[#2a5e3a] font-mono text-sm tracking-widest uppercase">
            Vigilância · Diagnóstico · Previsão
          </p>
          <div className="mt-12 space-y-3">
            {["Assistente sindrômico com MedGemma", "Forecasting epidemiológico Prophet + LSTM", "Geolocalização de clínicas em grafos"].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 text-sm text-[#3d6e50]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d67a] flex-shrink-0" style={{ boxShadow: "0 0 6px #00d67a" }} />
                {t}
              </motion.div>
            ))}
          </div>
        </div>
        {/* ECG no rodapé */}
        <div className="absolute bottom-8 left-8 right-8 h-8 opacity-30">
          <svg viewBox="0 0 400 32" fill="none" className="w-full h-full">
            <polyline points="0,16 60,16 70,16 78,3 86,29 94,3 102,16 120,16 180,16 190,3 198,29 206,3 214,16 240,16 300,16 310,3 318,29 326,3 334,16 360,16 400,16"
              stroke="#00d67a" strokeWidth="1.5" strokeLinecap="round" fill="none"
              style={{ filter: "drop-shadow(0 0 4px #00d67a)" }} />
          </svg>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Shield className="w-7 h-7 text-[#00d67a]" />
            <span className="font-display font-black text-2xl gradient-text">SENTINELA</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-black text-3xl text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-[#3d6e50] text-sm">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-xl text-sm text-red-400"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#3d6e50] uppercase tracking-widest">Email</label>
              <input {...register("email")} type="email" placeholder="seu@email.com" className="input-bio" />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#3d6e50] uppercase tracking-widest">Senha</label>
              <div className="relative">
                <input {...register("password")} type={showPwd ? "text" : "password"} placeholder="••••••••" className="input-bio pr-11" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2a5e3a] hover:text-[#00d67a] transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 mt-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {isSubmitting ? "Verificando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#0d3320] text-center text-sm text-[#3d6e50]">
            Não tem conta?{" "}
            <Link href="/register" className="text-[#00d67a] hover:text-[#00ff87] transition-colors font-medium">
              Cadastre-se gratuitamente
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
