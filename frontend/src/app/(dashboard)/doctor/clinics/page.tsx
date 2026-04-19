"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Building2, MapPin, Send, CheckCircle, Loader2 } from "lucide-react";

interface Clinic {
  id: string;
  name: string;
  specialties: string[];
  address_city: string;
  address_state: string;
  phone?: string;
  is_emergency: boolean;
}

export default function DoctorClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get("/clinics/").then((r) => setClinics(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sendRequest = async (clinicId: string) => {
    setRequesting(clinicId);
    try {
      await api.post("/memberships/request", { target_id: clinicId, message: "Gostaria de me vincular a esta clínica." });
      setSent((prev) => new Set([...prev, clinicId]));
    } catch (e: any) {
      alert(e.response?.data?.detail || "Erro ao enviar solicitação");
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-online" />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#3d6e50" }}>Busca de vínculos</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Clínicas disponíveis</h1>
        <p className="text-sm mt-1" style={{ color: "#3d6e50" }}>Solicite vínculo com as unidades de saúde</p>
      </motion.div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#00d67a" }} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {clinics.map((clinic, i) => (
            <motion.div
              key={clinic.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-5"
              style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)" }}>
                    <Building2 className="w-5 h-5" style={{ color: "#00d67a" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{clinic.name}</h3>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#2a5e3a" }}>
                      <MapPin className="w-3 h-3" />
                      {clinic.address_city} - {clinic.address_state}
                    </p>
                  </div>
                </div>
                {clinic.is_emergency && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    24h
                  </span>
                )}
              </div>

              {clinic.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {clinic.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "rgba(0,214,122,0.06)", border: "1px solid rgba(0,214,122,0.12)", color: "#3d6e50" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => sendRequest(clinic.id)}
                disabled={!!requesting || sent.has(clinic.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                style={sent.has(clinic.id)
                  ? { background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)", color: "#00d67a" }
                  : { background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", color: "#818cf8" }
                }
              >
                {requesting === clinic.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : sent.has(clinic.id) ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Solicitado</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Solicitar vínculo</>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
