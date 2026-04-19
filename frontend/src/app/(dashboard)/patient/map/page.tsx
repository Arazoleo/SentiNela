"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import {
  MapPin, Loader2, RefreshCw, Navigation, Hospital,
  Pill, Stethoscope, AlertTriangle, Sparkles, Route,
} from "lucide-react";
import type { GraphNode, GraphEdge, GraphRoute } from "@/components/map/EpidemicMap";
import NodeDetailPanel from "@/components/map/NodeDetailPanel";

const EpidemicMap = dynamic(() => import("@/components/map/EpidemicMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center rounded-2xl"
      style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.8)" }}>
      <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#00d67a" }} />
    </div>
  ),
});

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  route: GraphRoute | null;
  stats: { node_count: number; edge_count: number };
  source?: "osm" | "db" | "none";
  ai_recommendation?: AiRec | null;
}

interface AiRec {
  node_type: string;
  urgency: string;
  syndrome_name?: string;
  message: string;
  ai_active: boolean;
}

const RADIUS_OPTIONS = [2, 5, 10, 15];

const URGENCY_COLOR: Record<string, string> = {
  crítico: "#ef4444",
  alto:    "#f97316",
  moderado:"#facc15",
  baixo:   "#00d67a",
};

export default function PatientMapPage() {
  const [graphData,    setGraphData]    = useState<GraphData | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [locating,     setLocating]     = useState(false);
  const [userLat,      setUserLat]      = useState<number | undefined>();
  const [userLng,      setUserLng]      = useState<number | undefined>();
  const [radius,       setRadius]       = useState(5);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [selectedNode,  setSelectedNode]  = useState<GraphNode | null>(null);
  const [detailNode,    setDetailNode]    = useState<GraphNode | null>(null);
  const [activeRoute,   setActiveRoute]   = useState<GraphRoute | null>(null);

  const fetchGraph = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setDetailNode(null);
    setActiveRoute(null);
    try {
      const res = await api.get("/clinics/nearby-graph", {
        params: { lat, lng, radius_km: radius, emergency_only: emergencyOnly },
      });
      setGraphData(res.data);
      setActiveRoute(res.data.route ?? null);
    } catch {
      setError("Erro ao buscar estabelecimentos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [radius, emergencyOnly]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste navegador.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        setLocating(false);
        fetchGraph(lat, lng);
      },
      () => {
        setLocating(false);
        setError("Permissão de localização negada.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [fetchGraph]);

  // Select a facility → fetch real OSRM route + open detail panel
  const handleSelectNode = useCallback(async (node: GraphNode) => {
    if (!userLat || !userLng) return;
    setSelectedNode(node);
    setDetailNode(node);
    setRouteLoading(true);
    try {
      const res = await api.get("/clinics/route", {
        params: {
          from_lat: userLat, from_lng: userLng,
          to_lat: node.lat,  to_lng: node.lng,
        },
      });
      const osrm = res.data;
      setActiveRoute({
        target_data:       node,
        path_coords:       osrm.path_coords,
        total_km:          osrm.total_km,
        estimated_minutes: osrm.estimated_minutes,
        route_type:        "road",
      });
    } catch {
      // Fallback: straight-line to selected node
      setActiveRoute({
        target_data:       node,
        path_coords:       [{ lat: userLat, lng: userLng }, { lat: node.lat, lng: node.lng }],
        total_km:          parseFloat((Math.hypot(node.lat - userLat, node.lng - userLng) * 111).toFixed(3)),
        estimated_minutes: 5,
        route_type:        "straight_line",
      });
    } finally {
      setRouteLoading(false);
    }
  }, [userLat, userLng]);

  useEffect(() => { locate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (userLat && userLng) fetchGraph(userLat, userLng);
  }, [radius, emergencyOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const aiRec        = graphData?.ai_recommendation;
  const aiNodeId     = aiRec?.ai_active
    ? graphData?.route?.target_data?.id ?? null
    : null;
  const displayRoute = activeRoute;
  const nodeCount    = graphData?.stats.node_count ?? 0;
  const urgencyColor = aiRec ? (URGENCY_COLOR[aiRec.urgency] ?? "#818cf8") : "#00d67a";

  return (
    <div className="h-screen flex flex-col p-4 gap-3" style={{ background: "#020e07" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display font-bold text-xl text-white">Grafo de Saúde</h1>
          <p className="text-xs font-mono" style={{ color: "#2a5e3a" }}>
            {nodeCount > 0
              ? `${nodeCount} locais · ${graphData?.stats.edge_count} arestas · ${graphData?.source === "osm" ? "OpenStreetMap" : "base local"}`
              : "Grafo dinâmico · Dijkstra · OSRM"}
          </p>
        </div>
        <button
          onClick={locate}
          disabled={locating || loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
          style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.8)", color: "#3d6e50" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#00d67a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#3d6e50")}
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          {locating ? "Localizando..." : "Minha localização"}
        </button>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-3 flex-shrink-0 flex-wrap">

        <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
          style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.8)" }}>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#2a5e3a" }}>Raio</span>
          <div className="flex gap-1 ml-1">
            {RADIUS_OPTIONS.map((r) => (
              <button key={r} onClick={() => setRadius(r)}
                className="px-2 py-0.5 rounded-md text-xs font-mono transition-all"
                style={{
                  background: radius === r ? "rgba(0,214,122,0.15)" : "transparent",
                  border:     radius === r ? "1px solid rgba(0,214,122,0.3)" : "1px solid transparent",
                  color:      radius === r ? "#00d67a" : "#3d6e50",
                }}>
                {r}km
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setEmergencyOnly((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{
            border:     emergencyOnly ? "1px solid rgba(239,68,68,0.3)" : "1px solid #0d3320",
            background: emergencyOnly ? "rgba(239,68,68,0.08)"          : "rgba(4,18,9,0.8)",
            color:      emergencyOnly ? "#f87171"                        : "#3d6e50",
          }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Só emergências
        </button>

        <button
          onClick={() => userLat && userLng && fetchGraph(userLat, userLng)}
          disabled={!userLat || loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
          style={{ border: "1px solid #0d3320", background: "rgba(4,18,9,0.8)", color: "#3d6e50" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#00d67a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#3d6e50")}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {[
            { color: "#00d67a", label: "Você" },
            { color: "#ef4444", label: "Hospital" },
            { color: "#818cf8", label: "Clínica" },
            { color: "#facc15", label: "Farmácia" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 5px ${color}80` }} />
              <span className="text-xs" style={{ color: "#3d6e50" }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Recommendation banner */}
      <AnimatePresence>
        {aiRec && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl flex-shrink-0"
            style={{ background: "rgba(129,140,248,0.06)", border: `1px solid ${urgencyColor}30` }}>
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: urgencyColor }} />
            <div className="flex-1 min-w-0">
              {aiRec.syndrome_name && (
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: urgencyColor }}>
                    {aiRec.syndrome_name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase"
                    style={{ background: `${urgencyColor}18`, color: urgencyColor }}>
                    {aiRec.urgency}
                  </span>
                </div>
              )}
              <p className="text-xs" style={{ color: "#a8d5b5" }}>{aiRec.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active route banner */}
      <AnimatePresence>
        {displayRoute && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl flex-shrink-0"
            style={{ background: "rgba(0,214,122,0.06)", border: "1px solid rgba(0,214,122,0.2)" }}>
            <Route className="w-4 h-4 flex-shrink-0" style={{ color: "#00d67a" }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-white">{displayRoute.target_data.name}</span>
              {displayRoute.target_data.address &&
                <span className="text-xs ml-2" style={{ color: "#3d6e50" }}>{displayRoute.target_data.address}</span>}
              {displayRoute.route_type === "road" && (
                <span className="text-[10px] ml-2 font-mono" style={{ color: "#2a5e3a" }}>rota real</span>
              )}
            </div>
            {routeLoading
              ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#00d67a" }} />
              : (
                <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0" style={{ color: "#00d67a" }}>
                  <span>{displayRoute.total_km} km</span>
                  <span style={{ color: "#2a5e3a" }}>~{displayRoute.estimated_minutes} min</span>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <NodeDetailPanel
          node={detailNode}
          syndrome={aiRec?.syndrome_name ?? null}
          onClose={() => setDetailNode(null)}
        />
        <EpidemicMap
          nodes={graphData?.nodes ?? []}
          edges={graphData?.edges ?? []}
          route={displayRoute}
          userLat={userLat}
          userLng={userLng}
          loading={loading}
          selectedNodeId={selectedNode?.id}
          aiRecommendedId={aiNodeId}
          onSelectNode={handleSelectNode}
        />

        {!loading && !graphData && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <MapPin className="w-10 h-10 mx-auto mb-3" style={{ color: "#0d3320" }} />
              <p className="text-sm" style={{ color: "#2a5e3a" }}>Aguardando localização...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
