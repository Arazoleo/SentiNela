"""
Busca estabelecimentos de saúde via Nominatim (OpenStreetMap) com fallback para Overpass.
Monta um grafo NetworkX dinâmico com Dijkstra.
"""
import asyncio
import logging
import math
import time
import urllib.parse
import urllib.request
from typing import Optional
import networkx as nx

logger = logging.getLogger(__name__)

TIMEOUT = 20.0
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"

# Tipos de amenity OSM que queremos
HEALTH_AMENITIES = ["hospital", "clinic", "doctors", "pharmacy", "health_post"]
NOMINATIM_AMENITIES = ["hospital", "clinic", "doctors", "pharmacy"]  # health_post rare in Nominatim

# Mapeamento OSM amenity → tipo local
AMENITY_TYPE: dict[str, str] = {
    "hospital":    "hospital",
    "clinic":      "clinic",
    "doctors":     "clinic",
    "health_post": "clinic",
    "pharmacy":    "pharmacy",
}

# Categorias de emergência
EMERGENCY_AMENITIES = {"hospital"}

# Overpass mirrors como fallback secundário
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def _bbox(lat: float, lng: float, radius_km: float) -> tuple[float, float, float, float]:
    """Calcula bounding box a partir de lat/lng + raio em km."""
    delta_lat = radius_km / 111.0
    delta_lng = radius_km / (111.0 * math.cos(math.radians(lat)))
    return lat - delta_lat, lng - delta_lng, lat + delta_lat, lng + delta_lng


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def _sync_nominatim_search(amenity: str, viewbox: str) -> list[dict]:
    """Busca síncrona de um tipo de amenity via Nominatim."""
    params = urllib.parse.urlencode({
        "amenity": amenity,
        "bounded": "1",
        "viewbox": viewbox,
        "format": "json",
        "limit": "50",
        "addressdetails": "1",
    })
    url = f"{NOMINATIM_BASE}/search?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Sentinela/1.0 (epidemiological surveillance; open source; grupocnecg2025@gmail.com)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=int(TIMEOUT)) as resp:
            if resp.status != 200:
                return []
            import json
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.warning("Nominatim erro para amenity=%s: %s", amenity, e)
        return []


async def _fetch_via_nominatim(lat: float, lng: float, radius_km: float) -> list[dict]:
    """
    Busca estabelecimentos de saúde via Nominatim (primary source).
    Respeita o rate limit de 1 req/s entre amenities distintas.
    """
    s, w, n, e = _bbox(lat, lng, radius_km)
    # Nominatim viewbox: west,south,east,north
    viewbox = f"{w:.6f},{s:.6f},{e:.6f},{n:.6f}"

    loop = asyncio.get_event_loop()
    all_results: list[dict] = []
    seen_osm: set[str] = set()

    for i, amenity in enumerate(NOMINATIM_AMENITIES):
        if i > 0:
            # Nominatim rate limit: ≥1s between requests
            await asyncio.sleep(1.1)
        try:
            results = await asyncio.wait_for(
                loop.run_in_executor(None, _sync_nominatim_search, amenity, viewbox),
                timeout=TIMEOUT + 2,
            )
            for r in results:
                key = f"{r.get('osm_type')}_{r.get('osm_id')}"
                if key not in seen_osm:
                    seen_osm.add(key)
                    r["_amenity_type"] = amenity
                    all_results.append(r)
            logger.info("Nominatim amenity=%s → %d resultados", amenity, len(results))
        except asyncio.TimeoutError:
            logger.warning("Nominatim timeout para amenity=%s", amenity)
        except Exception as ex:
            logger.warning("Nominatim erro amenity=%s: %s", amenity, ex)

    return all_results


def _parse_nominatim_nodes(results: list[dict]) -> list[dict]:
    """Converte resultados Nominatim para o formato interno de nós."""
    nodes = []
    seen_names: set[str] = set()

    for r in results:
        try:
            node_lat = float(r["lat"])
            node_lng = float(r["lon"])
        except (KeyError, ValueError):
            continue

        amenity = r.get("_amenity_type", r.get("type", "clinic"))
        name = r.get("name", "").strip()
        if not name:
            name = amenity.replace("_", " ").title()

        key = f"{name[:30]}_{round(node_lat, 4)}_{round(node_lng, 4)}"
        if key in seen_names:
            continue
        seen_names.add(key)

        addr = r.get("address", {})
        street = addr.get("road", "")
        number = addr.get("house_number", "")
        city   = addr.get("city") or addr.get("town") or addr.get("village") or ""
        address = f"{street}, {number}".strip(", ") if street else city

        nodes.append({
            "id":           f"osm_{r.get('osm_type','node')}_{r.get('osm_id', id(r))}",
            "name":         name,
            "lat":          node_lat,
            "lng":          node_lng,
            "amenity":      amenity,
            "node_type":    AMENITY_TYPE.get(amenity, "clinic"),
            "is_emergency": amenity in EMERGENCY_AMENITIES,
            "phone":        None,
            "address":      address,
            "opening_hours": None,
            "osm_id":       r.get("osm_id"),
        })

    return nodes


# ── Overpass fallback (secundário) ───────────────────────────────────────────

def _overpass_query(lat: float, lng: float, radius_km: float) -> str:
    s, w, n, e = _bbox(lat, lng, radius_km)
    amenities = "|".join(HEALTH_AMENITIES)
    bbox = f"{s:.6f},{w:.6f},{n:.6f},{e:.6f}"
    return (
        f"[out:json][timeout:{int(TIMEOUT)}];"
        f"("
        f'node["amenity"~"{amenities}"]({bbox});'
        f'way["amenity"~"{amenities}"]({bbox});'
        f");"
        f"out center tags;"
    )


def _node_coords(element: dict) -> tuple[float, float] | None:
    if element["type"] == "node":
        return element.get("lat"), element.get("lon")
    center = element.get("center")
    if center:
        return center.get("lat"), center.get("lon")
    return None, None


def _sync_post_overpass(url: str, query: str) -> dict | None:
    body = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Sentinela/1.0 (epidemiological surveillance; open source)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=int(TIMEOUT)) as resp:
            if resp.status != 200:
                return None
            import json
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


async def _try_overpass(query: str) -> dict | None:
    loop = asyncio.get_event_loop()
    for url in OVERPASS_MIRRORS:
        try:
            data = await asyncio.wait_for(
                loop.run_in_executor(None, _sync_post_overpass, url, query),
                timeout=TIMEOUT + 2,
            )
            if data:
                logger.info("Overpass OK via %s", url)
                return data
            logger.warning("Overpass sem dados em %s", url)
        except asyncio.TimeoutError:
            logger.warning("Overpass timeout em %s", url)
        except Exception as ex:
            logger.warning("Overpass erro em %s: %s", url, ex)
    return None


def _parse_overpass_nodes(data: dict) -> list[dict]:
    nodes = []
    seen: set[str] = set()
    for el in data.get("elements", []):
        node_lat, node_lng = _node_coords(el)
        if node_lat is None or node_lng is None:
            continue
        tags = el.get("tags", {})
        amenity = tags.get("amenity", "")
        if amenity not in HEALTH_AMENITIES:
            continue
        name = (
            tags.get("name") or tags.get("name:pt") or tags.get("operator")
            or amenity.replace("_", " ").title()
        )
        key = f"{name[:30]}_{round(node_lat, 4)}_{round(node_lng, 4)}"
        if key in seen:
            continue
        seen.add(key)
        street = tags.get("addr:street", "")
        number = tags.get("addr:housenumber", "")
        city   = tags.get("addr:city", "")
        address = f"{street}, {number}".strip(", ") if street else city
        nodes.append({
            "id":           f"osm_{el['type']}_{el['id']}",
            "name":         name,
            "lat":          node_lat,
            "lng":          node_lng,
            "amenity":      amenity,
            "node_type":    AMENITY_TYPE.get(amenity, "clinic"),
            "is_emergency": amenity in EMERGENCY_AMENITIES,
            "phone":        tags.get("phone") or tags.get("contact:phone"),
            "address":      address,
            "opening_hours": tags.get("opening_hours"),
            "osm_id":       el["id"],
        })
    return nodes


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_health_nodes(
    lat: float,
    lng: float,
    radius_km: float = 5.0,
) -> list[dict]:
    """
    Busca estabelecimentos de saúde próximos via Nominatim (primary) + Overpass (fallback).
    """
    # 1. Tenta Nominatim primeiro (funciona de dentro do Docker)
    try:
        raw = await _fetch_via_nominatim(lat, lng, radius_km)
        if raw:
            nodes = _parse_nominatim_nodes(raw)
            logger.info("Nominatim retornou %d estabelecimentos (raio %s km)", len(nodes), radius_km)
            return nodes
    except Exception as ex:
        logger.warning("Nominatim falhou: %s", ex)

    # 2. Fallback: Overpass
    logger.info("Tentando Overpass como fallback...")
    query = _overpass_query(lat, lng, radius_km)
    data = await _try_overpass(query)
    if data:
        nodes = _parse_overpass_nodes(data)
        logger.info("Overpass retornou %d estabelecimentos (raio %s km)", len(nodes), radius_km)
        return nodes

    logger.error("Nominatim e Overpass falharam para lat=%s lng=%s", lat, lng)
    return []


# ── OSRM real-road routing ────────────────────────────────────────────────────

def _sync_osrm_route(from_lng: float, from_lat: float, to_lng: float, to_lat: float) -> dict | None:
    """Busca rota real via OSRM (Open Source Routing Machine)."""
    import json
    url = (
        f"{OSRM_BASE}/{from_lng:.6f},{from_lat:.6f};{to_lng:.6f},{to_lat:.6f}"
        "?overview=full&geometries=geojson"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Sentinela/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            d = json.loads(resp.read().decode("utf-8"))
            if d.get("code") != "Ok" or not d.get("routes"):
                return None
            route = d["routes"][0]
            coords = route["geometry"]["coordinates"]  # [lng, lat]
            return {
                "path_coords": [{"lat": c[1], "lng": c[0]} for c in coords],
                "total_km": round(route["distance"] / 1000, 3),
                "estimated_minutes": max(1, round(route["duration"] / 60)),
            }
    except Exception as ex:
        logger.warning("OSRM erro: %s", ex)
        return None


async def fetch_osrm_route(
    from_lat: float, from_lng: float,
    to_lat: float, to_lng: float,
) -> dict | None:
    """Async wrapper para buscar rota real por estradas (OSRM)."""
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync_osrm_route, from_lng, from_lat, to_lng, to_lat),
            timeout=14,
        )
    except Exception as ex:
        logger.warning("OSRM async erro: %s", ex)
        return None


# ── Graph utilities (unchanged) ───────────────────────────────────────────────

def build_dynamic_graph(
    user_lat: float,
    user_lng: float,
    health_nodes: list[dict],
    max_edge_km: float = 3.0,
) -> nx.Graph:
    G = nx.Graph()
    G.add_node("__user__", lat=user_lat, lng=user_lng,
               name="Você", node_type="user", is_emergency=False)
    for n in health_nodes:
        G.add_node(n["id"], **n)

    all_ids = [nid for nid in G.nodes if nid != "__user__"]

    for i, a in enumerate(all_ids):
        da = G.nodes[a]
        for b in all_ids[i + 1:]:
            db_ = G.nodes[b]
            d = haversine(da["lat"], da["lng"], db_["lat"], db_["lng"])
            if d <= max_edge_km:
                G.add_edge(a, b, weight=d)

    dists = sorted(
        [(haversine(user_lat, user_lng, G.nodes[n]["lat"], G.nodes[n]["lng"]), n)
         for n in all_ids]
    )
    for d, nid in dists[:8]:
        G.add_edge("__user__", nid, weight=d)

    return G


def dijkstra_to_nearest(
    G: nx.Graph,
    user_node: str = "__user__",
    target_type: Optional[str] = None,
    emergency_only: bool = False,
) -> Optional[dict]:
    candidates = [
        nid for nid, data in G.nodes(data=True)
        if nid != user_node
        and (not target_type or data.get("node_type") == target_type)
        and (not emergency_only or data.get("is_emergency"))
    ]

    if not candidates:
        candidates = [nid for nid in G.nodes if nid != user_node]

    best = None
    for target in candidates:
        try:
            length = nx.dijkstra_path_length(G, user_node, target, weight="weight")
            if best is None or length < best["total_km"]:
                path = nx.dijkstra_path(G, user_node, target, weight="weight")
                best = {
                    "target_id":   target,
                    "target_data": dict(G.nodes[target]),
                    "path_coords": [
                        {"lat": G.nodes[n]["lat"], "lng": G.nodes[n]["lng"]}
                        for n in path
                    ],
                    "total_km":           round(length, 3),
                    "estimated_minutes":  max(1, round(length / 20 * 60)),
                }
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            continue

    return best


def graph_to_response(
    G: nx.Graph,
    route: Optional[dict],
) -> dict:
    nodes_out = []
    for nid, data in G.nodes(data=True):
        nodes_out.append({
            "id":          nid,
            "lat":         data["lat"],
            "lng":         data["lng"],
            "name":        data.get("name", ""),
            "node_type":   data.get("node_type", "clinic"),
            "is_emergency": data.get("is_emergency", False),
            "phone":       data.get("phone"),
            "address":     data.get("address", ""),
            "amenity":     data.get("amenity", ""),
            "opening_hours": data.get("opening_hours"),
        })

    edges_out = [
        {"from": u, "to": v, "weight": round(d["weight"], 3)}
        for u, v, d in G.edges(data=True)
    ]

    return {
        "nodes":  nodes_out,
        "edges":  edges_out,
        "route":  route,
        "stats": {
            "node_count": G.number_of_nodes() - 1,
            "edge_count": G.number_of_edges(),
        },
    }
