"""
공공데이터포털 소상공인시장진흥공단 상가업소정보 수집기
API: https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInAdmi/v2

환경변수: DATA_GO_KR_API_KEY (Decoding 키 사용 - httpx가 자동 URL인코딩)

사용법 (직접 실행):
  python services/collector.py --sido 서울 --max 10000
  python services/collector.py --sido all --max 5000
"""
import asyncio
import argparse
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from config import settings
from models.models import Business

# ── 시도 코드 매핑 ──────────────────────────────────────────
SIDO_CODES = {
    "서울": "11", "부산": "26", "대구": "27", "인천": "28",
    "광주": "29", "대전": "30", "울산": "31", "세종": "36",
    "경기": "41", "강원": "42", "충북": "43", "충남": "44",
    "전북": "45", "전남": "46", "경북": "47", "경남": "48",
    "제주": "50",
}

# 소상공인시장진흥공단 상가업소정보 API
BASE_URL = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInAdmi/v2"


def parse_date(val: str | None):
    if not val or len(val) < 8:
        return None
    try:
        from datetime import date
        return date(int(val[:4]), int(val[4:6]), int(val[6:8]))
    except Exception:
        return None


def mask_name(name: str) -> str:
    if not name or len(name) <= 2:
        return name[0] + "*" if name else "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


async def fetch_page(
    client: httpx.AsyncClient,
    sido_code: str,
    page: int,
    num_rows: int = 1000,
) -> dict:
    """
    소상공인 상가업소 API 1페이지 호출
    - serviceKey: Decoding 키 그대로 사용 (httpx가 자동 URL인코딩)
    - divId=ctprvnCd: 시도 기준 조회
    - key: 시도 코드 (11=서울, 26=부산 ...)
    """
    params = {
        "serviceKey": settings.DATA_GO_KR_API_KEY,
        "pageNo": page,
        "numOfRows": num_rows,
        "type": "json",
        "divId": "ctprvnCd",
        "key": sido_code,
    }
    resp = await client.get(BASE_URL, params=params, timeout=30.0)
    resp.raise_for_status()
    return resp.json()


async def save_page(session: AsyncSession, rows: list, sido_nm: str) -> int:
    """파싱 후 DB 저장. 저장된 건수 반환"""
    saved = 0
    for row in rows:
        bsn_nm = row.get("bizesNm") or ""
        if not bsn_nm:
            continue

        # 주소에서 시도/시군구 추출
        addr = row.get("lnoAdr") or row.get("rdnAdr") or ""
        road_addr = row.get("rdnAdr") or ""
        sido = row.get("ctprvnNm") or sido_nm
        sigungu = row.get("signguNm") or ""

        biz = Business(
            opn_svc_id=row.get("bizesNo"),
            opn_svc_nm=row.get("indsLclsNm") or row.get("indsSclsNm") or "",
            bsn_nm=bsn_nm,
            bsn_nm_masked=mask_name(bsn_nm),
            uptae_nm=row.get("indsSclsNm") or row.get("indsLclsNm") or "",
            addr=addr,
            road_addr=road_addr,
            zip_cd=None,
            tel=row.get("telNo") or "",
            lat=float(row.get("lat", 0) or 0) or None,
            lng=float(row.get("lon", 0) or 0) or None,
            status=row.get("bizesSttusCd") or "영업",
            status_code=row.get("bizesSttusCd") or "",
            open_date=None,
            close_date=None,
            sido=sido,
            sigungu=sigungu,
            raw_data=row,
        )
        session.add(biz)
        saved += 1

    await session.commit()
    return saved


async def collect(sido_nm: str, max_records: int = 10000) -> dict:
    """
    특정 시도의 상가업소 데이터를 수집하여 DB에 저장
    Returns: {"sido": ..., "saved": ..., "pages": ...}
    """
    sido_code = SIDO_CODES.get(sido_nm)
    if not sido_code:
        return {"error": f"알 수 없는 시도명: {sido_nm}. 가능한 값: {list(SIDO_CODES.keys())}"}

    if not settings.DATA_GO_KR_API_KEY:
        return {"error": "DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다"}

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"\n{'='*55}")
    print(f" 수집 시작: {sido_nm} (코드: {sido_code})")
    print(f" API: {BASE_URL}")
    print(f" 최대: {max_records:,}건")
    print(f"{'='*55}")

    total_saved = 0
    page = 1

    async with httpx.AsyncClient() as http:
        while total_saved < max_records:
            try:
                data = await fetch_page(http, sido_code, page)
            except Exception as e:
                print(f"  [오류] 페이지 {page} 수집 실패: {e}")
                break

            # 응답 파싱
            body = data.get("body") or data.get("response", {}).get("body", {})
            items = body.get("items") if isinstance(body, dict) else []

            if not items:
                print(f"  [완료] 더 이상 데이터 없음 (page {page})")
                break

            rows = items if isinstance(items, list) else items.get("item", [])
            if isinstance(rows, dict):
                rows = [rows]
            if not rows:
                break

            async with Session() as db:
                cnt = await save_page(db, rows, sido_nm)
                total_saved += cnt

            total_count = body.get("totalCount", "?") if isinstance(body, dict) else "?"
            print(f"  page {page:4d} → 누적 {total_saved:,}건  (API 전체 {total_count}건)")

            if isinstance(total_count, int) and total_saved >= min(total_count, max_records):
                break
            page += 1

    print(f"\n  ✓ {sido_nm} 수집 완료: {total_saved:,}건\n")
    await engine.dispose()

    return {"sido": sido_nm, "saved": total_saved, "pages": page}


async def main():
    parser = argparse.ArgumentParser(description="소상공인 상가업소 데이터 수집")
    parser.add_argument("--sido", default="서울", help="시도명 또는 'all'")
    parser.add_argument("--max", type=int, default=10000, help="최대 수집 건수")
    args = parser.parse_args()

    if args.sido == "all":
        for nm in SIDO_CODES.keys():
            await collect(nm, args.max)
    else:
        result = await collect(args.sido, args.max)
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
