"use client";

import { useEffect, useRef } from "react";

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  name: string;
  node_type: "hospital" | "clinic" | "pharmacy" | "user" | string;
  is_emergency: boolean;
  phone?: string;
  address?: string;
  amenity?: string;
  opening_hours?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface GraphRoute {
  target_data: GraphNode;
  path_coords: { lat: number; lng: number }[];
  total_km: number;
  estimated_minutes: number;
  route_type?: "road" | "straight_line";
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  route?: GraphRoute | null;
  userLat?: number;
  userLng?: number;
  loading?: boolean;
  selectedNodeId?: string | null;
  aiRecommendedId?: string | null;
  onSelectNode?: (node: GraphNode) => void;
}

const NODE_COLORS: Record<string, string> = {
  hospital: "#ef4444",
  clinic:   "#818cf8",
  pharmacy: "#facc15",
  user:     "#00d67a",
};

function markerSvg(color: string, size = 28, pulse = false, selected = false) {
  const ring = pulse
    ? `<circle cx="14" cy="14" r="13" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.35"/>`
    : "";
  const selectedRing = selected
    ? `<circle cx="14" cy="14" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.8"/>
       <circle cx="14" cy="14" r="13.5" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>`
    : "";
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">
      ${ring}${selectedRing}
      <circle cx="14" cy="14" r="9" fill="${color}" fill-opacity="${selected ? 0.3 : 0.18}"/>
      <circle cx="14" cy="14" r="5.5" fill="${color}"/>
      <circle cx="14" cy="14" r="2" fill="white"/>
    </svg>`
  );
}

export default function EpidemicMap({
  nodes, edges, route, userLat, userLng, loading,
  selectedNodeId, aiRecommendedId, onSelectNode,
}: Props) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const layersRef  = useRef<any[]>([]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!, {
        center: [userLat ?? -23.5505, userLng ?? -46.6333],
        zoom: 14,
        zoomControl: false,
      });
      leafletRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers whenever data changes
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      layersRef.current.forEach((l) => map.removeLayer(l));
      layersRef.current = [];

      const add = (l: any) => { l.addTo(map); layersRef.current.push(l); return l; };

      // Graph edges (faint)
      edges.forEach(({ from, to }) => {
        const a = nodes.find((n) => n.id === from);
        const b = nodes.find((n) => n.id === to);
        if (!a || !b) return;
        add(L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
          color: "#0d3320", weight: 1, opacity: 0.4,
        }));
      });

      // Active route polyline (OSRM road or straight-line fallback)
      if (route?.path_coords && route.path_coords.length > 1) {
        const isRoad = route.route_type === "road";
        add(L.polyline(
          route.path_coords.map((p) => [p.lat, p.lng] as [number, number]),
          {
            color: "#00d67a",
            weight: isRoad ? 4 : 2.5,
            opacity: 0.9,
            dashArray: isRoad ? undefined : "10 6",
          }
        ));
      }

      // Health facility markers
      nodes.filter((n) => n.node_type !== "user").forEach((node) => {
        const isTarget   = route?.target_data?.id === node.id;
        const isSelected = selectedNodeId === node.id;
        const isAI       = aiRecommendedId === node.id;
        const active     = isTarget || isSelected;
        const color = active ? "#00d67a" : (NODE_COLORS[node.node_type] ?? "#818cf8");
        const iconSize: [number, number] = active ? [34, 34] : [28, 28];

        const icon = L.icon({
          iconUrl: `data:image/svg+xml;charset=utf-8,${markerSvg(color, iconSize[0], active, isSelected)}`,
          iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
          popupAnchor: [0, -iconSize[1] / 2 - 4],
        });

        const emergencyBadge = node.is_emergency
          ? `<span style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:4px">Emergência</span>`
          : "";
        const targetBadge = isTarget
          ? `<span style="background:rgba(0,214,122,0.15);border:1px solid rgba(0,214,122,0.3);color:#00d67a;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:4px">Recomendado</span>`
          : "";
        const aiBadge = isAI && !isTarget
          ? `<span style="background:rgba(129,140,248,0.15);border:1px solid rgba(129,140,248,0.3);color:#818cf8;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:4px">IA</span>`
          : "";

        const distLine = isTarget
          ? `<p style="margin:6px 0 0;font-size:11px;color:#00d67a;font-family:monospace">
              ${route!.total_km} km · ~${route!.estimated_minutes} min
              ${route!.route_type === "road" ? `<span style="opacity:.5"> · rota real</span>` : ""}
            </p>`
          : "";

        const routeBtn = onSelectNode
          ? `<button id="btn-route-${node.id}" style="
                margin-top:8px;width:100%;padding:5px 0;
                background:rgba(0,214,122,0.1);border:1px solid rgba(0,214,122,0.25);
                border-radius:6px;color:#00d67a;font-size:11px;font-family:Inter,sans-serif;
                cursor:pointer;
              ">Como chegar</button>`
          : "";

        const popup = `
          <div style="background:#041209;border:1px solid #0d3320;border-radius:8px;padding:10px 14px;min-width:200px;font-family:Inter,sans-serif">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#d4edda">
              ${node.name}${emergencyBadge}${targetBadge}${aiBadge}
            </p>
            ${node.address ? `<p style="margin:0 0 2px;font-size:11px;color:#3d6e50">${node.address}</p>` : ""}
            ${node.phone   ? `<p style="margin:0 0 2px;font-size:11px;color:#3d6e50">${node.phone}</p>` : ""}
            ${node.opening_hours ? `<p style="margin:0 0 2px;font-size:10px;color:#2a5e3a;font-family:monospace">${node.opening_hours}</p>` : ""}
            ${distLine}
            ${routeBtn}
          </div>`;

        const marker = add(
          L.marker([node.lat, node.lng], { icon })
           .bindPopup(popup, { className: "leaflet-dark-popup" })
        );

        // Click: select node + open popup
        marker.on("click", () => {
          onSelectNode?.(node);
        });

        // Wire "Como chegar" button after popup opens
        marker.on("popupopen", () => {
          const btn = document.getElementById(`btn-route-${node.id}`);
          btn?.addEventListener("click", () => {
            onSelectNode?.(node);
            marker.closePopup();
          });
        });
      });

      // User marker
      if (userLat && userLng) {
        const userIcon = L.icon({
          iconUrl: `data:image/svg+xml;charset=utf-8,${markerSvg("#00d67a", 34, true)}`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18],
        });
        add(L.marker([userLat, userLng], { icon: userIcon }).bindPopup(
          `<div style="background:#041209;border:1px solid #0d3320;border-radius:8px;padding:8px 12px;color:#a8d5b5;font-size:12px;font-family:monospace">
            <b style="color:#00d67a">Você</b><br/>Localização atual
          </div>`,
          { className: "leaflet-dark-popup" }
        ));
      }

      // Fit viewport
      const allPoints: [number, number][] = [
        ...(userLat && userLng ? [[userLat, userLng] as [number, number]] : []),
        ...nodes.filter((n) => n.node_type !== "user").map((n) => [n.lat, n.lng] as [number, number]),
      ];
      if (allPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 15 });
      } else if (allPoints.length === 1) {
        map.setView(allPoints[0], 14);
      }
    });
  }, [nodes, edges, route, userLat, userLng, selectedNodeId, aiRecommendedId]);

  return (
    <>
      <style>{`
        .leaflet-dark-popup .leaflet-popup-content-wrapper,
        .leaflet-dark-popup .leaflet-popup-tip {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-dark-popup .leaflet-popup-content { margin: 0 !important; }
        .leaflet-container { background: #020e07 !important; }
        .leaflet-control-attribution {
          background: rgba(2,14,7,0.7) !important;
          color: #1e4a2e !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #2a5e3a !important; }
        .leaflet-bar a {
          background: rgba(4,18,9,0.95) !important;
          border-color: #0d3320 !important;
          color: #2a5e3a !important;
        }
        .leaflet-bar a:hover {
          background: rgba(4,18,9,1) !important;
          color: #00d67a !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ border: "1px solid #0d3320", minHeight: 400 }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none"
          style={{ background: "rgba(2,14,7,0.6)" }}>
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-[#00d67a] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-mono" style={{ color: "#2a5e3a" }}>Consultando mapa...</p>
          </div>
        </div>
      )}
    </>
  );
}
