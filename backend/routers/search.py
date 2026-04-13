import io
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import redis.asyncio as aioredis

from config import settings
from database import get_db
from models.models import Business, SearchLog, ViewLog, User, PointLog
from routers.auth import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


# ── 마스킹 함수 (서버사이드 - 개발자도구로 볼 수 없음) ──────────────
def partial_name(name: str) -> str:
    """홍길동치킨 → 홍길●● (첫 2글자 공개)"""
    if not name:
        return "●●●"
    if len(name) <= 2:
        return name[0] + "●"
    return name[:2] + "●" * (len(name) - 2)


def partial_addr(addr: str | None) -> str:
    """서울시 강남구 테헤란로 → 시+구+로 까지만 공개, 이후 ●●● 처리"""
    if not addr:
        return "●●●"
    parts = addr.strip().split()
    if len(parts) <= 3:
        return " ".join(parts) + " ●●●"
    visible = " ".join(parts[:3])
    return visible + " ●●●"


def mask_tel(tel: str | None) -> str:
    """전화번호 마스킹"""
    if not tel or not tel.strip():
        return ""
    return "●●●-●●●●-●●●●"


def get_point_cost(b: Business) -> int:
    """전화번호 없으면 15P, 있으면 30P"""
    if not b.tel or not b.tel.strip():
        return 15
    return settings.POINT_PER_VIEW


def normalize_status(status: str | None) -> str:
    """영업/정상 → 영업중 정규화"""
    if not status:
        return ""
    if "영업" in status:
        return "영업중"
    return status


def build_business_item(b: Business, revealed: bool, rank: int, free: bool = False) -> dict:
    has_tel = bool(b.tel and b.tel.strip())
    point_cost = get_point_cost(b)
    status = normalize_status(b.status)

    if revealed or free:
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
    """메인화면용 데이터 통계 (Redis 10분 캐시)"""
    CACHE_KEY = "stats:main"
    CACHE_TTL = 600  # 10분

    # Redis 캐시 확인
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        cached = await r.get(CACHE_KEY)
        if cached:
            await r.aclose()
            return json.loads(cached)
    except Exception:
        pass

    # 캐시 없으면 DB 조회
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

    result = {
        "total": total,
        "this_month": this_month,
        "this_week": this_week,
        "today": today_count,
        "updated_at": now.strftime("%Y-%m-%d"),
    }

    # Redis에 저장
    try:
        await r.setex(CACHE_KEY, CACHE_TTL, json.dumps(result))
    except Exception:
        pass
    finally:
        await r.aclose()

    return result


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

    # ══════════════════════════════════════════════════════════════
    # 업종 동의어 사전 (DB uptae_nm 실제값과 정확히 일치)
    # DB 값: 미용업 / 수영장업 / 체력단련장업 / 당구장업 / 목욕장업 / 썰매장업 / 골프연습장업
    # ══════════════════════════════════════════════════════════════
    SYNONYMS = {
        # ── 미용업 ──
        "미용": "미용업", "미용실": "미용업", "헤어샵": "미용업", "헤어": "미용업",
        "뷰티": "미용업", "미용원": "미용업", "헤어살롱": "미용업", "살롱": "미용업",
        "미용업": "미용업",
        # ── 수영장업 ──
        "수영": "수영장업", "수영장": "수영장업", "풀장": "수영장업", "수영장업": "수영장업",
        # ── 체력단련장업 ──
        "헬스": "체력단련장업", "헬스장": "체력단련장업", "헬스클럽": "체력단련장업",
        "피트니스": "체력단련장업", "피트니스센터": "체력단련장업",
        "gym": "체력단련장업", "짐": "체력단련장업",
        "체육관": "체력단련장업", "스포츠센터": "체력단련장업",
        "휘트니스": "체력단련장업", "크로스핏": "체력단련장업",
        "체력단련장": "체력단련장업", "체력단련장업": "체력단련장업",
        # ── 당구장업 ──
        "당구": "당구장업", "당구장": "당구장업", "포켓볼": "당구장업",
        "billiard": "당구장업", "당구업": "당구장업", "당구장업": "당구장업",
        # ── 목욕장업 ──
        "목욕": "목욕장업", "목욕탕": "목욕장업", "목욕장": "목욕장업",
        "사우나": "목욕장업", "찜질방": "목욕장업", "찜질": "목욕장업",
        "온천": "목욕장업", "스파": "목욕장업", "목욕장업": "목욕장업",
        # ── 썰매장업 ──
        "썰매": "썰매장업", "눈썰매": "썰매장업", "썰매장": "썰매장업", "썰매장업": "썰매장업",
        # ── 골프연습장업 ──
        "골프": "골프연습장업", "골프연습장": "골프연습장업", "골프장": "골프연습장업",
        "스크린골프": "골프연습장업", "연습장": "골프연습장업", "골프연습": "골프연습장업",
        "골프연습장업": "골프연습장업",
    }
    UPTAE_NAMES = set(SYNONYMS.values())  # DB 업종명 실제값 집합

    # ══════════════════════════════════════════════════════════════
    # 시도 매핑 사전
    # ══════════════════════════════════════════════════════════════
    SIDO_FULL = {
        "서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시",
        "인천": "인천광역시", "광주": "광주광역시", "대전": "대전광역시",
        "울산": "울산광역시", "세종": "세종특별자치시", "경기": "경기도",
        "강원": "강원도", "충북": "충청북도", "충남": "충청남도",
        "전북": "전라북도", "전남": "전라남도", "경북": "경상북도",
        "경남": "경상남도", "제주": "제주특별자치도",
    }
    SIDO_ALL = set(SIDO_FULL.keys()) | set(SIDO_FULL.values())

    # ══════════════════════════════════════════════════════════════
    # 멀티워드 쿼리 파싱
    # "기장 미용"  → uptae=미용업, sigungu_hint=기장
    # "부산 기장 미용" → sido=부산광역시, sigungu_hint=기장, uptae=미용업
    # "경남 수영장" → sido=경상남도, uptae=수영장업
    # "강남구 헬스" → sigungu_hint=강남구, uptae=체력단련장업
    # ══════════════════════════════════════════════════════════════
    q_parts = q.strip().split()
    synonym = None
    sido_hint = None
    sigungu_hint = None
    text_parts = []

    for part in q_parts:
        # 1순위: 업종 동의어
        if part in SYNONYMS:
            synonym = SYNONYMS[part]
        elif part in UPTAE_NAMES:
            synonym = part
        # 2순위: 시도
        elif not sido and not sido_hint and part in SIDO_ALL:
            sido_hint = SIDO_FULL.get(part, part)
        # 3순위: 시/군/구 접미사 있는 지명
        elif not sigungu and not sigungu_hint and part.endswith(("시", "군", "구")) and len(part) >= 3:
            sigungu_hint = part
        # 4순위: 나머지 2글자 이상 단어 → 지명 힌트로 처리
        elif not sigungu and not sigungu_hint and len(part) >= 2:
            sigungu_hint = part
        else:
            text_parts.append(part)

    conditions = []

    # ── 업종 조건 ──────────────────────────────────────────────
    if synonym:
        conditions.append(Business.uptae_nm == synonym)
    else:
        text_q = " ".join(text_parts) if text_parts else q
        conditions.append(
            or_(
                Business.bsn_nm.ilike(f"%{text_q}%"),
                Business.uptae_nm.ilike(f"%{text_q}%"),
            )
        )

    # ── 시도 조건: 검색어 > UI 필터 (검색어에 지역 명시 시 우선 적용) ──
    if sido_hint:
        # 검색어에서 지역 추출된 경우 → UI 필터 무시하고 검색어 지역 우선
        conditions.append(Business.sido.ilike(f"{sido_hint}%"))
    elif sido and sido != "전국":
        # UI 필터만 있는 경우
        full_sido = SIDO_FULL.get(sido, sido)
        conditions.append(
            or_(Business.sido.like(f"{full_sido}%"), Business.sido.like(f"{sido}%"))
        )

    # ── 시군구 조건: 검색어 > UI 필터 ───────────────────────────
    if sigungu_hint:
        # 검색어에서 시군구 추출된 경우 → UI 필터 무시하고 검색어 지역 우선
        conditions.append(
            or_(
                Business.sigungu.ilike(f"%{sigungu_hint}%"),
                Business.addr.ilike(f"%{sigungu_hint}%"),
            )
        )
    elif sigungu:
        # UI 필터만 있는 경우
        conditions.append(Business.sigungu.ilike(f"%{sigungu}%"))
    if uptae:
        conditions.append(Business.uptae_nm == uptae)
    if status and status != "전체":
        if status == "영업중":
            conditions.append(or_(Business.status == "영업중", Business.status.like("%영업%")))
        else:
            conditions.append(Business.status == status)

    # ── COUNT (서브쿼리 없이 직접 카운트 → 빠름) ─────────────────
    count_stmt = select(func.count(Business.id))
    for cond in conditions:
        count_stmt = count_stmt.where(cond)
    total = (await db.execute(count_stmt)).scalar()

    # ── 데이터 조회 ───────────────────────────────────────────────
    stmt = select(Business)
    for cond in conditions:
        stmt = stmt.where(cond)
    stmt = stmt.order_by(Business.bsn_nm).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()

    # 필터 없는 1페이지일 때만 상위 3건 FREE
    # - URL 파라미터 필터(sido/sigungu/status/uptae) 또는 검색어 파싱 지역(sido_hint/sigungu_hint) 적용 시 FREE 없음
    is_unfiltered = (
        (not sido or sido == "전국")
        and (not status or status == "전체")
        and (not sigungu)
        and (not uptae)
        and (not sido_hint)
        and (not sigungu_hint)
        and page == 1
    )

    items = []
    for i, b in enumerate(rows):
        rank = (page - 1) * size + i + 1
        revealed = str(b.id) in viewed_ids
        free = is_unfiltered and rank <= settings.FREE_VIEW_COUNT
        items.append(build_business_item(b, revealed, rank, free=free))

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
    import uuid as _uuid
    ids = body.get("ids", [])
    if not ids:
        return {"message": "선택된 항목이 없습니다", "revealed": []}

    # string → UUID 변환 (asyncpg 타입 오류 방지)
    try:
        uuid_ids = [_uuid.UUID(i) for i in ids]
    except Exception:
        raise HTTPException(status_code=400, detail="잘못된 ID 형식입니다")

    vl = await db.execute(
        select(ViewLog.business_id).where(
            ViewLog.user_id == current_user.id,
            ViewLog.business_id.in_(uuid_ids),
        )
    )
    already_viewed = {str(row[0]) for row in vl.fetchall()}
    new_uuid_ids = [uid for uid in uuid_ids if str(uid) not in already_viewed]

    if not new_uuid_ids:
        return {"message": "이미 열람한 항목입니다", "revealed": list(already_viewed)}

    # 가게별 포인트 계산 (전화번호 없으면 15P)
    new_bizs = (await db.execute(select(Business).where(Business.id.in_(new_uuid_ids)))).scalars().all()
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
        description=f"{len(new_uuid_ids)}건 가게 정보 열람",
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
    import uuid as _uuid
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="선택된 항목이 없습니다")

    # string → UUID 변환 (asyncpg 타입 오류 방지)
    try:
        uuid_ids = [_uuid.UUID(i) for i in ids]
    except Exception:
        raise HTTPException(status_code=400, detail="잘못된 ID 형식입니다")

    vl_res = await db.execute(
        select(ViewLog.business_id).where(
            ViewLog.user_id == current_user.id,
            ViewLog.business_id.in_(uuid_ids),
        )
    )
    already_viewed = {str(row[0]) for row in vl_res.fetchall()}
    new_uuid_ids = [uid for uid in uuid_ids if str(uid) not in already_viewed]

    if new_uuid_ids:
        new_bizs = (await db.execute(select(Business).where(Business.id.in_(new_uuid_ids)))).scalars().all()
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
            description=f"{len(new_uuid_ids)}건 엑셀 다운로드",
        ))
        for b in new_bizs:
            db.add(ViewLog(user_id=current_user.id, business_id=b.id, points_used=get_point_cost(b)))
        await db.commit()

    result = await db.execute(select(Business).where(Business.id.in_(uuid_ids)))
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
