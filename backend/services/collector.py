"""
공공데이터포털 지방행정 인허가정보 수집 스크립트
새 API: https://apis.data.go.kr/1741000/{업종명}/info

사용법:
  python services/collector.py --svc 일반음식점 --max 10000
  python services/collector.py --svc all --max 50000
"""
import asyncio
import argparse
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import aiohttp
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from config import settings
from models.models import Business

# ── 195종 업종 목록 (주요 업종) ──────────────────────────────
SERVICE_MAP = {
    "일반음식점":    "general_restaurants",
    "휴게음식점":    "rest_restaurants",
    "제과점":       "bakeries",
    "미용업":       "beauty_salons",
    "이용업":       "barber_shops",
    "세탁업":       "laundries",
    "목욕장업":     "bathhouses",
    "노래연습장":   "singing_practice_rooms",
    "PC방":        "internet_computer_game_providing_businesses",
    "약국":         "pharmacies",
    "의원":         "clinics",
    "병원":         "hospitals",
    "치과의원":     "dental_clinics",
    "한의원":       "oriental_medicine_clinics",
    "안경점":       "optical_shops",
    "편의점":       "convenience_stores",
    "숙박업":       "lodging_businesses",
    "공중위생":     "public_health_businesses",
}

BASE_URL = "https://apis.data.go.kr/1741000"


def parse_status(code: str | None) -> str:
    mapping = {"01": "영업", "02": "폐업", "03": "휴업", "04": "취소", "05": "만료"}
    return mapping.get(code or "", code or "알수없음")


def mask_name(name: str) -> str:
    if not name or len(name) <= 2:
        return name[0] + "*" if name else "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


def extract_sido_sigungu(addr: str) -> tuple[str, str]:
    if not addr:
        return "", ""
    parts = addr.strip().split()
    sido = parts[0] if parts else ""
    sigungu = parts[1] if len(parts) > 1 else ""
    return sido, sigungu


def parse_date(val: str | None):
    if not val or len(val) < 8:
        return None
    try:
        from datetime import date
        return date(int(val[:4]), int(val[4:6]), int(val[6:8]))
    except Exception:
        return None


async def fetch_page(session: aiohttp.ClientSession, svc_path: str, page: int, size: int = 100) -> dict:
    url = f"{BASE_URL}/{svc_path}/info"
    params = {
        "serviceKey": settings.DATA_GO_KR_API_KEY,
        "pageNo": page,
        "numOfRows": size,
    }
    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=30)) as resp:
        return await resp.json(content_type=None)


async def collect(svc_name: str, svc_path: str, max_records: int = 100000):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"\n{'='*55}")
    print(f" 수집 시작: {svc_name}  ({BASE_URL}/{svc_path}/info)")
    print(f"{'='*55}")

    async with aiohttp.ClientSession() as http:
        page = 1
        total_saved = 0

        while total_saved < max_records:
            try:
                data = await fetch_page(http, svc_path, page)
            except Exception as e:
                print(f"  [오류] 페이지 {page} 수집 실패: {e}")
                break

            # 응답 파싱 — 공공데이터포털 공통 응답 구조
            body = data.get("response", {}).get("body", {})
            items = body.get("items", {})
            if not items:
                print(f"  [완료] 데이터 없음 (page {page})")
                break

            rows = items.get("item", [])
            if isinstance(rows, dict):
                rows = [rows]  # 단건일 때 dict로 오는 경우 처리
            if not rows:
                break

            async with Session() as db:
                for row in rows:
                    # 새 API 필드명 매핑
                    bsn_nm   = row.get("BPLC_NM") or row.get("bplcNm") or ""
                    uptae_nm = row.get("UPTAE_NM") or row.get("uptaeNm") or ""
                    addr     = row.get("RDNWHL_ADDR") or row.get("rdnwhlAddr") or \
                               row.get("SITE_WHL_ADDR") or row.get("siteWhlAddr") or ""
                    tel      = row.get("SITE_TEL") or row.get("siteTel") or ""
                    status_cd = row.get("SALS_STTS_CD") or row.get("trdStateGbn") or ""
                    open_ymd  = row.get("LCPMT_YMD") or row.get("apvPermYmd") or ""
                    close_ymd = row.get("CLSBIZ_YMD") or row.get("dcbYmd") or ""

                    sido, sigungu = extract_sido_sigungu(addr)

                    biz = Business(
                        opn_svc_id  = svc_path,
                        opn_svc_nm  = svc_name,
                        bsn_nm      = bsn_nm,
                        bsn_nm_masked = mask_name(bsn_nm),
                        uptae_nm    = uptae_nm,
                        addr        = addr,
                        road_addr   = row.get("RDNWHL_ADDR") or row.get("rdnwhlAddr"),
                        zip_cd      = row.get("ZIP_CD") or row.get("zipCd"),
                        tel         = tel,
                        status      = parse_status(status_cd),
                        status_code = status_cd,
                        open_date   = parse_date(open_ymd),
                        close_date  = parse_date(close_ymd),
                        sido        = sido,
                        sigungu     = sigungu,
                        raw_data    = row,
                    )
                    db.add(biz)
                    total_saved += 1

                await db.commit()

            total_count = body.get("totalCount", "?")
            print(f"  page {page:4d} → {total_saved:,}건 저장  (전체 {total_count}건)")

            # 마지막 페이지 체크
            if isinstance(total_count, int) and total_saved >= total_count:
                break
            page += 1

    print(f"\n  ✓ 총 {total_saved:,}건 수집 완료\n")
    await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description="공공데이터포털 지방행정 인허가정보 수집")
    parser.add_argument("--svc",  default="일반음식점", help="업종명 또는 'all'")
    parser.add_argument("--max",  type=int, default=10000, help="최대 수집 건수")
    args = parser.parse_args()

    if args.svc == "all":
        for name, path in SERVICE_MAP.items():
            await collect(name, path, args.max)
    else:
        path = SERVICE_MAP.get(args.svc, args.svc)
        await collect(args.svc, path, args.max)


if __name__ == "__main__":
    asyncio.run(main())
