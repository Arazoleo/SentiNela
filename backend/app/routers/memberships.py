from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.membership import ClinicMembership
from app.models.membership_request import MembershipRequest, RequestStatus, InitiatedBy
from app.models.notification import Notification, NotificationType

router = APIRouter(prefix="/memberships", tags=["memberships"])


class RequestBody(BaseModel):
    target_id: str  # clinic_id (se médico) ou doctor_id (se clínica)
    message: str | None = None


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def create_request(
    body: RequestBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.doctor:
        clinic_id = body.target_id
        doctor_id = current_user.id
        initiated = InitiatedBy.doctor
        notify_id = clinic_id
    elif current_user.role == UserRole.clinic:
        clinic_id = current_user.id
        doctor_id = body.target_id
        initiated = InitiatedBy.clinic
        notify_id = doctor_id
    else:
        raise HTTPException(status_code=403, detail="Apenas médicos e clínicas podem fazer solicitações")

    # Verifica se já existe solicitação pendente
    existing = await db.execute(
        select(MembershipRequest).where(
            and_(
                MembershipRequest.clinic_id == clinic_id,
                MembershipRequest.doctor_id == doctor_id,
                MembershipRequest.status == RequestStatus.pending,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Já existe uma solicitação pendente")

    req = MembershipRequest(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        initiated_by=initiated,
        message=body.message,
    )
    db.add(req)
    await db.flush()

    # Notificação para o destinatário
    notif = Notification(
        recipient_id=notify_id,
        type=NotificationType.membership_request,
        title="Nova solicitação de vínculo",
        body=body.message or "Você recebeu uma solicitação de vínculo.",
        data={"request_id": req.id},
    )
    db.add(notif)

    return {"id": req.id, "status": req.status}


@router.post("/{request_id}/approve")
async def approve_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = await _get_request_or_404(request_id, db)
    _assert_can_respond(req, current_user)

    req.status = RequestStatus.approved
    req.responded_at = datetime.now(timezone.utc)

    # Cria vínculo
    membership = ClinicMembership(clinic_id=req.clinic_id, doctor_id=req.doctor_id)
    db.add(membership)

    # Notifica quem iniciou
    notify_id = req.doctor_id if req.initiated_by == InitiatedBy.clinic else req.clinic_id
    notif = Notification(
        recipient_id=notify_id,
        type=NotificationType.membership_approved,
        title="Solicitação aprovada!",
        body="Seu pedido de vínculo foi aprovado.",
        data={"request_id": req.id},
    )
    db.add(notif)

    return {"status": "approved"}


@router.post("/{request_id}/reject")
async def reject_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = await _get_request_or_404(request_id, db)
    _assert_can_respond(req, current_user)

    req.status = RequestStatus.rejected
    req.responded_at = datetime.now(timezone.utc)

    notify_id = req.doctor_id if req.initiated_by == InitiatedBy.clinic else req.clinic_id
    notif = Notification(
        recipient_id=notify_id,
        type=NotificationType.membership_rejected,
        title="Solicitação recusada",
        body="Seu pedido de vínculo foi recusado.",
        data={"request_id": req.id},
    )
    db.add(notif)

    return {"status": "rejected"}


@router.get("/pending")
async def list_pending(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.clinic:
        q = select(MembershipRequest).where(
            and_(MembershipRequest.clinic_id == current_user.id, MembershipRequest.status == RequestStatus.pending)
        )
    elif current_user.role == UserRole.doctor:
        q = select(MembershipRequest).where(
            and_(MembershipRequest.doctor_id == current_user.id, MembershipRequest.status == RequestStatus.pending)
        )
    else:
        raise HTTPException(status_code=403)

    result = await db.execute(q)
    requests = result.scalars().all()
    return [{"id": r.id, "clinic_id": r.clinic_id, "doctor_id": r.doctor_id, "initiated_by": r.initiated_by, "message": r.message, "created_at": r.created_at} for r in requests]


async def _get_request_or_404(request_id: str, db: AsyncSession) -> MembershipRequest:
    result = await db.execute(select(MembershipRequest).where(MembershipRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if req.status != RequestStatus.pending:
        raise HTTPException(status_code=409, detail="Solicitação já processada")
    return req


def _assert_can_respond(req: MembershipRequest, user: User):
    # Quem pode responder é quem recebeu, não quem enviou
    if req.initiated_by == InitiatedBy.doctor and user.id != req.clinic_id:
        raise HTTPException(status_code=403, detail="Apenas a clínica pode responder a esta solicitação")
    if req.initiated_by == InitiatedBy.clinic and user.id != req.doctor_id:
        raise HTTPException(status_code=403, detail="Apenas o médico pode responder a esta solicitação")
