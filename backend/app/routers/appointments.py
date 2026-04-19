"""
Agendamento de consultas: disponibilidade de médicos + agente de booking.
"""
from __future__ import annotations

import logging
from datetime import datetime, date, timedelta, timezone, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.membership import ClinicMembership
from app.models.doctor_schedule import DoctorSchedule
from app.models.appointment import Appointment, AppointmentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])

# ── Specialty → syndrome mapping ──────────────────────────────────────────────
_SYNDROME_TO_SPECIALTY: dict[str, list[str]] = {
    "dengue":            ["infectologia", "clínica médica", "medicina de família", "emergência"],
    "chikungunya":       ["infectologia", "reumatologia", "clínica médica"],
    "zika":              ["infectologia", "clínica médica", "ginecologia"],
    "covid-19":          ["infectologia", "pneumologia", "clínica médica"],
    "influenza":         ["clínica médica", "medicina de família", "infectologia"],
    "síndrome gripal":   ["clínica médica", "medicina de família"],
    "respiratory":       ["pneumologia", "clínica médica", "otorrinolaringologia"],
    "gastrointestinal":  ["gastroenterologia", "clínica médica", "medicina de família"],
    "febre hemorrágica": ["infectologia", "hematologia", "emergência"],
    "meningite":         ["neurologia", "infectologia", "emergência"],
    "leptospirose":      ["infectologia", "clínica médica", "nefrologia"],
    "sarampo":           ["infectologia", "pediatria", "clínica médica"],
    "varicela":          ["infectologia", "dermatologia", "clínica médica"],
}

_DEFAULT_SPECIALTIES = ["clínica médica", "medicina de família", "clínico geral"]


def _relevant_specialties(syndrome_name: str | None) -> list[str]:
    if not syndrome_name:
        return _DEFAULT_SPECIALTIES
    return _SYNDROME_TO_SPECIALTY.get(syndrome_name.lower().strip(), _DEFAULT_SPECIALTIES)


def _doctor_score(doctor: Doctor, target_specialties: list[str]) -> int:
    """Pontua um médico pela relevância da especialidade (maior = melhor)."""
    spec = (doctor.specialty or "").lower()
    subs = [s.lower() for s in (doctor.sub_specialties or [])]
    for i, ts in enumerate(target_specialties):
        if ts in spec or any(ts in s for s in subs):
            return len(target_specialties) - i
    return 0


def _generate_slots(schedule: DoctorSchedule, for_date: date) -> list[datetime]:
    """Gera todos os slots de horário para uma data específica."""
    start_h, start_m = map(int, schedule.start_time.split(":"))
    end_h, end_m     = map(int, schedule.end_time.split(":"))
    start_dt = datetime(for_date.year, for_date.month, for_date.day, start_h, start_m, tzinfo=timezone.utc)
    end_dt   = datetime(for_date.year, for_date.month, for_date.day, end_h,   end_m,   tzinfo=timezone.utc)
    slots = []
    current = start_dt
    while current + timedelta(minutes=schedule.slot_minutes) <= end_dt:
        slots.append(current)
        current += timedelta(minutes=schedule.slot_minutes)
    return slots


async def _get_booked_slots(doctor_id: str, date_from: datetime, date_to: datetime, db: AsyncSession) -> set[datetime]:
    res = await db.execute(
        select(Appointment.scheduled_at).where(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed]),
                Appointment.scheduled_at >= date_from,
                Appointment.scheduled_at < date_to,
            )
        )
    )
    return {r[0].replace(tzinfo=timezone.utc) if r[0].tzinfo is None else r[0] for r in res.all()}


# ── Schemas ───────────────────────────────────────────────────────────────────

class SlotOut(BaseModel):
    datetime_utc: str
    datetime_local: str   # ISO Brazil local (-3h)


class DoctorWithSlots(BaseModel):
    doctor_id: str
    full_name: str
    specialty: str | None
    crm: str
    score: int            # relevância para a síndrome
    slots: list[SlotOut]


class ManualBookRequest(BaseModel):
    clinic_id: str
    doctor_id: str
    scheduled_at: str   # ISO datetime UTC
    reason: str | None = None


class AgentBookRequest(BaseModel):
    clinic_id: str
    syndrome_name: str | None = None
    preferred_days: int = 7    # janela de busca


class AppointmentOut(BaseModel):
    id: str
    doctor_id: str
    doctor_name: str
    clinic_id: str
    clinic_name: str
    scheduled_at: str
    status: str
    reason: str | None
    notes: str | None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=AppointmentOut)
async def create_appointment(
    body: ManualBookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agendamento manual: paciente escolhe médico e slot."""
    scheduled_at = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    # Verifica que slot está livre
    booked = await _get_booked_slots(
        body.doctor_id,
        scheduled_at - timedelta(seconds=1),
        scheduled_at + timedelta(minutes=1),
        db,
    )
    if scheduled_at.replace(tzinfo=timezone.utc) in {s.replace(tzinfo=timezone.utc) for s in booked}:
        raise HTTPException(409, "Este horário já está ocupado.")

    doc_res = await db.execute(select(Doctor).where(Doctor.id == body.doctor_id))
    doc = doc_res.scalar_one_or_none()
    cli_res = await db.execute(select(Clinic).where(Clinic.id == body.clinic_id))
    cli = cli_res.scalar_one_or_none()

    appt = Appointment(
        patient_id=current_user.id,
        doctor_id=body.doctor_id,
        clinic_id=body.clinic_id,
        scheduled_at=scheduled_at,
        status=AppointmentStatus.pending,
        reason=body.reason,
    )
    db.add(appt)
    await db.flush()

    return AppointmentOut(
        id=appt.id,
        doctor_id=body.doctor_id,
        doctor_name=doc.full_name if doc else "Médico",
        clinic_id=body.clinic_id,
        clinic_name=cli.name if cli else "Clínica",
        scheduled_at=scheduled_at.isoformat(),
        status="pending",
        reason=body.reason,
        notes=None,
    )


@router.get("/clinic/{clinic_id}/doctors", response_model=list[DoctorWithSlots])
async def clinic_doctors_with_slots(
    clinic_id: str,
    syndrome: str | None = Query(None),
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista médicos de uma clínica com slots disponíveis,
    priorizados por relevância para a síndrome do paciente.
    """
    # Membros da clínica
    members_res = await db.execute(
        select(ClinicMembership).where(ClinicMembership.clinic_id == clinic_id)
    )
    memberships = members_res.scalars().all()
    if not memberships:
        return []

    doctor_ids = [m.doctor_id for m in memberships]
    docs_res = await db.execute(select(Doctor).where(Doctor.id.in_(doctor_ids)))
    doctors = docs_res.scalars().all()

    target_specialties = _relevant_specialties(syndrome)
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(days=days)
    result: list[DoctorWithSlots] = []

    for doctor in doctors:
        score = _doctor_score(doctor, target_specialties)

        # Schedules do médico nessa clínica
        sched_res = await db.execute(
            select(DoctorSchedule).where(
                and_(
                    DoctorSchedule.doctor_id == doctor.id,
                    DoctorSchedule.clinic_id == clinic_id,
                )
            )
        )
        schedules = sched_res.scalars().all()
        if not schedules:
            continue

        # Gera todos os slots disponíveis na janela
        booked = await _get_booked_slots(doctor.id, now, window_end, db)
        free_slots: list[SlotOut] = []

        check_date = now.date()
        while check_date <= window_end.date() and len(free_slots) < 20:
            day_dow = check_date.weekday()  # 0=Mon
            for sched in schedules:
                if sched.day_of_week != day_dow:
                    continue
                for slot_dt in _generate_slots(sched, check_date):
                    if slot_dt <= now:
                        continue
                    if slot_dt in booked:
                        continue
                    # Formata horário local BR (UTC-3)
                    local_dt = slot_dt - timedelta(hours=3)
                    free_slots.append(SlotOut(
                        datetime_utc=slot_dt.isoformat(),
                        datetime_local=local_dt.strftime("%d/%m %H:%M"),
                    ))
            check_date += timedelta(days=1)

        if free_slots:
            result.append(DoctorWithSlots(
                doctor_id=doctor.id,
                full_name=doctor.full_name,
                specialty=doctor.specialty,
                crm=f"CRM-{doctor.crm_state} {doctor.crm}",
                score=score,
                slots=free_slots[:12],  # máx 12 slots por médico
            ))

    # Ordena: relevância desc, depois quantidade de slots
    result.sort(key=lambda d: (-d.score, -len(d.slots)))
    return result


@router.post("/agent-book", response_model=AppointmentOut)
async def agent_book(
    body: AgentBookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Agente de agendamento: analisa médicos disponíveis na clínica,
    escolhe o mais adequado para a síndrome e reserva o primeiro slot livre.
    """
    # 1. Clínica existe?
    clinic_res = await db.execute(select(Clinic).where(Clinic.id == body.clinic_id))
    clinic = clinic_res.scalar_one_or_none()
    if not clinic:
        raise HTTPException(404, "Clínica não encontrada.")

    # 2. Lista doutores com slots (reutiliza a lógica acima)
    doctors_slots = await clinic_doctors_with_slots(
        clinic_id=body.clinic_id,
        syndrome=body.syndrome_name,
        days=body.preferred_days,
        current_user=current_user,
        db=db,
    )

    if not doctors_slots:
        raise HTTPException(409, "Nenhum médico com disponibilidade nessa clínica no período.")

    # 3. Agente escolhe: maior score, depois primeiro slot
    best = doctors_slots[0]
    slot_iso = best.slots[0].datetime_utc
    scheduled_at = datetime.fromisoformat(slot_iso)

    # 4. Cria agendamento
    target_specs = _relevant_specialties(body.syndrome_name)
    notes = (
        f"Agendado automaticamente pelo assistente Sentinela. "
        f"Síndrome: {body.syndrome_name or 'não especificada'}. "
        f"Especialidades buscadas: {', '.join(target_specs[:3])}. "
        f"Médico selecionado: {best.full_name} (score={best.score})."
    )

    appt = Appointment(
        patient_id=current_user.id,
        doctor_id=best.doctor_id,
        clinic_id=body.clinic_id,
        scheduled_at=scheduled_at,
        status=AppointmentStatus.pending,
        reason=body.syndrome_name,
        notes=notes,
    )
    db.add(appt)
    await db.flush()

    return AppointmentOut(
        id=appt.id,
        doctor_id=best.doctor_id,
        doctor_name=best.full_name,
        clinic_id=body.clinic_id,
        clinic_name=clinic.name,
        scheduled_at=scheduled_at.isoformat(),
        status="pending",
        reason=body.syndrome_name,
        notes=notes,
    )


@router.get("/my", response_model=list[AppointmentOut])
async def my_appointments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consultas do paciente logado."""
    res = await db.execute(
        select(Appointment)
        .where(Appointment.patient_id == current_user.id)
        .order_by(Appointment.scheduled_at)
    )
    appts = res.scalars().all()
    out = []
    for a in appts:
        doc_res = await db.execute(select(Doctor).where(Doctor.id == a.doctor_id))
        doc = doc_res.scalar_one_or_none()
        cli_res = await db.execute(select(Clinic).where(Clinic.id == a.clinic_id))
        cli = cli_res.scalar_one_or_none()
        out.append(AppointmentOut(
            id=a.id,
            doctor_id=a.doctor_id,
            doctor_name=doc.full_name if doc else "Médico",
            clinic_id=a.clinic_id,
            clinic_name=cli.name if cli else "Clínica",
            scheduled_at=a.scheduled_at.isoformat(),
            status=a.status,
            reason=a.reason,
            notes=a.notes,
        ))
    return out


@router.patch("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(404, "Consulta não encontrada.")
    if appt.patient_id != current_user.id:
        raise HTTPException(403, "Acesso negado.")
    appt.status = AppointmentStatus.cancelled
    return {"status": "cancelled"}
