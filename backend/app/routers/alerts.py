from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.epidemic_alert import EpidemicAlert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/active")
async def list_active_alerts(
    state: str | None = Query(None),
    syndrome: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista alertas epidemiológicos ativos. Acessível por qualquer usuário autenticado."""
    filters = [EpidemicAlert.is_active == True]
    if state:
        filters.append(EpidemicAlert.state == state)
    if syndrome:
        filters.append(EpidemicAlert.syndrome_name == syndrome)

    result = await db.execute(
        select(EpidemicAlert)
        .where(and_(*filters))
        .order_by(EpidemicAlert.created_at.desc())
        .limit(50)
    )
    alerts = result.scalars().all()

    return [
        {
            "id": a.id,
            "syndrome": a.syndrome_name,
            "icd10": a.icd10_code,
            "city": a.city,
            "state": a.state,
            "centroid_lat": float(a.centroid_lat) if a.centroid_lat else None,
            "centroid_lng": float(a.centroid_lng) if a.centroid_lng else None,
            "radius_km": float(a.radius_km),
            "case_count": a.case_count,
            "severity": a.severity,
            "window_days": a.window_days,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]


@router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    current_user: User = Depends(require_role(UserRole.clinic)),
    db: AsyncSession = Depends(get_db),
):
    """Marca alerta como resolvido (apenas clínicas)."""
    from datetime import datetime, timezone
    result = await db.execute(select(EpidemicAlert).where(EpidemicAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    alert.is_active = False
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "resolved", "alert_id": alert_id}
