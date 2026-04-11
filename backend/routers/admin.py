import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import User, Business, SearchLog, ViewLog, ChargeLog, PointLog
from routers.auth import get_current_user, hash_password

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


class UserUpdateBody(BaseModel):
    name: str | None = None
    password: str | None = None
    points: int | None = None
    role: str | None = None
    is_active: bool | None = None


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdateBody,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """회원 정보 수정 (이름/비밀번호/포인트/역할/활성화)"""
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다")

    if body.name is not None:
        user.name = body.name
    if body.password:
        user.password = hash_password(body.password)
    if body.points is not None:
        user.points = body.points
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    return {
        "message": "회원 정보가 수정되었습니다",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "points": user.points,
            "role": user.role,
            "is_active": user.is_active,
        }
    }


@router.post("/fix-status")
async def fix_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """영업/정상 → 영업중 일괄 정규화"""
    from sqlalchemy import update, text
    from models.models import Business
    result = await db.execute(
        text("UPDATE businesses SET status = '영업중' WHERE status LIKE '%영업%'")
    )
    await db.commit()
    return {"message": "영업상태 정규화 완료", "updated": result.rowcount}


@router.post("/collect")
async def trigger_collect(
    body: dict,
    background_tasks: BackgroundTasks,
    _: User = Depends(require_admin),
):
    """
    공공데이터 수집 트리거 (백그라운드 실행)
    body: { "sido": "서울", "max": 10000 }
    """
    from services.collector import collect, SIDO_CODES
    sido = body.get("sido", "서울")
    max_records = body.get("max", 5000)

    if sido != "all" and sido not in SIDO_CODES:
        raise HTTPException(status_code=400, detail=f"올바른 시도명을 입력하세요: {list(SIDO_CODES.keys())}")

    async def run_collect():
        if sido == "all":
            for nm in SIDO_CODES.keys():
                await collect(nm, max_records)
        else:
            await collect(sido, max_records)

    background_tasks.add_task(run_collect)
    return {"message": f"{sido} 데이터 수집을 백그라운드에서 시작했습니다", "max": max_records}


@router.get("/collect/status")
async def collect_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """현재 수집된 데이터 현황"""
    total = (await db.execute(select(func.count()).select_from(Business))).scalar()
    from sqlalchemy import text
    sido_result = await db.execute(
        select(Business.sido, func.count().label("cnt"))
        .group_by(Business.sido)
        .order_by(desc("cnt"))
    )
    sido_stats = [{"sido": row.sido, "count": row.cnt} for row in sido_result]
    return {"total": total, "by_sido": sido_stats}


@router.get("/test-api")
async def test_api(_: User = Depends(require_admin)):
    """API 키 및 연결 테스트 (서울 1건만 조회)"""
    import httpx
    from config import settings
    url = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInAdmi/v2"
    params = {
        "serviceKey": settings.DATA_GO_KR_API_KEY,
        "pageNo": 1,
        "numOfRows": 3,
        "type": "json",
        "divId": "ctprvnCd",
        "key": "11",
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=15.0)
            return {"status": resp.status_code, "data": resp.json()}
    except Exception as e:
        return {"error": str(e)}


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
