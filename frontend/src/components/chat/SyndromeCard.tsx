"use client";

import { motion } from "framer-motion";
import { AlertTriangle, MapPin, Clock, CheckCircle, Stethoscope, Phone, Navigation, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { SyndromeResult, NearestClinic } from "@/store/chatStore";

interface Props {
  syndrome: SyndromeResult;
  clinics: NearestClinic[];
}

const urgencyConfig = {
  low:       { label: "Baixa urgência",  color: "#00d67a",  icon: CheckCircle },
  medium:    { label: "Urgência média",  color: "#facc15",  icon: AlertTriangle },
  high:      { label: "Alta urgência",   color: "#f97316",  icon: AlertTriangle },
  emergency: { label: "EMERGÊNCIA",      color: "#ef4444",  icon: AlertTriangle },
};

const NODE_TYPE_LABEL: Record<string, string> = {
  hospital: "Hospital",
  clinic:   "Clínica",
  pharmacy: "Farmácia",
};

const NODE_TYPE_COLOR: Record<string, string> = {
  hospital: "#ef4444",
  clinic:   "#818cf8",
  pharmacy: "#facc15",
};

export default function SyndromeCard({ syndrome, clinics }: Props) {
  const router  = useRouter();
  const urgency = urgencyConfig[syndrome.urgency_level] ?? urgencyConfig.low;
  const UrgencyIcon = urgency.icon;
  const confidence = Math.round(syndrome.confidence * 100);

  const goToMap = () => router.push("/patient/map");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(4,18,9,0.95)", border: "1px solid #0d3320" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: "#2a5e3a" }}>
            Síndrome identificada
          </p>
          <h3 className="font-display font-bold text-lg text-white">{syndrome.syndrome_name}</h3>
          {syndrome.icd10_code && (
            <span className="text-xs font-mono" style={{ color: "rgba(0,214,122,0.5)" }}>CID-10: {syndrome.icd10_code}</span>
          )}
        </div>
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
          style={{ background: `${urgency.color}18`, border: `1px solid ${urgency.color}40`, color: urgency.color }}>
          <UrgencyIcon className="w-3.5 h-3.5" />
          {urgency.label}
        </span>
      </div>

      {/* Confiança */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: "#2a5e3a" }}>
          <span>Confiança diagnóstica</span>
          <span className="font-mono" style={{ color: "#00d67a" }}>{confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#061a0e" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#00d67a,#00ff87)" }}
          />
        </div>
      </div>

      {/* Sintomas */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#2a5e3a" }}>Sintomas relatados</p>
        <div className="flex flex-wrap gap-1.5">
          {syndrome.symptoms.map((s) => (
            <span key={s} className="px-2 py-1 rounded-lg text-xs"
              style={{ background: "rgba(0,214,122,0.06)", border: "1px solid rgba(0,214,122,0.15)", color: "#a8d5b5" }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Recomendações */}
      {syndrome.recommendations?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#2a5e3a" }}>Recomendações</p>
          <ul className="space-y-1.5">
            {syndrome.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#a8d5b5" }}>
                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#00d67a" }} />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estabelecimentos próximos */}
      {clinics.length > 0 && (
        <div className="pt-3" style={{ borderTop: "1px solid #0d3320" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: "#2a5e3a" }}>
              <MapPin className="w-3 h-3" style={{ color: "#00d67a" }} />
              Locais próximos
            </p>
            <button
              onClick={goToMap}
              className="flex items-center gap-1 text-[10px] font-mono transition-colors"
              style={{ color: "#2a5e3a" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#00d67a")}
              onMouseLeave={e => (e.currentTarget.style.color = "#2a5e3a")}
            >
              Ver mapa completo <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="space-y-2">
            {clinics.map((clinic, i) => {
              const typeColor = NODE_TYPE_COLOR[(clinic as any).node_type ?? "clinic"] ?? "#818cf8";
              const typeLabel = NODE_TYPE_LABEL[(clinic as any).node_type ?? "clinic"] ?? "Local";
              const isRegistered = (clinic as any).registered;

              return (
                <motion.div
                  key={clinic.clinic_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl p-3 cursor-pointer group"
                  style={i === 0
                    ? { border: "1px solid rgba(0,214,122,0.25)", background: "rgba(0,214,122,0.05)" }
                    : { border: "1px solid #0d3320", background: "rgba(6,26,14,0.5)" }
                  }
                  onClick={goToMap}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {i === 0 && (
                          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: "#00d67a" }}>
                            <Stethoscope className="w-2.5 h-2.5" /> Recomendado
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                          {typeLabel}
                        </span>
                        {isRegistered && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(0,214,122,0.08)", color: "#00d67a", border: "1px solid rgba(0,214,122,0.2)" }}>
                            no sistema
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white font-medium truncate">{clinic.clinic_name}</p>
                      {clinic.address && (
                        <p className="text-xs truncate mt-0.5" style={{ color: "#2a5e3a" }}>{clinic.address}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{ color: "#00d67a" }}>{clinic.distance_km} km</div>
                      <div className="text-xs flex items-center gap-1 justify-end" style={{ color: "#2a5e3a" }}>
                        <Clock className="w-3 h-3" />
                        ~{clinic.estimated_minutes} min
                      </div>
                    </div>
                  </div>

                  {/* Rota rápida + telefone */}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); goToMap(); }}
                      className="flex items-center gap-1 text-xs font-medium transition-colors"
                      style={{ color: "rgba(0,214,122,0.7)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#00d67a")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,214,122,0.7)")}
                    >
                      <Navigation className="w-3 h-3" /> Como chegar
                    </button>
                    {clinic.phone && (
                      <a href={`tel:${clinic.phone}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs transition-colors"
                        style={{ color: "rgba(0,214,122,0.5)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#00d67a")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,214,122,0.5)")}
                      >
                        <Phone className="w-3 h-3" /> {clinic.phone}
                      </a>
                    )}
                    {isRegistered && (
                      <span className="ml-auto text-[10px]" style={{ color: "#2a5e3a" }}>
                        médicos disponíveis →
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CTA para mapa completo */}
          <button
            onClick={goToMap}
            className="w-full mt-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2"
            style={{ border: "1px solid rgba(0,214,122,0.2)", color: "#3d6e50", background: "rgba(0,214,122,0.04)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,214,122,0.4)"; e.currentTarget.style.color = "#00d67a"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,214,122,0.2)"; e.currentTarget.style.color = "#3d6e50"; }}
          >
            <MapPin className="w-3.5 h-3.5" />
            Ver grafo completo · agendar consulta
          </button>
        </div>
      )}
    </motion.div>
  );
}
