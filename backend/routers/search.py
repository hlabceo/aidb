import json
import re
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from config import settings
from database import get_db
from models.models import Business, SearchLog, ViewLog, User
from routers.auth import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


def mask_name(name: str) -> str:
    """홍길동치킨 → 홍**치킨"""
    if not name or len(name) <= 2:
        return name[0] + "*" if name else "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]

def mask_field(value: str | None) -> str:
    if not value:
        return "***"
    return "*" * min(len(value), 8)


def build_business_item(b: Business, revealed: bool, rank: int) -> dict:
    if revealed or rank <= settings.FREE_VIEW_COUNT:
        return {
            "id": str(b.id),
            "rank": rank,
            "bsn_nm": b.bsn_nm,
            "uptae_nm": b.uptae_nm,
            "addr": b.addr,
            "road_addr": b.road_addr,
            "tel": b.tel,
            "status": b.status,
            "open_date": str(b.open_date) if b.open_date else None,
            "sido": b.sido,
            "sigungu": b.sigungu,
            "masked": False,
        }
    return {
        "id": str(b.id),
        "rank": rank,
        "bsn_nm": mask_name(b.bsn_nm),
        "uptae_nm": mask_field(b.uptae_nm),
        "addr": mask_field(b.addr),
        "road_addr": mask_field(b.road_addr),
        "tel": mask_field(b.tel),
        "status": "***",
        "open_date": None,
        "sido": b.sido,
        "sigungu": b.sigungu,
        "masked": True,
    }


@router.get("")
async def search(
    q: str = Query(..., min_length=1, description="검색어"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sido: str | None = None,
    sigungu: str | None = None,
    uptae: str | None = None,
    status: str | None = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    검색 API
    - 비회원/회원 모두 사용 가능
    - 1~3번은 전체 공개, 4번~는 마스킹
    - 열람 이력 있는 항목은 마스킹 해제
    """
    # 현재 사용자 확인 (옵셔널)
    token = request.headers.get("Authorization", "").replace("Bearer ", "") if request else None
    current_user: User | None = None
    viewed_ids: set[str] = set()

    if token:
        try:
            from routers.auth import get_current_user as gcu
            from routers.auth import pwd_context
            from jose import jwt
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(
                    select(User).where(User.id == user_id)
                )
                current_user = result.scalar_one_or_none()
                # 이미 열람한 항목 조회
                vl = await db.execute(
                    select(ViewLog.business_id).where(ViewLog.user_id == current_user.id)
                )
                viewed_ids = {str(row[0]) for row in vl.fetchall()}
        except Exception:
            pass

    # 검색 쿼리 빌드
    stmt = select(Business)
    conditions = []

    # 검색어: 사업장명 OR 주소 트라이그램 유사도 검색
    conditions.append(
        or_(
            Business.bsn_nm.ilike(f"%{q}%"),
            Business.addr.ilike(f"%{q}%"),
            Business.uptae_nm.ilike(f"%{q}%"),
        )
    )

    if sido:
        conditions.append(Business.sido == sido)
    if sigungu:
        conditions.append(Business.sigungu == sigungu)
    if uptae:
        conditions.append(Business.uptae_nm.ilike(f"%{uptae}%"))
    if status:
        conditions.append(Business.status == status)

    for cond in conditions:
        stmt = stmt.where(cond)

    # 전체 카운트
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()

    # 페이지네이션
    stmt = stmt.order_by(Business.bsn_nm).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()

    # 결과 조립
    items = []
    for i, b in enumerate(rows):
        rank = (page - 1) * size + i + 1
        revealed = str(b.id) in viewed_ids
        items.append(build_business_item(b, revealed, rank))

    # 검색 로그 기록
    log = SearchLog(
        user_id=current_user.id if current_user else None,
        query=q,
        result_cnt=total,
        ip=request.client.host if request and request.client else None,
    )
    db.add(log)
    await db.commit()

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": items,
    }


@router.post("/reveal")
async def reveal_items(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    선택한 항목 포인트 차감 후 열람
    body: { "ids": ["uuid1", "uuid2", ...] }
    """
    ids = body.get("ids", [])
    if not ids:
        return {"message": "선택된 항목이 없습니다", "revealed": []}

    # 이미 열람한 항목 제외
    vl = await db.execute(
        select(ViewLog.business_id).where(
            ViewLog.user_id == current_user.id,
            ViewLog.business_id.in_(ids),
        )
    )
    already_viewed = {str(row[0]) for row in vl.fetchall()}
    new_ids = [i for i in ids if i not in already_viewed]

    if not new_ids:
        return {"message": "이미 열람한 항목입니다", "revealed": list(already_viewed)}

    required_points = len(new_ids) * settings.POINT_PER_VIEW
    if current_user.points < required_points:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=402,
            detail=f"포인트가 부족합니다. 필요: {required_points}P, 보유: {current_user.points}P",
        )

    # 포인트 차감
    current_user.points -= required_points

    from models.models import PointLog
    point_log = PointLog(
        user_id=current_user.id,
        type="use",
        amount=-required_points,
        balance=current_user.points,
        description=f"{len(new_ids)}건 업소 정보 열람",
    )
    db.add(point_log)

    # 열람 기록 저장
    for bid in new_ids:
        vl = ViewLog(user_id=current_user.id, business_id=bid, points_used=settings.POINT_PER_VIEW)
        db.add(vl)

    await db.commit()

    # 실제 데이터 반환
    result = await db.execute(select(Business).where(Business.id.in_(new_ids)))
    businesses = result.scalars().all()

    revealed_data = []
    for b in businesses:
        revealed_data.append({
            "id": str(b.id),
            "bsn_nm": b.bsn_nm,
            "uptae_nm": b.uptae_nm,
            "addr": b.addr,
            "road_addr": b.road_addr,
            "tel": b.tel,
            "status": b.status,
            "open_date": str(b.open_date) if b.open_date else None,
        })

    return {
        "message": f"{len(new_ids)}건 열람 완료",
        "points_used": required_points,
        "remaining_points": current_user.points,
        "revealed": revealed_data,
    }
