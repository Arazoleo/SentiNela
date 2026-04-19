"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Stethoscope, UserX, Loader2, Plus } from "lucide-react";

interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  crm: string;
  full_name?: string;
}

export default function ClinicDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/memberships/doctors").then((r) => setDoctors(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-online" />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#3d6e50" }}>Equipe médica</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Médicos Vinculados</h1>
        <p className="text-sm mt-1" style={{ color: "#3d6e50" }}>
          {doctors.length} médico(s) na equipe
        </p>
      </motion.div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#00d67a" }} />
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}>
          <Stethoscope className="w-12 h-12 mx-auto mb-3" style={{ color: "#0d3320" }} />
          <p style={{ color: "#3d6e50" }}>Nenhum médico vinculado ainda</p>
          <p className="text-xs mt-1" style={{ color: "#1a4a28" }}>
            Aprove solicitações na aba Solicitações para adicionar médicos
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {doctors.map((doctor, i) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-5 flex items-start gap-4"
              style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)" }}>
                <Stethoscope className="w-5 h-5" style={{ color: "#00d67a" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {doctor.full_name || `Médico ${doctor.user_id.slice(0, 6)}`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#3d6e50" }}>{doctor.specialty}</p>
                {doctor.crm && (
                  <p className="text-xs font-mono mt-1" style={{ color: "#2a5e3a" }}>CRM: {doctor.crm}</p>
                )}
              </div>
              <span className="text-xs px-2 py-1 rounded-full"
                style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)", color: "#00d67a" }}>
                Ativo
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
