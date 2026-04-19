"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  is_emergency: z.boolean().default(false),
});
type Form = z.infer<typeof schema>;

const F = ({ label, error, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-mono text-[#3d6e50] uppercase tracking-widest">{label}</label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export default function RegisterClinicPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError("");
    try {
      const res = await api.post("/auth/register/clinic", data);
      setAuth(res.data.access_token, res.data.user_id, res.data.role);
      router.push("/clinic");
    } catch (e: any) { setError(e.response?.data?.detail || "Erro ao cadastrar."); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <Link href="/register" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#3d6e50] hover:text-[#06b6d4] transition-colors"
            style={{ background: "rgba(6,182,212,0.05)", border: "1px solid var(--border)" }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)" }}>
            <Building2 className="w-5 h-5 text-[#06b6d4]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white">Cadastro de Clínica</h1>
            <p className="text-xs text-[#3d6e50]">Dados da unidade de saúde</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-7 space-y-5">
          {error && <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

          <F label="Nome da Clínica" error={errors.name?.message}><input {...register("name")} placeholder="Clínica Saúde+" className="input-bio" /></F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Email" error={errors.email?.message}><input {...register("email")} type="email" placeholder="clinic@email.com" className="input-bio" /></F>
            <F label="Senha" error={errors.password?.message}><input {...register("password")} type="password" placeholder="••••••••" className="input-bio" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="CNPJ" error={errors.cnpj?.message}><input {...register("cnpj")} placeholder="00.000.000/0001-00" className="input-bio" /></F>
            <F label="Telefone" error={errors.phone?.message}><input {...register("phone")} placeholder="(11) 0000-0000" className="input-bio" /></F>
          </div>
          <F label="Endereço" error={errors.address_street?.message}><input {...register("address_street")} placeholder="Rua das Flores, 100" className="input-bio" /></F>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><F label="Cidade" error={errors.address_city?.message}><input {...register("address_city")} placeholder="São Paulo" className="input-bio" /></F></div>
            <F label="UF" error={errors.address_state?.message}><input {...register("address_state")} placeholder="SP" maxLength={2} className="input-bio" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Latitude" error={errors.latitude?.message}><input {...register("latitude")} type="number" step="0.000001" placeholder="-23.5505" className="input-bio" /></F>
            <F label="Longitude" error={errors.longitude?.message}><input {...register("longitude")} type="number" step="0.000001" placeholder="-46.6333" className="input-bio" /></F>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register("is_emergency")} type="checkbox" className="w-4 h-4 rounded border-[#0d3320] bg-[#041209] text-[#00d67a] focus:ring-[#00d67a] focus:ring-offset-0" />
            <span className="text-sm text-[#3d6e50]">Atendimento de emergência 24h</span>
          </label>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 mt-2"
            style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", boxShadow: "0 4px 20px rgba(6,182,212,0.3)" }}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "Cadastrando..." : "Criar conta"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
