"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, Clock, Stethoscope } from "lucide-react";

interface Request {
  id: string;
  doctor_id: string;
  clinic_id: string;
  initiated_by: string;
  message: string;
  created_at: string;
}

export default function ClinicRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/memberships/pending");
      setRequests(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handle = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      await api.post(`/memberships/${id}/${action}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { console.error(e); }
    finally { setProcessing(null); }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-online" />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#3d6e50" }}>Vínculos médicos</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Solicitações de Vínculo</h1>
        <p className="text-sm mt-1" style={{ color: "#3d6e50" }}>
          {requests.length} solicitação(ões) pendente(s)
        </p>
      </motion.div>

      {loading ? (
        <div className="text-center py-16 font-mono text-sm" style={{ color: "#2a5e3a" }}>
          Carregando...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}>
          <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: "#0d3320" }} />
          <p style={{ color: "#3d6e50" }}>Nenhuma solicitação pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-5"
              style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.95)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)" }}>
                    <Stethoscope className="w-5 h-5" style={{ color: "#00d67a" }} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">
                      {req.initiated_by === "doctor" ? "Médico solicitou vínculo" : "Você convidou este médico"}
                    </p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: "#2a5e3a" }}>ID: {req.doctor_id.slice(0, 8)}...</p>
                    {req.message && <p className="text-xs mt-1 italic" style={{ color: "#3d6e50" }}>{req.message}</p>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handle(req.id, "approve")}
                    disabled={processing === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                    style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)", color: "#00d67a" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,214,122,0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,214,122,0.08)")}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() => handle(req.id, "reject")}
                    disabled={processing === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Recusar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
