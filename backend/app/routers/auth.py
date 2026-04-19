from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterPatientRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    cpf: str | None = None
    phone: str | None = None
    address_city: str | None = None
    address_state: str | None = None


class RegisterClinicRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    cnpj: str | None = None
    phone: str | None = None
    latitude: float
    longitude: float
    address_street: str | None = None
    address_city: str | None = None
    address_state: str | None = None
    specialties: list[str] = []
    is_emergency: bool = False


class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    crm: str
    crm_state: str
    specialty: str | None = None
    phone: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)


@router.post("/register/patient", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_patient(body: RegisterPatientRequest, db: AsyncSession = Depends(get_db)):
    await _check_email_unique(body.email, db)

    user = User(email=body.email, hashed_password=hash_password(body.password), role=UserRole.patient)
    db.add(user)
    await db.flush()

    patient = Patient(
        id=user.id,
        full_name=body.full_name,
        cpf=body.cpf,
        phone=body.phone,
        address_city=body.address_city,
        address_state=body.address_state,
    )
    db.add(patient)
    await db.flush()

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)


@router.post("/register/clinic", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_clinic(body: RegisterClinicRequest, db: AsyncSession = Depends(get_db)):
    await _check_email_unique(body.email, db)

    user = User(email=body.email, hashed_password=hash_password(body.password), role=UserRole.clinic)
    db.add(user)
    await db.flush()

    clinic = Clinic(
        id=user.id,
        name=body.name,
        cnpj=body.cnpj,
        phone=body.phone,
        latitude=body.latitude,
        longitude=body.longitude,
        address_street=body.address_street,
        address_city=body.address_city,
        address_state=body.address_state,
        specialties=body.specialties,
        is_emergency=body.is_emergency,
    )
    db.add(clinic)
    await db.flush()

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)


@router.post("/register/doctor", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(body: RegisterDoctorRequest, db: AsyncSession = Depends(get_db)):
    await _check_email_unique(body.email, db)

    user = User(email=body.email, hashed_password=hash_password(body.password), role=UserRole.doctor)
    db.add(user)
    await db.flush()

    doctor = Doctor(
        id=user.id,
        full_name=body.full_name,
        crm=body.crm,
        crm_state=body.crm_state,
        specialty=body.specialty,
        phone=body.phone,
    )
    db.add(doctor)
    await db.flush()

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)


async def _check_email_unique(email: str, db: AsyncSession):
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")
