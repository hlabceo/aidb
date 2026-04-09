from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import User, PointLog, ChargeLog
from routers.auth import get_current_user

router = APIRouter(prefix="/points", tags=["points"])

# 충전 패키지 정의
CHARGE_PACKAGES = [
    {"id": 1, "amount": 1000,  "points": 1000,  "bonus": 0,   "label": "1,000원"},
    {"id": 2, "amount": 3000,  "points": 3300,  "bonus": 300,  "label": "3,000원"},
    {"id": 3, "amount": 5000,  "points": 5500,  "bonus": 500,  "label": "5,000원"},
    {"id": 4, "amount": 10000, "points": 11000, "bonus": 1000, "label": "10,000원"},
    {"id": 5, "amount": 30000, "points": 33000, "bonus": 3000, "label": "30,000원"},
    {"id": 6, "amount": 50000, "points": 60000, "bonus": 10000,"label": "50,000원"},
]


class ChargeRequest(BaseModel):
    package_id: int
    pg_tx_id: str | None = None
    pg_method: str | None = None


@router.get("/packages")
async def get_packages():
    return {"packages": CHARGE_PACKAGES}


@router.get("/history")
async def point_history(
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * size
    result = await db.execute(
        select(PointLog)
        .where(PointLog.user_id == current_user.id)
        .order_by(desc(PointLog.created_at))
        .offset(offset)
        .limit(size)
    )
    logs = result.scalars().all()
    return {
        "balance": current_user.points,
        "logs": [
            {
                "id": str(l.id),
                "type": l.type,
                "amount": l.amount,
                "balance": l.balance,
                "description": l.description,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
    }


@router.post("/charge")
async def charge_points(
    body: ChargeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    포인트 충전 (PG 연동 전 테스트용 — 실서비스에서는 PG 검증 후 호출)
    """
    pkg = next((p for p in CHARGE_PACKAGES if p["id"] == body.package_id), None)
    if not pkg:
        raise HTTPException(status_code=400, detail="존재하지 않는 충전 패키지입니다")

    # 충전 기록
    charge = ChargeLog(
        user_id=current_user.id,
        amount=pkg["amount"],
        points=pkg["points"],
        pg_tx_id=body.pg_tx_id,
        pg_method=body.pg_method,
        status="success",
    )
    db.add(charge)

    # 포인트 적립
    current_user.points += pkg["points"]
    log = PointLog(
        user_id=current_user.id,
        type="charge",
        amount=pkg["points"],
        balance=current_user.points,
        description=f"{pkg['label']} 충전 ({pkg['points']:,}P" + (f" + 보너스 {pkg['bonus']:,}P" if pkg["bonus"] else "") + ")",
        ref_id=body.pg_tx_id,
    )
    db.add(log)
    await db.commit()

    return {
        "message": f"{pkg['points']:,} 포인트가 충전되었습니다",
        "charged": pkg["points"],
        "balance": current_user.points,
    }
