"""
Serviço de detecção de clusters epidemiológicos.

Algoritmo:
  1. Após cada novo EpidemiologicalCase, busca casos da mesma síndrome
     nos últimos WINDOW_DAYS dias, filtrados pelo mesmo estado.
  2. Para cada par de casos com lat/lng, calcula distância haversine.
  3. Se >= CASE_THRESHOLD casos dentro de RADIUS_KM → cluster detectado.
  4. Cria ou atualiza EpidemicAlert.
  5. Notifica clínicas da região via WebSocket.
"""
import logging
import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.epidemiological_case import EpidemiologicalCase
from app.models.epidemic_alert import EpidemicAlert
from app.models.clinic import Clinic

logger = logging.getLogger(__name__)

# ── Configuração do detector ───────────────────────────────────
CASE_THRESHOLD = 3     # mínimo de casos para gerar alerta (baixo para testes)
RADIUS_KM      = 50.0  # raio de busca em km
WINDOW_DAYS    = 7     # janela temporal


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distância em km entre dois pontos geográficos (fórmula haversine)."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _severity(count: int) -> str:
    if count >= 20: return "critical"
    if count >= 10: return "high"
    if count >= 5:  return "moderate"
    return "low"


def _centroid(cases: list) -> tuple[float, float]:
    """Centroide geográfico (média aritmética) dos casos com coordenadas."""
    lats = [float(c.lat) for c in cases if c.lat is not None]
    lngs = [float(c.lng) for c in cases if c.lng is not None]
    if not lats:
        return (0.0, 0.0)
    return (sum(lats) / len(lats), sum(lngs) / len(lngs))


def find_cluster(cases: list["EpidemiologicalCase"]) -> Optional[dict]:
    """
    Dado um conjunto de casos, retorna o maior cluster encontrado
    usando busca de raio simples (O(n²) — aceitável para N pequeno).

    Retorna dict com {indices, centroid_lat, centroid_lng, count}
    ou None se nenhum cluster atingir o threshold.
    """
    if len(cases) < CASE_THRESHOLD:
        return None

    # Casos com coordenadas
    geo = [c for c in cases if c.lat is not None and c.lng is not None]
    # Casos sem coordenadas (contam por cidade)
    no_geo = [c for c in cases if c.lat is None or c.lng is None]

    best = None

    for i, seed in enumerate(geo):
        members = [j for j, c in enumerate(geo)
                   if haversine_km(float(seed.lat), float(seed.lng),
                                   float(c.lat), float(c.lng)) <= RADIUS_KM]
        # Casos sem geo da mesma cidade também contam
        city_matches = [c for c in no_geo if c.city == seed.city and c.state == seed.state]
        total = len(members) + len(city_matches)

        if total >= CASE_THRESHOLD:
            if best is None or total > best["count"]:
                cluster_cases = [geo[j] for j in members] + city_matches
                clat, clng = _centroid(cluster_cases)
                best = {
                    "count": total,
                    "centroid_lat": clat,
                    "centroid_lng": clng,
                    "city": seed.city,
                    "state": seed.state,
                }

    return best


async def run_cluster_detection(
    new_case: "EpidemiologicalCase",
    db: AsyncSession,
) -> Optional[EpidemicAlert]:
    """
    Ponto de entrada principal — chamado após salvar um EpidemiologicalCase.
    Retorna o EpidemicAlert criado/atualizado, ou None.
    """
    since = date.today() - timedelta(days=WINDOW_DAYS)

    result = await db.execute(
        select(EpidemiologicalCase).where(
            and_(
                EpidemiologicalCase.syndrome_name == new_case.syndrome_name,
                EpidemiologicalCase.state == new_case.state,
                EpidemiologicalCase.case_date >= since,
            )
        )
    )
    recent_cases = result.scalars().all()

    cluster = find_cluster(list(recent_cases))
    if not cluster:
        return None

    severity = _severity(cluster["count"])
    logger.warning(
        "Cluster detectado: %s em %s/%s — %d casos (severidade: %s)",
        new_case.syndrome_name, cluster["city"], cluster["state"],
        cluster["count"], severity,
    )

    # Verifica se já existe alerta ativo para essa síndrome/cidade
    existing = await db.execute(
        select(EpidemicAlert).where(
            and_(
                EpidemicAlert.syndrome_name == new_case.syndrome_name,
                EpidemicAlert.city == cluster["city"],
                EpidemicAlert.state == cluster["state"],
                EpidemicAlert.is_active == True,
            )
        )
    )
    alert = existing.scalar_one_or_none()

    if alert:
        alert.case_count = cluster["count"]
        alert.severity = severity
        alert.centroid_lat = cluster["centroid_lat"]
        alert.centroid_lng = cluster["centroid_lng"]
        alert.updated_at = datetime.now(timezone.utc)
    else:
        alert = EpidemicAlert(
            syndrome_name=new_case.syndrome_name,
            icd10_code=new_case.icd10_code,
            city=cluster["city"],
            state=cluster["state"],
            centroid_lat=cluster["centroid_lat"],
            centroid_lng=cluster["centroid_lng"],
            radius_km=RADIUS_KM,
            case_count=cluster["count"],
            window_days=WINDOW_DAYS,
            severity=severity,
        )
        db.add(alert)

    await db.flush()
    return alert


async def notify_clinics_in_area(alert: EpidemicAlert, db: AsyncSession) -> int:
    """
    Envia notificação WebSocket para clínicas dentro do raio do alerta.
    Retorna número de clínicas notificadas.
    """
    from app.core.websocket_manager import clinic_manager

    result = await db.execute(
        select(Clinic).where(
            and_(
                Clinic.address_state == alert.state,
                Clinic.latitude.isnot(None),
                Clinic.longitude.isnot(None),
            )
        )
    )
    clinics = result.scalars().all()

    payload = {
        "type": "epidemic_alert",
        "alert_id": alert.id,
        "syndrome": alert.syndrome_name,
        "city": alert.city,
        "state": alert.state,
        "case_count": alert.case_count,
        "severity": alert.severity,
        "radius_km": float(alert.radius_km),
        "centroid_lat": float(alert.centroid_lat) if alert.centroid_lat else None,
        "centroid_lng": float(alert.centroid_lng) if alert.centroid_lng else None,
        "window_days": alert.window_days,
        "created_at": alert.created_at.isoformat(),
    }

    notified = 0
    for clinic in clinics:
        if alert.centroid_lat and alert.centroid_lng:
            dist = haversine_km(
                float(alert.centroid_lat), float(alert.centroid_lng),
                float(clinic.latitude), float(clinic.longitude),
            )
            if dist > RADIUS_KM * 2:
                continue
        await clinic_manager.send(clinic.id, payload)
        notified += 1

    logger.info("Alerta enviado para %d clínicas", notified)
    return notified
