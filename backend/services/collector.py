"""
공공데이터포털 행정안전부 인허가 데이터 수집기

환경변수: DATA_GO_KR_API_KEY (data.go.kr 통합 인증키)
※ httpx 사용 → Decoding 키(평문) 그대로 사용, httpx가 자동 URL인코딩

사용법 (직접 실행):
  cd backend
  python services/collector.py --svc swimming_pools --max 5000
  python services/collector.py --svc all --max 5000
"""
import asyncio
import argparse
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from datetime import date as DateType
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from config import settings
from models.models import Business

# ── 수집 가능한 업종 목록 ──────────────────────────────────────
# 형식: "서비스키": ("업종표시명", "API 엔드포인트 경로")
SERVICE_MAP = {
    "swimming_pools": ("수영장업",   "https://apis.data.go.kr/1741000/swimming_pools/info"),
    "beauty_salons":  ("미용업",     "https://apis.data.go.kr/1741000/beauty_salons/info"),
    "fitness_centers":("체력단련장", "https://apis.data.go.kr/1741000/fitness_centers/info"),
    "billiard_halls": ("당구장",    "https://apis.data.go.kr/1741000/billiard_halls/info"),
    "public_baths":         ("목욕장업",    "https://apis.data.go.kr/1741000/public_baths/info"),
    "sledding":             ("썰매장",     "https://apis.data.go.kr/1741000/sledding/info"),
    "golf_practice_ranges": ("골프연습장", "https://apis.data.go.kr/1741000/golf_practice_ranges/info"),
    # 아래 API들은 data.go.kr에서 추가 승인 후 주석 해제
    # "general_restaurants": ("일반음식점", "https://apis.data.go.kr/1741000/general_restaurants/info"),
    # "pharmacies":          ("약국",       "https://apis.data.go.kr/1741000/pharmacies/info"),
}


def parse_date(val: str | None) -> DateType | None:
    """YYYY-MM-DD 또는 YYYYMMDD → date 객체"""
    if not val:
        return None
    val = val.replace("-", "").strip()
    if len(val) < 8:
        return None
    try:
        return DateType(int(val[:4]), int(val[4:6]), int(val[6:8]))
    except Exception:
        return None


def mask_name(name: str) -> str:
    if not name or len(name) <= 2:
        return name[0] + "*" if name else "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


def extract_sido_sigungu(addr: str) -> tuple[str, str]:
    """도로명/지번주소에서 시도, 시군구 추출"""
    if not addr:
        return "", ""
    parts = addr.strip().split()
    sido = parts[0] if parts else ""
    sigungu = parts[1] if len(parts) > 1 else ""
    return sido, sigungu


def map_row_to_business(row: dict, svc_nm: str) -> Business | None:
    """
    행정안전부 인허가 API 공통 응답 필드 매핑
    필드명은 대문자 형식 (BPLC_NM, ROAD_NM_ADDR, ...)
    """
    bsn_nm = row.get("BPLC_NM") or row.get("bplcNm") or ""
    if not bsn_nm:
        return None

    road_addr = row.get("ROAD_NM_ADDR") or row.get("rdnwhlAddr") or ""
    lot_addr  = row.get("LOTNO_ADDR")   or row.get("siteWhlAddr") or ""
    addr      = road_addr or lot_addr

    sido, sigungu = extract_sido_sigungu(addr)

    status_cd  = row.get("SALS_STTS_CD")  or ""
    status_nm  = row.get("SALS_STTS_NM")  or row.get("DTL_SALS_STTS_NM") or ""
    open_date  = parse_date(row.get("LCPMT_YMD"))
    close_date = parse_date(row.get("CLSBIZ_YMD"))
    tel        = row.get("TELNO") or row.get("siteTel") or ""
    zip_cd     = row.get("ROAD_NM_ZIP") or row.get("LCTN_ZIP") or ""
    mng_no     = row.get("MNG_NO") or ""
    uptae_nm   = row.get("CULTR_SPTS_TPBIZ_NM") or svc_nm

    return Business(
        opn_svc_id    = mng_no,
        opn_svc_nm    = svc_nm,
        bsn_nm        = bsn_nm,
        bsn_nm_masked = mask_name(bsn_nm),
        uptae_nm      = uptae_nm,
        addr          = addr,
        road_addr     = road_addr,
        zip_cd        = zip_cd,
        tel           = tel,
        lat           = float(row.get("LAT") or 0) or None,
        lng           = float(row.get("LON") or 0) or None,
        status        = "영업중" if "영업" in (status_nm or status_cd) else (status_nm or status_cd or "알수없음"),
        status_code   = status_cd,
        open_date     = open_date,
        close_date    = close_date,
        sido          = sido,
        sigungu       = sigungu,
        raw_data      = row,
    )


async def fetch_page(
    client: httpx.AsyncClient,
    url: str,
    page: int,
    num_rows: int = 100,
) -> dict:
    """
    API 1페이지 호출
    - Decoding 키 사용 (httpx params= 로 전달 시 자동 URL인코딩)
    - numOfRows 최대 100 (API 제한)
    """
    params = {
        "serviceKey": settings.DATA_GO_KR_API_KEY,
        "pageNo": page,
        "numOfRows": num_rows,
        "returnType": "json",
    }
    resp = await client.get(url, params=params, timeout=30.0)
    resp.raise_for_status()
    return resp.json()


async def collect(svc_key: str, max_records: int = 10000, start_page: int = 1) -> dict:
    """
    단일 업종 수집 실행
    Returns: {"svc": ..., "saved": ..., "pages": ..., "total_api": ...}
    """
    if svc_key not in SERVICE_MAP:
        return {"error": f"알 수 없는 서비스: {svc_key}. 가능: {list(SERVICE_MAP.keys())}"}
    if not settings.DATA_GO_KR_API_KEY:
        return {"error": "DATA_GO_KR_API_KEY 환경변수가 없습니다"}

    svc_nm, url = SERVICE_MAP[svc_key]

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"\n{'='*55}")
    print(f" 수집 시작: {svc_nm}")
    print(f" URL: {url}")
    print(f" 시작 페이지: {start_page}")
    print(f" 최대: {max_records:,}건")
    print(f"{'='*55}")

    total_saved = 0
    total_api   = 0
    page        = start_page

    async with httpx.AsyncClient() as http:
        while total_saved < max_records:
            try:
                data = await fetch_page(http, url, page)
            except Exception as e:
                print(f"  [오류] 페이지 {page} 실패: {e}")
                break

            # 응답 파싱
            resp_body = data.get("response", {}).get("body", {})
            items_obj = resp_body.get("items", {})
            total_api = resp_body.get("totalCount", 0)

            rows = []
            if isinstance(items_obj, dict):
                raw = items_obj.get("item", [])
                rows = raw if isinstance(raw, list) else [raw]
            elif isinstance(items_obj, list):
                rows = items_obj

            if not rows:
                print(f"  [완료] 더 이상 데이터 없음 (page {page})")
                break

            async with Session() as db:
                for row in rows:
                    biz = map_row_to_business(row, svc_nm)
                    if biz:
                        db.add(biz)
                        total_saved += 1
                await db.commit()

            print(f"  page {page:4d} → 누적 {total_saved:,}건  (API 전체 {total_api:,}건)")

            if total_saved >= min(total_api, max_records):
                break
            page += 1

    print(f"\n  ✓ {svc_nm} 수집 완료: {total_saved:,}건\n")
    await engine.dispose()

    return {"svc": svc_nm, "saved": total_saved, "pages": page, "total_api": total_api}


async def main():
    parser = argparse.ArgumentParser(description="행정안전부 인허가 데이터 수집")
    parser.add_argument("--svc",        default="swimming_pools", help=f"서비스키 또는 'all'. 가능: {list(SERVICE_MAP.keys())}")
    parser.add_argument("--max",        type=int, default=10000,  help="최대 수집 건수")
    parser.add_argument("--start-page", type=int, default=1,      help="시작 페이지 (이어받기용)")
    args = parser.parse_args()

    if args.svc == "all":
        for key in SERVICE_MAP.keys():
            await collect(key, args.max, args.start_page)
    else:
        result = await collect(args.svc, args.max, args.start_page)
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
