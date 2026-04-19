"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
});
type Form = z.infer<typeof schema>;

const F = ({ label, error, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-mono text-[#3d6e50] uppercase tracking-widest">{label}</label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export default function RegisterPatientPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError("");
    try {
      const res = await api.post("/auth/register/patient", data);
      setAuth(res.data.access_token, res.data.user_id, res.data.role);
      router.push("/patient");
    } catch (e: any) { setError(e.response?.data?.detail || "Erro ao cadastrar."); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <Link href="/register" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#3d6e50] hover:text-[#00d67a] transition-colors"
            style={{ background: "rgba(0,214,122,0.05)", border: "1px solid var(--border)" }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.25)" }}>
            <User className="w-5 h-5 text-[#00d67a]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white">Cadastro de Paciente</h1>
            <p className="text-xs text-[#3d6e50]">Preencha seus dados pessoais</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-7 space-y-5">
          {error && <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

          <F label="Nome completo" error={errors.full_name?.message}>
            <input {...register("full_name")} placeholder="João da Silva" className="input-bio" />
          </F>
          <F label="Email" error={errors.email?.message}>
            <input {...register("email")} type="email" placeholder="seu@email.com" className="input-bio" />
          </F>
          <F label="Senha" error={errors.password?.message}>
            <input {...register("password")} type="password" placeholder="Mínimo 6 caracteres" className="input-bio" />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="CPF" error={errors.cpf?.message}><input {...register("cpf")} placeholder="000.000.000-00" className="input-bio" /></F>
            <F label="Telefone" error={errors.phone?.message}><input {...register("phone")} placeholder="(11) 9 0000-0000" className="input-bio" /></F>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <F label="Cidade" error={errors.address_city?.message}><input {...register("address_city")} placeholder="São Paulo" className="input-bio" /></F>
            </div>
            <F label="UF" error={errors.address_state?.message}><input {...register("address_state")} placeholder="SP" maxLength={2} className="input-bio" /></F>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 mt-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-[#3d6e50] mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="text-[#00d67a] hover:text-[#00ff87] transition-colors font-medium">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
}
