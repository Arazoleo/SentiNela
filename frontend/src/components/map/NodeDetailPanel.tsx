"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Hospital, Stethoscope, Pill, MapPin, Phone, Clock,
  Calendar, Sparkles, CheckCircle, Loader2, AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { GraphNode } from "./EpidemicMap";

interface Doctor {
  doctor_id: string;
  full_name: string;
  specialty: string | null;
  crm: string;
  biography: string | null;
  phone: string | null;
  score: number;
  slots?: { datetime_utc: string; datetime_local: string }[];
}

interface NodeDetail {
  registered: boolean;
  clinic_id?: string;
  name?: string;
  address?: string;
  phone?: string;
  description?: string;
  specialties?: string[];
  operating_hours?: Record<string, string> | null;
  is_emergency?: boolean;
  doctors?: Doctor[];
}

interface Props {
  node: GraphNode | null;
  syndrome?: string | null;
  onClose: () => void;
}

const TYPE_ICON: Record<string, any> = {
  hospital: Hospital,
  clinic:   Stethoscope,
  pharmacy: Pill,
};

const TYPE_COLOR: Record<string, string> = {
  hospital: "#ef4444",
  clinic:   "#818cf8",
  pharmacy: "#facc15",
};

const DAY_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function NodeDetailPanel({ node, syndrome, onClose }: Props) {
  const [detail,         setDetail]         = useState<NodeDetail | null>(null);
  const [loadingDetail,  setLoadingDetail]   = useState(false);
  const [doctorSlots,    setDoctorSlots]     = useState<Doctor[]>([]);
  const [loadingSlots,   setLoadingSlots]    = useState(false);
  const [selectedDoctor, setSelectedDoctor]  = useState<string | null>(null);
  const [selectedSlot,   setSelectedSlot]    = useState<string | null>(null);
  const [booking,        setBooking]         = useState(false);
  const [booked,         setBooked]          = useState<any | null>(null);
  const [agentBooking,   setAgentBooking]    = useState(false);
  const [error,          setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!node) { setDetail(null); setDoctorSlots([]); setBooked(null); return; }
    setDetail(null);
    setDoctorSlots([]);
    setBooked(null);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setError(null);

    setLoadingDetail(true);
    api.get(`/clinics/detail/${node.id}`, { params: { syndrome: syndrome ?? undefined } })
      .then(r => setDetail(r.data))
      .catch(() => setDetail({ registered: false, doctors: [] }))
      .finally(() => setLoadingDetail(false));
  }, [node?.id]);

  // Load slots when we know it's a registered clinic
  useEffect(() => {
    if (!detail?.registered || !detail.clinic_id) return;
    setLoadingSlots(true);
    api.get(`/appointments/clinic/${detail.clinic_id}/doctors`, {
      params: { syndrome: syndrome ?? undefined, days: 7 },
    })
      .then(r => setDoctorSlots(r.data))
      .catch(() => setDoctorSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [detail?.clinic_id]);

  if (!node) return null;

  const typeColor = TYPE_COLOR[node.node_type] ?? "#818cf8";
  const TypeIcon  = TYPE_ICON[node.node_type] ?? Stethoscope;

  async function handleManualBook() {
    if (!selectedSlot || !selectedDoctor || !detail?.clinic_id) return;
    setBooking(true);
    setError(null);
    try {
      const res = await api.post("/appointments", {
        clinic_id:    detail.clinic_id,
        doctor_id:    selectedDoctor,
        scheduled_at: selectedSlot,
        reason:       syndrome ?? undefined,
      });
      setBooked(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao agendar.");
    } finally {
      setBooking(false);
    }
  }

  async function handleAgentBook() {
    if (!detail?.clinic_id) return;
    setAgentBooking(true);
    setError(null);
    try {
      const res = await api.post("/appointments/agent-book", {
        clinic_id:    detail.clinic_id,
        syndrome_name: syndrome ?? undefined,
        preferred_days: 7,
      });
      setBooked(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Agente não encontrou disponibilidade.");
    } finally {
      setAgentBooking(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="panel"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 35 }}
        className="absolute top-0 right-0 h-full w-80 flex flex-col overflow-hidden z-20"
        style={{
          background: "rgba(2,14,7,0.97)",
          borderLeft: "1px solid #0d3320",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 flex-shrink-0" style={{ borderBottom: "1px solid #0d3320" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${typeColor}18`, border: `1px solid ${typeColor}30` }}>
            <TypeIcon className="w-4.5 h-4.5" style={{ color: typeColor, width: 18, height: 18 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: typeColor }}>
              {node.node_type === "hospital" ? "Hospital" : node.node_type === "pharmacy" ? "Farmácia" : "Clínica"}
              {node.is_emergency && <span className="ml-2 text-[#f87171]">· Emergência</span>}
            </p>
            <h2 className="text-sm font-semibold text-white leading-snug">{node.name}</h2>
            {node.address && (
              <p className="text-xs mt-0.5 truncate" style={{ color: "#3d6e50" }}>{node.address}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "#2a5e3a" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#00d67a")}
            onMouseLeave={e => (e.currentTarget.style.color = "#2a5e3a")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {loadingDetail && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "#2a5e3a" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Carregando detalhes...
            </div>
          )}

          {/* Info */}
          {detail && (
            <>
              {detail.phone && (
                <a href={`tel:${detail.phone}`}
                  className="flex items-center gap-2 text-xs transition-colors"
                  style={{ color: "#3d6e50" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#00d67a")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#3d6e50")}>
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  {detail.phone}
                </a>
              )}

              {node.opening_hours && (
                <div className="flex items-start gap-2 text-xs" style={{ color: "#3d6e50" }}>
                  <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="font-mono text-[10px]">{node.opening_hours}</span>
                </div>
              )}

              {detail.description && (
                <p className="text-xs leading-relaxed" style={{ color: "#a8d5b5" }}>{detail.description}</p>
              )}

              {detail.specialties && detail.specialties.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#2a5e3a" }}>Especialidades</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.specialties.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded text-[10px]"
                        style={{ background: "rgba(0,214,122,0.06)", border: "1px solid rgba(0,214,122,0.15)", color: "#a8d5b5" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Not registered */}
              {!detail.registered && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(42,94,58,0.08)", border: "1px solid #0d3320", color: "#3d6e50" }}>
                  Este local é do OpenStreetMap e ainda não possui cadastro no Sentinela. Agendamento não disponível.
                </div>
              )}
            </>
          )}

          {/* Booking confirmed */}
          {booked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-4 space-y-2"
              style={{ background: "rgba(0,214,122,0.06)", border: "1px solid rgba(0,214,122,0.25)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "#00d67a" }} />
                <p className="text-sm font-semibold text-white">Consulta solicitada!</p>
              </div>
              <p className="text-xs" style={{ color: "#a8d5b5" }}>
                <strong style={{ color: "#00d67a" }}>Médico:</strong> {booked.doctor_name}
              </p>
              <p className="text-xs" style={{ color: "#a8d5b5" }}>
                <strong style={{ color: "#00d67a" }}>Data:</strong>{" "}
                {new Date(booked.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
              <p className="text-xs font-mono" style={{ color: "#3d6e50" }}>Status: pendente de confirmação</p>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs rounded-xl p-3"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Doctors + Slots */}
          {detail?.registered && !booked && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "#2a5e3a" }}>
                <Stethoscope className="w-3 h-3" /> Médicos disponíveis
                {syndrome && <span style={{ color: "#818cf8" }}>· para {syndrome}</span>}
              </p>

              {loadingSlots && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "#2a5e3a" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando agenda...
                </div>
              )}

              {!loadingSlots && doctorSlots.length === 0 && (
                <p className="text-xs" style={{ color: "#3d6e50" }}>Nenhum horário disponível nos próximos 7 dias.</p>
              )}

              {doctorSlots.map((doc) => (
                <div key={doc.doctor_id} className="mb-3">
                  <button
                    onClick={() => setSelectedDoctor(selectedDoctor === doc.doctor_id ? null : doc.doctor_id)}
                    className="w-full text-left rounded-xl p-2.5 transition-all"
                    style={{
                      background: selectedDoctor === doc.doctor_id ? "rgba(129,140,248,0.1)" : "rgba(4,18,9,0.5)",
                      border:     selectedDoctor === doc.doctor_id ? "1px solid rgba(129,140,248,0.3)" : "1px solid #0d3320",
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-white">{doc.full_name}</p>
                        <p className="text-[10px]" style={{ color: "#818cf8" }}>{doc.specialty ?? "Clínico Geral"}</p>
                        <p className="text-[10px] font-mono" style={{ color: "#2a5e3a" }}>{doc.crm}</p>
                      </div>
                      {doc.score > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: "rgba(129,140,248,0.1)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.2)" }}>
                          IA match
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Slots for selected doctor */}
                  {selectedDoctor === doc.doctor_id && doc.slots && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {doc.slots.map((slot) => (
                        <button
                          key={slot.datetime_utc}
                          onClick={() => setSelectedSlot(selectedSlot === slot.datetime_utc ? null : slot.datetime_utc)}
                          className="px-2 py-1 rounded-lg text-[10px] font-mono transition-all"
                          style={{
                            background: selectedSlot === slot.datetime_utc ? "rgba(0,214,122,0.15)" : "rgba(4,18,9,0.8)",
                            border:     selectedSlot === slot.datetime_utc ? "1px solid rgba(0,214,122,0.4)" : "1px solid #0d3320",
                            color:      selectedSlot === slot.datetime_utc ? "#00d67a" : "#3d6e50",
                          }}>
                          {slot.datetime_local}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {detail?.registered && !booked && (
          <div className="p-4 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: "1px solid #0d3320" }}>
            {/* Manual book (only if slot selected) */}
            {selectedSlot && selectedDoctor && (
              <button
                onClick={handleManualBook}
                disabled={booking}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "rgba(0,214,122,0.12)", border: "1px solid rgba(0,214,122,0.3)", color: "#00d67a" }}>
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                {booking ? "Agendando..." : "Confirmar horário"}
              </button>
            )}

            {/* Agent book */}
            <button
              onClick={handleAgentBook}
              disabled={agentBooking || booking}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.25)", color: "#818cf8" }}>
              {agentBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {agentBooking ? "Agente buscando..." : "Deixar o agente escolher"}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
