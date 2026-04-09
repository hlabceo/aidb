from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import User, Business, SearchLog, ViewLog, ChargeLog, PointLog
from routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return current_user


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user_cnt = (await db.execute(select(func.count()).select_from(User).where(User.role == "user"))).scalar()
    biz_cnt = (await db.execute(select(func.count()).select_from(Business))).scalar()
    search_cnt = (await db.execute(select(func.count()).select_from(SearchLog))).scalar()
    view_cnt = (await db.execute(select(func.count()).select_from(ViewLog))).scalar()
    revenue = (await db.execute(
        select(func.sum(ChargeLog.amount)).where(ChargeLog.status == "success")
    )).scalar() or 0

    return {
        "users": user_cnt,
        "businesses": biz_cnt,
        "searches": search_cnt,
        "views": view_cnt,
        "revenue": revenue,
    }


@router.get("/users")
async def list_users(
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    offset = (page - 1) * size
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).offset(offset).limit(size)
    )
    users = result.scalars().all()
    total = (await db.execute(select(func.count()).select_from(User))).scalar()
    return {
        "total": total,
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "points": u.points,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
    }


@router.get("/searches")
async def recent_searches(
    page: int = 1,
    size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    offset = (page - 1) * size
    result = await db.execute(
        select(SearchLog).order_by(desc(SearchLog.created_at)).offset(offset).limit(size)
    )
    logs = result.scalars().all()
    return {
        "logs": [
            {
                "query": l.query,
                "result_cnt": l.result_cnt,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ]
    }
