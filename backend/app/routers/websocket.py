import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.security import decode_token
from app.core.websocket_manager import manager, clinic_manager
from app.models.patient import Patient
from app.models.clinic import Clinic
from app.models.chat_message import ChatMessage, MessageRole
from app.models.user import UserRole
from app.services.syndrome_service import process_message, get_or_create_session

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)


@router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    lat: float = Query(None),
    lng: float = Query(None),
    new_session: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
    except Exception:
        await websocket.close(code=4001)
        return

    if role != UserRole.patient:
        await websocket.close(code=4003)
        return

    result = await db.execute(select(Patient).where(Patient.id == user_id))
    patient = result.scalar_one_or_none()
    if not patient:
        await websocket.close(code=4004)
        return

    session = await get_or_create_session(user_id, lat, lng, db, new_session=new_session)
    await db.commit()
    await manager.connect(websocket, session.id)

    # Carrega histórico da sessão
    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .where(ChatMessage.role != MessageRole.system)
        .order_by(ChatMessage.created_at.asc())
        .limit(40)
    )
    history_msgs = msgs_result.scalars().all()

    if history_msgs:
        # Sessão existente — envia histórico, sem saudação nova
        await websocket.send_json({
            "type": "history",
            "session_id": session.id,
            "messages": [
                {
                    "id":        m.id,
                    "role":      m.role.value,
                    "content":   m.content,
                    "timestamp": m.created_at.isoformat(),
                }
                for m in history_msgs
            ],
            "syndrome":       session.final_syndrome,
            "urgency_level":  session.urgency_level,
        })
    else:
        # Sessão nova — envia saudação
        await websocket.send_json({
            "type": "connected",
            "session_id": session.id,
            "message": "Olá! Sou o Sentinela, seu assistente de saúde. Como você está se sentindo? Pode me contar seus sintomas.",
        })

    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("message", "").strip()
            if not content:
                continue

            # Mostra "digitando..."
            await websocket.send_json({"type": "typing", "session_id": session.id})

            response = await process_message(
                session=session,
                user_content=content,
                db=db,
                patient_lat=lat,
                patient_lng=lng,
            )
            await db.commit()

            await websocket.send_json(response)

    except WebSocketDisconnect:
        logger.info("WebSocket desconectado: sessão %s", session.id)
    except Exception as e:
        logger.error("Erro no WebSocket: %s", e)
        try:
            await websocket.send_json({"type": "error", "message": "Erro interno. Reconecte-se."})
        except Exception:
            pass
    finally:
        manager.disconnect(websocket, session.id)


@router.websocket("/ws/alerts")
async def alerts_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """WebSocket exclusivo para clínicas receberem alertas epidemiológicos em tempo real."""
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
    except Exception:
        await websocket.close(code=4001)
        return

    if role != UserRole.clinic:
        await websocket.close(code=4003)
        return

    result = await db.execute(select(Clinic).where(Clinic.id == user_id))
    clinic = result.scalar_one_or_none()
    if not clinic:
        await websocket.close(code=4004)
        return

    await clinic_manager.connect(websocket, clinic.id)
    await websocket.send_json({
        "type": "connected",
        "clinic_id": clinic.id,
        "message": "Canal de alertas epidemiológicos ativo.",
    })

    try:
        while True:
            # Mantém conexão viva; cliente pode enviar ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info("Clinic WS desconectado: %s", clinic.id)
    finally:
        clinic_manager.disconnect(websocket, clinic.id)
