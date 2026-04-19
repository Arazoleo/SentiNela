"""
Grafo de geolocalização baseado em NetworkX.
Nós = localizações (clínicas, interseções, marcos)
Arestas = conexões com peso = distância haversine em km
"""
import math
import logging
from typing import Optional
import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.graph_node import GraphNode
from app.models.graph_edge import GraphEdge

logger = logging.getLogger(__name__)

# Grafo em memória (reconstruído na inicialização e quando clínicas mudam)
_graph: Optional[nx.Graph] = None


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância haversine em km entre dois pontos GPS."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def build_graph(db: AsyncSession) -> nx.Graph:
    """Constrói o grafo a partir do banco de dados."""
    global _graph

    G = nx.Graph()

    # Carrega todos os nós
    result = await db.execute(select(GraphNode))
    nodes = result.scalars().all()

    for node in nodes:
        G.add_node(
            node.id,
            label=node.label or "",
            node_type=node.node_type,
            lat=float(node.latitude),
            lng=float(node.longitude),
            clinic_id=node.clinic_id,
        )

    # Carrega todas as arestas
    result = await db.execute(select(GraphEdge))
    edges = result.scalars().all()

    for edge in edges:
        G.add_edge(
            edge.from_node_id,
            edge.to_node_id,
            weight=float(edge.weight),
            edge_type=edge.edge_type,
        )
        if edge.is_bidirectional:
            G.add_edge(
                edge.to_node_id,
                edge.from_node_id,
                weight=float(edge.weight),
                edge_type=edge.edge_type,
            )

    _graph = G
    logger.info("Grafo construído: %d nós, %d arestas", G.number_of_nodes(), G.number_of_edges())
    return G


def get_graph() -> Optional[nx.Graph]:
    return _graph


def add_virtual_patient_node(G: nx.Graph, lat: float, lng: float) -> str:
    """Adiciona nó temporário para a posição do paciente e conecta aos nós mais próximos."""
    patient_id = "__patient__"
    G.add_node(patient_id, label="Paciente", node_type="patient", lat=lat, lng=lng)

    # Conecta aos 5 nós mais próximos para garantir conectividade
    distances = []
    for node_id, data in G.nodes(data=True):
        if node_id == patient_id:
            continue
        d = haversine(lat, lng, data["lat"], data["lng"])
        distances.append((d, node_id))

    distances.sort()
    for d, node_id in distances[:5]:
        G.add_edge(patient_id, node_id, weight=d)

    return patient_id


def find_nearest_clinics(
    lat: float,
    lng: float,
    specialty: Optional[str] = None,
    limit: int = 3,
    db_clinics: Optional[list] = None,
) -> list[dict]:
    """
    Usa distância haversine nas clínicas do DB.
    Aplica filtro de especialidade; se retornar vazio, cai no fallback sem filtro.
    """
    if not db_clinics:
        return []

    def _score(clinic: object) -> dict:
        dist = haversine(lat, lng, float(clinic.latitude), float(clinic.longitude))
        return {
            "clinic_id": clinic.id,
            "clinic_name": clinic.name,
            "distance_km": round(dist, 3),
            "estimated_minutes": max(1, round(dist / 20 * 60)),
            "latitude": float(clinic.latitude),
            "longitude": float(clinic.longitude),
            "address": f"{clinic.address_street}, {clinic.address_city} - {clinic.address_state}",
            "phone": clinic.phone,
            "is_emergency": clinic.is_emergency,
            "specialties": clinic.specialties or [],
        }

    if specialty:
        filtered = [
            _score(c) for c in db_clinics
            if specialty.lower() in [s.lower() for s in (c.specialties or [])]
        ]
        if filtered:
            filtered.sort(key=lambda x: x["distance_km"])
            return filtered[:limit]
        # Fallback: specialty não encontrada, retorna as mais próximas sem filtro

    all_scored = [_score(c) for c in db_clinics]
    all_scored.sort(key=lambda x: x["distance_km"])
    return all_scored[:limit]


def dijkstra_route(G: nx.Graph, source: str, target: str) -> Optional[dict]:
    """Calcula rota mínima entre dois nós."""
    try:
        path = nx.dijkstra_path(G, source, target, weight="weight")
        length = nx.dijkstra_path_length(G, source, target, weight="weight")

        route_nodes = [
            {"id": n, "lat": G.nodes[n]["lat"], "lng": G.nodes[n]["lng"], "label": G.nodes[n].get("label", "")}
            for n in path
        ]

        return {
            "path_nodes": route_nodes,
            "total_distance_km": round(length, 3),
            "estimated_minutes": max(1, round(length / 20 * 60)),
        }
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None
