"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Loader2, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  crm: z.string().min(4),
  crm_state: z.string().length(2),
  specialty: z.string().optional(),
  phone: z.string().optional(),
});
type Form = z.infer<typeof schema>;
const F = ({ label, error, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-mono text-[#3d6e50] uppercase tracking-widest">{label}</label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export default function RegisterDoctorPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError("");
    try {
      const res = await api.post("/auth/register/doctor", data);
      setAuth(res.data.access_token, res.data.user_id, res.data.role);
      router.push("/doctor");
    } catch (e: any) { setError(e.response?.data?.detail || "Erro ao cadastrar."); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <Link href="/register" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#3d6e50] hover:text-[#818cf8] transition-colors"
            style={{ background: "rgba(129,140,248,0.05)", border: "1px solid var(--border)" }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.25)" }}>
            <Stethoscope className="w-5 h-5 text-[#818cf8]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white">Cadastro de Médico</h1>
            <p className="text-xs text-[#3d6e50]">Dados do profissional de saúde</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-7 space-y-5">
          {error && <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

          <F label="Nome completo" error={errors.full_name?.message}><input {...register("full_name")} placeholder="Dr. Ana Costa" className="input-bio" /></F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Email" error={errors.email?.message}><input {...register("email")} type="email" placeholder="dr@email.com" className="input-bio" /></F>
            <F label="Senha" error={errors.password?.message}><input {...register("password")} type="password" placeholder="••••••••" className="input-bio" /></F>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><F label="CRM" error={errors.crm?.message}><input {...register("crm")} placeholder="123456" className="input-bio" /></F></div>
            <F label="Estado" error={errors.crm_state?.message}><input {...register("crm_state")} placeholder="SP" maxLength={2} className="input-bio" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Especialidade" error={errors.specialty?.message}><input {...register("specialty")} placeholder="Clínica Geral" className="input-bio" /></F>
            <F label="Telefone" error={errors.phone?.message}><input {...register("phone")} placeholder="(11) 99999-0000" className="input-bio" /></F>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 mt-2"
            style={{ background: "linear-gradient(135deg,#818cf8,#6366f1)", boxShadow: "0 4px 20px rgba(129,140,248,0.3)" }}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "Cadastrando..." : "Criar conta"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
