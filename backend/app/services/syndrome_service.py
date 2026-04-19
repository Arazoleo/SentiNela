"""
Orquestra a conversa sindrômica:
  Mensagem do usuário → MedGemma → Extração de sintomas →
  Classificação de síndrome → Busca no grafo → Resposta final
"""
import json
import re
import logging
from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.services.medgemma_service import medgemma_service
from app.models.chat_session import ChatSession, SessionStatus
from app.models.chat_message import ChatMessage, MessageRole
from app.models.syndrome_report import SyndromeReport
from app.models.epidemiological_case import EpidemiologicalCase
from app.models.clinic import Clinic
from app.graph.builder import find_nearest_clinics

logger = logging.getLogger(__name__)


def _extract_json_from_text(text: str) -> Optional[dict]:
    """Extrai bloco JSON da resposta do modelo."""
    # Tenta JSON em bloco de código markdown
    match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Tenta JSON inline
    match = re.search(r"\{[^{}]*\"needs_more_info\"[^{}]*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None


# Mapeamento de termos frequentes do modelo para síndromes canônicas
_SYNDROME_KEYWORDS: list[tuple[list[str], str, str, str]] = [
    (["influenza", "gripe", "síndrome gripal", "sindrome gripal"], "Síndrome Gripal", "J11", "medium"),
    (["covid", "sars-cov-2", "coronavirus"], "Síndrome Respiratória Aguda Grave", "U07.1", "high"),
    (["dengue"], "Síndrome Febril Hemorrágica", "A97", "high"),
    (["gastroenterite", "gastrointestinal", "diarreia", "vômito", "vomito"], "Síndrome Diarreica Aguda", "A09", "medium"),
    (["pneumonia", "respiratória aguda", "respiratoria aguda"], "Síndrome Respiratória Aguda", "J18", "high"),
    (["meningite"], "Síndrome Meníngea", "G03", "emergency"),
    (["conjuntivite"], "Síndrome Ocular Inflamatória", "H10", "low"),
]


def _infer_syndrome_from_text(text: str) -> Optional[dict]:
    """Tenta inferir síndrome a partir do texto livre quando o modelo não emitiu JSON."""
    lower = text.lower()
    for keywords, syndrome_name, icd10, urgency in _SYNDROME_KEYWORDS:
        if any(kw in lower for kw in keywords):
            return {
                "needs_more_info": False,
                "syndrome_hypothesis": syndrome_name,
                "icd10": icd10,
                "urgency": urgency,
                "confidence": 0.65,
                "symptoms_extracted": [],
                "recommendations": ["Consulte um médico para avaliação presencial"],
            }
    return None


def _clean_response_text(text: str) -> str:
    """Remove blocos JSON da mensagem de texto para exibição ao usuário."""
    text = re.sub(r"```json.*?```", "", text, flags=re.DOTALL)
    return text.strip()


async def process_message(
    session: ChatSession,
    user_content: str,
    db: AsyncSession,
    patient_lat: Optional[float] = None,
    patient_lng: Optional[float] = None,
) -> dict:
    """
    Processa uma mensagem do usuário na sessão ativa.
    Retorna payload completo para o WebSocket.
    """
    # Salva mensagem do usuário
    user_msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.user,
        content=user_content,
    )
    db.add(user_msg)
    await db.flush()

    # Monta histórico para o modelo (últimas 20 mensagens) via query explícita
    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .where(ChatMessage.role != MessageRole.system)
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
    )
    history = [
        {"role": msg.role.value, "content": msg.content}
        for msg in msgs_result.scalars().all()
    ]

    # Se já classificou, responde naturalmente sem tentar re-classificar
    already_classified = bool(session.final_syndrome)
    user_turns = sum(1 for m in history if m["role"] == "user")
    force_classify = not already_classified and user_turns >= 3
    model_history = history
    if force_classify:
        model_history = history + [{
            "role": "user",
            "content": (
                "Com base em todos os sintomas descritos nesta conversa, "
                "você já tem informação suficiente para classificar a síndrome. "
                "Por favor, forneça agora a classificação completa no bloco JSON conforme instruído, "
                "com needs_more_info: false."
            ),
        }]

    # Chama MedGemma
    gemma_result = await medgemma_service.generate(model_history)

    response_text = gemma_result.get("response_text", "")
    struct = (
        _extract_json_from_text(response_text)
        or (force_classify and _infer_syndrome_from_text(response_text))
        or gemma_result
    )

    clean_text = _clean_response_text(response_text)
    needs_more = struct.get("needs_more_info", True)

    # Salva resposta do assistente
    assistant_msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.assistant,
        content=clean_text,
        metadata_={
            "symptoms_extracted": struct.get("symptoms_extracted", []),
            "syndrome": struct.get("syndrome_hypothesis"),
            "confidence": struct.get("confidence"),
            "urgency": struct.get("urgency"),
        },
    )
    db.add(assistant_msg)

    payload = {
        "type": "message",
        "session_id": session.id,
        "message": clean_text,
        "role": "assistant",
        "syndrome": None,
        "nearest_clinic": None,
        "route": None,
    }

    # Se a síndrome foi classificada, busca clínica mais próxima
    if not needs_more and struct.get("syndrome_hypothesis"):
        lat = patient_lat or (float(session.patient_lat) if session.patient_lat else None)
        lng = patient_lng or (float(session.patient_lng) if session.patient_lng else None)

        syndrome_data = {
            "syndrome_name": struct.get("syndrome_hypothesis"),
            "icd10_code": struct.get("icd10"),
            "confidence": struct.get("confidence", 0.0),
            "urgency_level": struct.get("urgency", "low"),
            "symptoms": struct.get("symptoms_extracted", []),
            "recommendations": struct.get("recommendations", []),
        }

        # Cria SyndromeReport
        report = SyndromeReport(
            session_id=session.id,
            symptoms=syndrome_data["symptoms"],
            syndrome_name=syndrome_data["syndrome_name"],
            icd10_code=syndrome_data["icd10_code"],
            confidence=syndrome_data["confidence"],
            urgency_level=syndrome_data["urgency_level"],
            recommendations=syndrome_data["recommendations"],
            medgemma_raw=struct,
        )
        db.add(report)

        # Registra caso epidemiológico
        epi_case = None
        if session.patient and session.patient.address_city:
            # Coordenadas: prioriza as da sessão (mais recentes)
            case_lat = lat or (float(session.patient_lat) if session.patient_lat else
                               float(session.patient.latitude) if session.patient.latitude else None)
            case_lng = lng or (float(session.patient_lng) if session.patient_lng else
                               float(session.patient.longitude) if session.patient.longitude else None)
            epi_case = EpidemiologicalCase(
                syndrome_name=syndrome_data["syndrome_name"],
                icd10_code=syndrome_data["icd10_code"],
                city=session.patient.address_city,
                state=session.patient.address_state or "BR",
                lat=case_lat,
                lng=case_lng,
                case_date=date.today(),
                severity=syndrome_data["urgency_level"],
                source="chat",
            )
            db.add(epi_case)

        # Atualiza sessão — mantém ACTIVE para continuar a conversa
        session.final_syndrome = syndrome_data["syndrome_name"]
        session.urgency_level = syndrome_data["urgency_level"]
        # NÃO fecha a sessão; usuário pode continuar a conversa após hipótese

        # Busca estabelecimentos próximos via OSM (Nominatim) + fallback DB
        nearest = []
        if lat and lng:
            try:
                from app.services.overpass_service import fetch_health_nodes, haversine
                from app.routers.appointments import _relevant_specialties
                osm_nodes = await fetch_health_nodes(lat, lng, radius_km=5.0)
                target_specs = _relevant_specialties(syndrome_data.get("syndrome_name"))
                # Filtro: prioriza tipo de estabelecimento adequado à urgência
                urgency = syndrome_data.get("urgency_level", "low")
                preferred_type = "hospital" if urgency in ("high", "emergency") else "clinic"
                # Ordena: tipo preferido primeiro, depois por distância
                def node_sort_key(n):
                    dist = haversine(lat, lng, n["lat"], n["lng"])
                    type_priority = 0 if n["node_type"] == preferred_type else 1
                    return (type_priority, dist)
                osm_nodes.sort(key=node_sort_key)
                nearest = [
                    {
                        "clinic_id":    n["id"],
                        "clinic_name":  n["name"],
                        "distance_km":  round(haversine(lat, lng, n["lat"], n["lng"]), 2),
                        "estimated_minutes": max(1, round(haversine(lat, lng, n["lat"], n["lng"]) / 20 * 60)),
                        "latitude":     n["lat"],
                        "longitude":    n["lng"],
                        "address":      n.get("address", ""),
                        "phone":        n.get("phone", "") or "",
                        "is_emergency": n.get("is_emergency", False),
                        "specialties":  [],
                        "node_type":    n.get("node_type", "clinic"),
                        "registered":   n["id"].startswith("db_"),
                    }
                    for n in osm_nodes[:5]
                ]
            except Exception as ex:
                logger.warning("Nominatim para nearby falhou: %s", ex)
                # Fallback: DB clinics
                result = await db.execute(select(Clinic))
                all_clinics = result.scalars().all()
                nearest = find_nearest_clinics(
                    lat, lng,
                    specialty=struct.get("recommended_specialty"),
                    limit=3,
                    db_clinics=all_clinics,
                )
            if nearest:
                first_id = nearest[0]["clinic_id"]
                if first_id.startswith("db_"):
                    session.recommended_clinic_id = first_id[3:]

        # Detecção de cluster (async, não bloqueia resposta ao usuário)
        alert = None
        if epi_case:
            try:
                from app.services.cluster_service import run_cluster_detection, notify_clinics_in_area
                await db.flush()  # garante que epi_case tem ID
                alert = await run_cluster_detection(epi_case, db)
                if alert:
                    await notify_clinics_in_area(alert, db)
            except Exception as e:
                logger.error("Erro na detecção de cluster: %s", e)

        payload["type"] = "classification"
        payload["syndrome"] = syndrome_data
        if alert:
            payload["epidemic_alert"] = {
                "syndrome": alert.syndrome_name,
                "city": alert.city,
                "case_count": alert.case_count,
                "severity": alert.severity,
            }
        payload["nearest_clinics"] = nearest
        payload["nearest_clinic"] = nearest[0] if nearest else None

    await db.flush()
    return payload


async def get_or_create_session(
    patient_id: str,
    lat: Optional[float],
    lng: Optional[float],
    db: AsyncSession,
    new_session: bool = False,
) -> ChatSession:
    """
    Retorna a sessão mais recente (ativa ou com hipótese registrada).
    Cria nova sessão apenas se não houver nenhuma ou se new_session=True.
    """
    if not new_session:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.patient_id == patient_id)
            .where(ChatSession.status != SessionStatus.abandoned)
            .order_by(ChatSession.created_at.desc())
            .limit(1)
            .options(
                selectinload(ChatSession.messages),
                selectinload(ChatSession.patient),
            )
        )
        session = result.scalar_one_or_none()
        if session:
            # Garante que está ativa (pode ter sido completada antes da correção)
            if session.status == SessionStatus.completed:
                session.status = SessionStatus.active
            return session

    session = ChatSession(
        patient_id=patient_id,
        patient_lat=lat,
        patient_lng=lng,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session, ["messages", "patient"])
    return session
