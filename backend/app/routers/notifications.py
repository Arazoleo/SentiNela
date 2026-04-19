from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifs = result.scalars().all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "data": n.data,
            "is_read": n.is_read,
            "created_at": n.created_at,
        }
        for n in notifs
    ]


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.recipient_id == current_user.id)
        .where(Notification.is_read == False)
        .values(is_read=True)
    )
    return {"ok": True}
