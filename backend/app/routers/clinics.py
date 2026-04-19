from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.membership import ClinicMembership
from app.graph.builder import find_nearest_clinics
from app.services.overpass_service import (
    fetch_health_nodes,
    fetch_osrm_route,
    build_dynamic_graph,
    dijkstra_to_nearest,
    graph_to_response,
)

router = APIRouter(prefix="/clinics", tags=["clinics"])

# ── Syndrome → care level mapping ─────────────────────────────────────────────
_SYNDROME_CARE: dict[str, tuple[str, str, str]] = {
    # syndrome_key → (node_type, urgency_label, recommendation_pt)
    "dengue":            ("hospital", "alto",
                          "Dengue pode causar complicações graves. Procure um hospital ou UPA imediatamente."),
    "chikungunya":       ("hospital", "alto",
                          "Chikungunya com dores intensas requer avaliação médica urgente. Vá a um hospital."),
    "zika":              ("clinic",   "moderado",
                          "Zika requer acompanhamento médico. Consulte uma clínica ou UBS."),
    "covid-19":          ("clinic",   "moderado",
                          "COVID-19 — busque uma clínica ou UPA para avaliação e possível isolamento."),
    "influenza":         ("clinic",   "moderado",
                          "Sintomas de gripe intensa. Uma UBS ou clínica pode indicar o tratamento."),
    "síndrome gripal":   ("pharmacy", "baixo",
                          "Síndrome gripal leve. Uma farmácia pode orientar analgésicos e hidratação."),
    "syndrome gripal":   ("pharmacy", "baixo",
                          "Síndrome gripal leve. Uma farmácia pode orientar analgésicos e hidratação."),
    "respiratory":       ("clinic",   "moderado",
                          "Sintomas respiratórios — consulte uma clínica para descarte de pneumonia."),
    "gastrointestinal":  ("clinic",   "moderado",
                          "Sintomas gastrointestinais. Se persistirem, vá a uma clínica ou UBS."),
    "febre hemorrágica": ("hospital", "crítico",
                          "Febre hemorrágica é emergência médica. Vá ao pronto-socorro imediatamente."),
    "meningite":         ("hospital", "crítico",
                          "Suspeita de meningite — emergência! Dirija-se ao pronto-socorro agora."),
    "leptospirose":      ("hospital", "alto",
                          "Leptospirose requer tratamento hospitalar urgente."),
    "sarampo":           ("clinic",   "moderado",
                          "Sarampo — consulte uma clínica. Evite contato com outras pessoas."),
    "varicela":          ("pharmacy", "baixo",
                          "Catapora leve pode ser tratada em casa. Farmácia pode orientar antivirais."),
}

_DEFAULT_CARE = ("clinic", "moderado",
                 "Com base nos seus sintomas, recomendamos consultar uma clínica ou UBS próxima.")


def _syndrome_recommendation(syndrome_name: str | None, urgency_level: str | None) -> dict:
    """Gera recomendação de estabelecimento de saúde com base na síndrome."""
    if not syndrome_name:
        return {
            "node_type":   "clinic",
            "urgency":     "desconhecido",
            "message":     "Nenhuma síndrome detectada recentemente. Mostrando todos os estabelecimentos.",
            "ai_active":   False,
        }

    key = syndrome_name.lower().strip()
    node_type, urgency, message = _SYNDROME_CARE.get(key, _DEFAULT_CARE)

    # urgency_level from DB overrides if it says critical/high
    if urgency_level in ("critical", "high", "alto", "crítico"):
        node_type = "hospital"
        urgency = urgency_level

    return {
        "node_type":      node_type,
        "urgency":        urgency,
        "syndrome_name":  syndrome_name,
        "message":        message,
        "ai_active":      True,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
async def list_clinics(
    city: str | None = Query(None),
    state: str | None = Query(None),
    specialty: str | None = Query(None),
    emergency_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Clinic)
    if city:
        q = q.where(Clinic.address_city.ilike(f"%{city}%"))
    if state:
        q = q.where(Clinic.address_state == state)
    if emergency_only:
        q = q.where(Clinic.is_emergency == True)

    result = await db.execute(q)
    clinics = result.scalars().all()
    return [_clinic_dict(c) for c in clinics]


@router.get("/nearby-graph")
async def nearby_graph(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(5.0, ge=0.5, le=20.0),
    emergency_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna grafo de saúde + rota OSRM + recomendação da IA baseada na síndrome do paciente.
    """
    # ── 1. Busca estabelecimentos de saúde ──────────────────────────────────
    nodes = await fetch_health_nodes(lat, lng, radius_km)
    source = "osm"

    if not nodes:
        result = await db.execute(select(Clinic))
        db_clinics = result.scalars().all()
        nodes = [
            {
                "id":           f"db_{c.id}",
                "name":         c.name,
                "lat":          float(c.latitude),
                "lng":          float(c.longitude),
                "amenity":      "hospital" if c.is_emergency else "clinic",
                "node_type":    "hospital" if c.is_emergency else "clinic",
                "is_emergency": c.is_emergency,
                "phone":        c.phone,
                "address":      f"{c.address_street or ''}, {c.address_city or ''}".strip(", "),
                "opening_hours": None,
            }
            for c in db_clinics
        ]
        source = "db"

    if not nodes:
        return {"nodes": [], "edges": [], "route": None,
                "stats": {"node_count": 0, "edge_count": 0},
                "source": "none", "ai_recommendation": None,
                "warning": "Nenhum estabelecimento encontrado."}

    # ── 2. Recomendação da IA (síndrome do paciente mais recente) ───────────
    syndrome_name = None
    urgency_level = None
    try:
        from app.models.chat_session import ChatSession
        sess_res = await db.execute(
            select(ChatSession)
            .where(ChatSession.patient_id == current_user.id)
            .where(ChatSession.final_syndrome.isnot(None))
            .order_by(desc(ChatSession.created_at))
            .limit(1)
        )
        chat_sess = sess_res.scalar_one_or_none()
        if chat_sess:
            syndrome_name = chat_sess.final_syndrome
            urgency_level = chat_sess.urgency_level
    except Exception:
        pass

    ai_rec = _syndrome_recommendation(syndrome_name, urgency_level)
    target_type = ai_rec["node_type"] if ai_rec["ai_active"] else None

    # ── 3. Grafo + Dijkstra ─────────────────────────────────────────────────
    G = build_dynamic_graph(lat, lng, nodes, max_edge_km=max(radius_km * 0.6, 2.0))
    dijkstra_route = dijkstra_to_nearest(
        G,
        target_type=target_type,
        emergency_only=emergency_only,
    )

    # ── 4. Substitui rota Dijkstra por rota OSRM real ───────────────────────
    if dijkstra_route:
        target = dijkstra_route["target_data"]
        osrm = await fetch_osrm_route(lat, lng, target["lat"], target["lng"])
        if osrm:
            dijkstra_route["path_coords"]        = osrm["path_coords"]
            dijkstra_route["total_km"]           = osrm["total_km"]
            dijkstra_route["estimated_minutes"]  = osrm["estimated_minutes"]
            dijkstra_route["route_type"]         = "road"
        else:
            dijkstra_route["route_type"] = "straight_line"

    result = graph_to_response(G, dijkstra_route)
    result["source"]           = source
    result["ai_recommendation"] = ai_rec
    return result


@router.get("/route")
async def get_route(
    from_lat: float = Query(...),
    from_lng: float = Query(...),
    to_lat: float = Query(...),
    to_lng: float = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Rota real por estradas (OSRM) entre dois pontos."""
    route = await fetch_osrm_route(from_lat, from_lng, to_lat, to_lng)
    if not route:
        raise HTTPException(status_code=503, detail="Serviço de roteamento indisponível.")
    return route


@router.get("/ai-recommend")
async def ai_recommend(
    lat: float = Query(...),
    lng: float = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recomendação da IA baseada na síndrome detectada no chat."""
    syndrome_name = None
    urgency_level = None
    try:
        from app.models.chat_session import ChatSession
        res = await db.execute(
            select(ChatSession)
            .where(ChatSession.patient_id == current_user.id)
            .where(ChatSession.final_syndrome.isnot(None))
            .order_by(desc(ChatSession.created_at))
            .limit(1)
        )
        sess = res.scalar_one_or_none()
        if sess:
            syndrome_name = sess.final_syndrome
            urgency_level = sess.urgency_level
    except Exception:
        pass
    return _syndrome_recommendation(syndrome_name, urgency_level)


@router.get("/nearby")
async def nearby_clinics(
    lat: float = Query(...),
    lng: float = Query(...),
    specialty: str | None = Query(None),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Clinic))
    all_clinics = result.scalars().all()
    nearest = find_nearest_clinics(lat, lng, specialty=specialty, limit=limit, db_clinics=all_clinics)
    return nearest


@router.get("/detail/{node_id}")
async def node_detail(
    node_id: str,
    syndrome: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Detalhes de um nó do mapa.
    - Se for um nó OSM (osm_*): retorna dados básicos + flag registered=False
    - Se for um nó do DB (db_*): retorna dados completos + médicos vinculados
    """
    if node_id.startswith("db_"):
        clinic_id = node_id[3:]  # remove "db_" prefix
        res = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
        clinic = res.scalar_one_or_none()
        if not clinic:
            raise HTTPException(404, "Clínica não encontrada.")

        # Médicos vinculados
        members_res = await db.execute(
            select(ClinicMembership).where(ClinicMembership.clinic_id == clinic_id)
        )
        memberships = members_res.scalars().all()
        doctor_ids = [m.doctor_id for m in memberships]
        docs_res = await db.execute(select(Doctor).where(Doctor.id.in_(doctor_ids)))
        doctors = docs_res.scalars().all()

        # Filtra por relevância se síndrome informada
        from app.routers.appointments import _relevant_specialties, _doctor_score
        target_specs = _relevant_specialties(syndrome)
        doctors_out = sorted(
            [
                {
                    "doctor_id":   d.id,
                    "full_name":   d.full_name,
                    "specialty":   d.specialty,
                    "crm":         f"CRM-{d.crm_state} {d.crm}",
                    "biography":   d.biography,
                    "phone":       d.phone,
                    "score":       _doctor_score(d, target_specs),
                }
                for d in doctors
            ],
            key=lambda x: -x["score"],
        )

        return {
            "registered":    True,
            "clinic_id":     clinic_id,
            "name":          clinic.name,
            "address":       f"{clinic.address_street or ''}, {clinic.address_city or ''}".strip(", "),
            "phone":         clinic.phone,
            "description":   clinic.description,
            "specialties":   clinic.specialties or [],
            "operating_hours": clinic.operating_hours,
            "is_emergency":  clinic.is_emergency,
            "doctors":       doctors_out,
        }
    else:
        # Nó OSM: sem registro no sistema
        return {
            "registered": False,
            "name": None,
            "doctors": [],
        }


@router.get("/{clinic_id}")
async def get_clinic(
    clinic_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica não encontrada")
    return _clinic_dict(clinic)


def _clinic_dict(c: Clinic) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "latitude": float(c.latitude),
        "longitude": float(c.longitude),
        "address_street": c.address_street,
        "address_city": c.address_city,
        "address_state": c.address_state,
        "specialties": c.specialties or [],
        "is_emergency": c.is_emergency,
        "operating_hours": c.operating_hours,
        "description": c.description,
    }
