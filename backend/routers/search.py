import io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from config import settings
from database import get_db
from models.models import Business, SearchLog, ViewLog, User, PointLog
from routers.auth import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


# ── 마스킹 함수 (서버사이드 - 개발자도구로 볼 수 없음) ──────────────
def partial_name(name: str) -> str:
    """홍길동치킨 → 홍●●● (첫 글자만 공개)"""
    if not name:
        return "●●●"
    if len(name) <= 1:
        return name + "●"
    return name[0] + "●" * (len(name) - 1)


def partial_addr(addr: str | None) -> str:
    """서울시 강남구 테헤란로 123 → 서울시 강남구 ●●● (시군구까지만 공개)"""
    if not addr:
        return "●●●"
    parts = addr.strip().split()
    if len(parts) <= 2:
        return addr + " ●●●"
    visible = " ".join(parts[:3])
    return visible + " ●●●"


def mask_tel(tel: str | None) -> str:
    """전화번호 마스킹"""
    if not tel or not tel.strip():
        return ""
    return "●●●-●●●●-●●●●"


def get_point_cost(b: Business) -> int:
    """전화번호 없으면 5P, 있으면 30P"""
    if not b.tel or not b.tel.strip():
        return 5
    return settings.POINT_PER_VIEW


def normalize_status(status: str | None) -> str:
    """영업/정상 → 영업중 정규화"""
    if not status:
        return ""
    if "영업" in status:
        return "영업중"
    return status


def build_business_item(b: Business, revealed: bool, rank: int) -> dict:
    has_tel = bool(b.tel and b.tel.strip())
    point_cost = get_point_cost(b)
    status = normalize_status(b.status)

    if revealed or rank <= settings.FREE_VIEW_COUNT:
        return {
            "id": str(b.id),
            "rank": rank,
            "bsn_nm": b.bsn_nm,
            "uptae_nm": b.uptae_nm,
            "addr": b.addr,
            "road_addr": b.road_addr,
            "tel": b.tel,
            "status": status,
            "open_date": str(b.open_date) if b.open_date else None,
            "sido": b.sido,
            "sigungu": b.sigungu,
            "masked": False,
            "has_tel": has_tel,
            "point_cost": point_cost,
        }
    return {
        "id": str(b.id),
        "rank": rank,
        "bsn_nm": partial_name(b.bsn_nm),
        "uptae_nm": b.uptae_nm,
        "addr": partial_addr(b.addr),
        "road_addr": partial_addr(b.road_addr),
        "tel": mask_tel(b.tel),
        "status": status,
        "open_date": str(b.open_date) if b.open_date else None,
        "sido": b.sido,
        "sigungu": b.sigungu,
        "masked": True,
        "has_tel": has_tel,
        "point_cost": point_cost,
    }


# ── 통계 ──────────────────────────────────────────────────────
@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """메인화면용 데이터 통계"""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    monday_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total = (await db.execute(select(func.count()).select_from(Business))).scalar()
    this_month = (await db.execute(
        select(func.count()).select_from(Business).where(Business.created_at >= month_start)
    )).scalar()
    this_week = (await db.execute(
        select(func.count()).select_from(Business).where(Business.created_at >= monday_start)
    )).scalar()
    today_count = (await db.execute(
        select(func.count()).select_from(Business).where(Business.created_at >= today_start)
    )).scalar()

    return {
        "total": total,
        "this_month": this_month,
        "this_week": this_week,
        "today": today_count,
        "updated_at": now.strftime("%Y-%m-%d"),
    }


# ── 검색 ──────────────────────────────────────────────────────
@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=1000),
    sido: str | None = None,
    sigungu: str | None = None,
    uptae: str | None = None,
    status: str | None = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    # 현재 사용자 확인 (옵셔널)
    token = request.headers.get("Authorization", "").replace("Bearer ", "") if request else None
    current_user: User | None = None
    viewed_ids: set[str] = set()

    if token:
        try:
            from jose import jwt
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                import uuid
                result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
                current_user = result.scalar_one_or_none()
                vl = await db.execute(
                    select(ViewLog.business_id).where(ViewLog.user_id == current_user.id)
                )
                viewed_ids = {str(row[0]) for row in vl.fetchall()}
        except Exception:
            pass

    stmt = select(Business)
    conditions = []

    conditions.append(
        or_(
            Business.bsn_nm.ilike(f"%{q}%"),
            Business.addr.ilike(f"%{q}%"),
            Business.uptae_nm.ilike(f"%{q}%"),
        )
    )

    if sido and sido != "전국":
        conditions.append(Business.sido.ilike(f"%{sido}%"))
    if sigungu:
        conditions.append(Business.sigungu.ilike(f"%{sigungu}%"))
    if uptae:
        conditions.append(Business.uptae_nm.ilike(f"%{uptae}%"))
    if status and status != "전체":
        if status == "영업중":
            conditions.append(or_(Business.status == "영업중", Business.status.ilike("%영업%")))
        else:
            conditions.append(Business.status == status)

    for cond in conditions:
        stmt = stmt.where(cond)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()

    stmt = stmt.order_by(Business.bsn_nm).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for i, b in enumerate(rows):
        rank = (page - 1) * size + i + 1
        revealed = str(b.id) in viewed_ids
        items.append(build_business_item(b, revealed, rank))

    log = SearchLog(
        user_id=current_user.id if current_user else None,
        query=q,
        result_cnt=total,
        ip=request.client.host if request and request.client else None,
    )
    db.add(log)
    await db.commit()

    return {"total": total, "page": page, "size": size, "items": items}


# ── 열람 ──────────────────────────────────────────────────────
@router.post("/reveal")
async def reveal_items(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = body.get("ids", [])
    if not ids:
        return {"message": "선택된 항목이 없습니다", "revealed": []}

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

    # 가게별 포인트 계산 (전화번호 없으면 5P)
    new_bizs = (await db.execute(select(Business).where(Business.id.in_(new_ids)))).scalars().all()
    required_points = sum(get_point_cost(b) for b in new_bizs)

    if current_user.points < required_points:
        raise HTTPException(
            status_code=402,
            detail=f"포인트가 부족합니다. 필요: {required_points}P, 보유: {current_user.points}P",
        )

    current_user.points -= required_points
    db.add(PointLog(
        user_id=current_user.id,
        type="use",
        amount=-required_points,
        balance=current_user.points,
        description=f"{len(new_ids)}건 가게 정보 열람",
    ))

    for b in new_bizs:
        db.add(ViewLog(user_id=current_user.id, business_id=b.id, points_used=get_point_cost(b)))

    await db.commit()

    revealed_data = []
    for b in new_bizs:
        revealed_data.append({
            "id": str(b.id),
            "bsn_nm": b.bsn_nm,
            "uptae_nm": b.uptae_nm,
            "addr": b.addr,
            "road_addr": b.road_addr,
            "tel": b.tel,
            "status": normalize_status(b.status),
            "open_date": str(b.open_date) if b.open_date else None,
            "has_tel": bool(b.tel and b.tel.strip()),
        })

    return {
        "message": f"{len(new_ids)}건 열람 완료",
        "points_used": required_points,
        "remaining_points": current_user.points,
        "revealed": revealed_data,
    }


# ── 엑셀 다운로드 ─────────────────────────────────────────────
@router.post("/excel")
async def download_excel(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="선택된 항목이 없습니다")

    vl_res = await db.execute(
        select(ViewLog.business_id).where(
            ViewLog.user_id == current_user.id,
            ViewLog.business_id.in_(ids),
        )
    )
    already_viewed = {str(row[0]) for row in vl_res.fetchall()}
    new_ids = [i for i in ids if i not in already_viewed]

    if new_ids:
        new_bizs = (await db.execute(select(Business).where(Business.id.in_(new_ids)))).scalars().all()
        required_points = sum(get_point_cost(b) for b in new_bizs)

        if current_user.points < required_points:
            raise HTTPException(
                status_code=402,
                detail=f"포인트 부족. 필요: {required_points}P, 보유: {current_user.points}P",
            )
        current_user.points -= required_points
        db.add(PointLog(
            user_id=current_user.id,
            type="use",
            amount=-required_points,
            balance=current_user.points,
            description=f"{len(new_ids)}건 엑셀 다운로드",
        ))
        for b in new_bizs:
            db.add(ViewLog(user_id=current_user.id, business_id=b.id, points_used=get_point_cost(b)))
        await db.commit()

    all_ids = list(set(ids))
    result = await db.execute(select(Business).where(Business.id.in_(all_ids)))
    businesses = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "가게정보"

    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    center = Alignment(horizontal="center", vertical="center")
    thin = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    headers = ["순번", "상호명", "업종", "영업상태", "도로명주소", "주소", "전화번호", "개업일자", "시도", "시군구"]
    col_widths = [6, 25, 15, 10, 40, 40, 16, 12, 8, 10]

    for col_idx, (h, w) in enumerate(zip(headers, col_widths), 1):
        cell = ws.cell(row=1, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center
        cell.border = thin
        ws.column_dimensions[get_column_letter(col_idx)].width = w

    ws.row_dimensions[1].height = 22

    for row_idx, b in enumerate(businesses, 2):
        row_data = [
            row_idx - 1,
            b.bsn_nm,
            b.uptae_nm or "",
            normalize_status(b.status),
            b.road_addr or "",
            b.addr or "",
            b.tel or "",
            str(b.open_date) if b.open_date else "",
            b.sido or "",
            b.sigungu or "",
        ]
        for col_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = thin
            cell.alignment = Alignment(vertical="center")
            if col_idx == 1:
                cell.alignment = center

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    from urllib.parse import quote
    filename = quote("AIDB_가게정보.xlsx")

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )
