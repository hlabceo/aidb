"""
지방행정인허가 데이터 수집 스크립트
사용법: python services/collector.py --svc 07_24_04_P --max 10000
"""
import asyncio
import argparse
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import aiohttp
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from config import settings
from models.models import Business

# 주요 인허가 서비스 ID 목록
SERVICE_MAP = {
    "일반음식점":   "07_24_04_P",
    "휴게음식점":   "07_24_05_P",
    "제과점":      "07_24_06_P",
    "미용업":      "07_24_01_P",
    "이용업":      "07_24_02_P",
    "세탁업":      "07_24_03_P",
    "목욕장업":    "07_24_10_P",
    "노래연습장":  "07_24_11_P",
    "PC방":       "07_24_07_P",
}

def parse_status(code: str) -> str:
    mapping = {"01": "영업", "02": "폐업", "03": "휴업", "04": "취소", "05": "만료"}
    return mapping.get(code, code or "알수없음")

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


async def fetch_page(session: aiohttp.ClientSession, svc_id: str, page: int, size: int = 1000) -> dict:
    params = {
        "authKey": settings.LOCALDATA_API_KEY,
        "opnSvcId": svc_id,
        "pageIndex": page,
        "pageSize": size,
        "resultType": "json",
    }
    async with session.get(settings.LOCALDATA_BASE_URL, params=params, timeout=aiohttp.ClientTimeout(total=30)) as resp:
        return await resp.json(content_type=None)


async def collect(svc_name: str, svc_id: str, max_records: int = 100000):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"\n{'='*50}")
    print(f" 수집 시작: {svc_name} ({svc_id})")
    print(f"{'='*50}")

    async with aiohttp.ClientSession() as http:
        page = 1
        total_saved = 0

        while total_saved < max_records:
            try:
                data = await fetch_page(http, svc_id, page)
            except Exception as e:
                print(f"  [오류] 페이지 {page} 수집 실패: {e}")
                break

            rows = data.get("result", {}).get("body", [])
            if not rows:
                print(f"  [완료] 더 이상 데이터 없음 (page {page})")
                break

            async with Session() as db:
                for row in rows:
                    addr = row.get("sitewhlAddr") or row.get("rdnwhlAddr") or ""
                    sido, sigungu = extract_sido_sigungu(addr)

                    # open_date 파싱
                    open_dt = None
                    if row.get("apvPermYmd"):
                        try:
                            from datetime import date
                            d = row["apvPermYmd"]
                            open_dt = date(int(d[:4]), int(d[4:6]), int(d[6:8]))
                        except Exception:
                            pass

                    biz = Business(
                        opn_svc_id=svc_id,
                        opn_svc_nm=svc_name,
                        bsn_nm=row.get("bsnNm", ""),
                        bsn_nm_masked=mask_name(row.get("bsnNm", "")),
                        uptae_nm=row.get("uptaeNm"),
                        addr=addr,
                        road_addr=row.get("rdnwhlAddr"),
                        zip_cd=row.get("zipCd"),
                        tel=row.get("siteTel"),
                        status=parse_status(row.get("trdStateGbn")),
                        status_code=row.get("trdStateGbn"),
                        open_date=open_dt,
                        sido=sido,
                        sigungu=sigungu,
                        raw_data=row,
                    )
                    db.add(biz)
                    total_saved += 1

                await db.commit()

            print(f"  page {page:4d} → {total_saved:,}건 저장됨")
            page += 1

    print(f"\n  총 {total_saved:,}건 수집 완료\n")
    await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description="지방행정인허가 데이터 수집")
    parser.add_argument("--svc", help="서비스ID (예: 07_24_04_P) 또는 'all'", default="일반음식점")
    parser.add_argument("--max", type=int, default=10000, help="최대 수집 건수")
    args = parser.parse_args()

    if args.svc == "all":
        for name, sid in SERVICE_MAP.items():
            await collect(name, sid, args.max)
    else:
        # 이름으로 찾기
        svc_id = SERVICE_MAP.get(args.svc, args.svc)
        svc_name = args.svc if args.svc in SERVICE_MAP else "업소"
        await collect(svc_name, svc_id, args.max)


if __name__ == "__main__":
    asyncio.run(main())
