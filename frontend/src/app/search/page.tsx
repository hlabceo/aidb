"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ArrowLeft, Download, Loader2, Sparkles,
  Phone, PhoneOff, MapPin, Calendar, CheckCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import ChargeModal from "@/components/ChargeModal";
import Link from "next/link";

const PAGE_SIZES = [100, 300, 500, 1000];
const SIDO_LIST = ["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
const STATUS_LIST = ["전체","영업중","폐업","휴업"];

// 검색어에서 지역명 분리 ("김해시 수영장" → { q: "수영장", sido: null, sigungu: "김해시" })
function parseQueryLocation(input: string): { q: string; sido: string | null; sigungu: string | null } {
  const parts = input.trim().split(/\s+/);
  let sido: string | null = null;
  let sigungu: string | null = null;
  const remaining: string[] = [];

  for (const part of parts) {
    if (SIDO_LIST.includes(part) && part !== "전국") {
      sido = part;
    } else if (part.length >= 2 && /[시군구]$/.test(part)) {
      sigungu = part;
    } else {
      remaining.push(part);
    }
  }

  const q = remaining.join(" ").trim() || sigungu || sido || input.trim();
  return { q, sido, sigungu };
}

interface BizItem {
  id: string; rank: number; bsn_nm: string; uptae_nm: string;
  addr: string; road_addr: string; tel: string; status: string;
  open_date: string | null; sido: string; sigungu: string;
  masked: boolean; has_tel: boolean; point_cost: number;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuthStore();
  const q = searchParams.get("q") || "";
  const sidoParam = searchParams.get("sido") || "전국";
  const sigunguParam = searchParams.get("sigungu") || "";

  const [results, setResults] = useState<BizItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(100);
  const [sido, setSido] = useState(sidoParam);
  const [sigunguFilter, setSigunguFilter] = useState(sigunguParam);
  const [statusFilter, setStatusFilter] = useState("전체");

  // URL 파라미터가 바뀌면 sido/sigungu state 동기화
  useEffect(() => {
    setSido(sidoParam);
    setSigunguFilter(sigunguParam);
    setStatusFilter("전체");
  }, [sidoParam, sigunguParam, q]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCharge, setShowCharge] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [newQuery, setNewQuery] = useState(q);

  const fetchResults = useCallback(async () => {
    if (!q) return;
    setLoading(true);
    setSelected(new Set());
    try {
      const params: Record<string, string> = { q, size: String(pageSize), page: "1" };
      if (sido !== "전국") params.sido = sido;
      if (sigunguFilter) params.sigungu = sigunguFilter;
      if (statusFilter !== "전체") params.status = statusFilter;
      const { data } = await api.get("/search", { params });
      setResults(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q, pageSize, sido, sigunguFilter, statusFilter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 미열람 선택 항목만 포인트 계산
  const selectedMasked = results.filter(r => selected.has(r.id) && r.masked);
  const totalCost = selectedMasked.reduce((s, r) => s + r.point_cost, 0);
  const selectedCount = selected.size;

  const handleDownload = async () => {
    if (!user) { router.push("/auth/login"); return; }
    if (user.points < totalCost) { setShowCharge(true); return; }
    setDownloading(true);
    try {
      const { data } = await api.post("/search/excel",
        { ids: Array.from(selected) },
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url; a.download = "AIDB_가게정보.xlsx"; a.click();
      URL.revokeObjectURL(url);
      await refreshUser();
      await fetchResults();
      setSelected(new Set());
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 402) setShowCharge(true);
    } finally {
      setDownloading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim()) return;
    const { q: parsedQ, sido: parsedSido, sigungu: parsedSigungu } = parseQueryLocation(newQuery.trim());
    const params = new URLSearchParams({ q: parsedQ });
    if (parsedSido) params.set("sido", parsedSido);
    if (parsedSigungu) params.set("sigungu", parsedSigungu);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "inherit" }}>
      {/* 헤더 */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "#6b7280", display: "flex", alignItems: "center", textDecoration: "none", cursor: "pointer" }}>
            <ArrowLeft size={18} />
          </Link>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", cursor: "pointer" }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={11} color="white" />
            </div>
            <span className="aidb-logo-text" style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
          </Link>

          <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}>
              <Search size={15} color="#6b7280" style={{ position: "absolute", left: 10 }} />
              <input value={newQuery} onChange={e => setNewQuery(e.target.value)}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: 16, color: "white", fontFamily: "inherit" }} />
            </div>
            <button type="submit" style={{ background: "linear-gradient(135deg,#4f46e5,#9333ea)", border: "none", color: "white", padding: "0 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>검색</button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link href="/admin" style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", padding: "4px 10px", borderRadius: 999, textDecoration: "none" }}>⚙ 관리자</Link>
                )}
                <span style={{ fontSize: 12, color: "#facc15", background: "rgba(234,179,8,0.1)", padding: "4px 8px", borderRadius: 999 }}>{user.points.toLocaleString()}P</span>
                <Link href="/mypage" className="header-username" style={{ fontSize: 12, color: "#9ca3af", textDecoration: "none", cursor: "pointer" }}>{user.name}</Link>
              </>
            ) : (
              <Link href="/auth/login" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none" }}>로그인</Link>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 140px" }}>
        {/* 결과 요약 + 건수 선택 */}
        <div className="summary-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            <strong style={{ color: "#a5b4fc" }}>&ldquo;{q}&rdquo;</strong> 검색결과{" "}
            <strong style={{ color: "white", fontSize: 15 }}>{total.toLocaleString()}</strong>건
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PAGE_SIZES.map(s => (
              <button key={s} onClick={() => setPageSize(s)}
                style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: pageSize === s ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)", background: pageSize === s ? "rgba(99,102,241,0.2)" : "transparent", color: pageSize === s ? "#a5b4fc" : "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>
                <span className="pagesize-full">{s.toLocaleString()}건 보기</span>
                <span className="pagesize-short">{s >= 1000 ? "1000건" : `${s}건`}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 지역 필터 */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8, scrollbarWidth: "none" }}>
          {SIDO_LIST.map(s => (
            <button key={s} onClick={() => setSido(s)}
              style={{ flexShrink: 0, fontSize: 12, padding: "5px 12px", borderRadius: 20, border: sido === s ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)", background: sido === s ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)", color: sido === s ? "#a5b4fc" : "#6b7280", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {s}
            </button>
          ))}
        </div>

        {/* 영업상태 필터 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {STATUS_LIST.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, border: statusFilter === s ? "1px solid #22c55e" : "1px solid rgba(255,255,255,0.08)", background: statusFilter === s ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)", color: statusFilter === s ? "#4ade80" : "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>
              {s}
            </button>
          ))}
        </div>

        {/* 안내 */}
        <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#818cf8", lineHeight: 1.6 }}>
          📌 상위 3건은 무료 공개 · 이후 항목은 체크 후 포인트 차감으로 전체 정보 확인 · 전화번호 없는 가게는 <strong>15P</strong> 할인
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "#6b7280" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            <span>검색 중...</span>
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && results.length === 0 && q && (
          <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
            <Search size={40} style={{ marginBottom: 16, opacity: 0.3, display: "block", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, margin: "0 0 8px" }}>&ldquo;{q}&rdquo;에 대한 검색 결과가 없습니다</p>
            <p style={{ fontSize: 13, margin: 0 }}>다른 검색어나 지역을 선택해보세요</p>
          </div>
        )}

        {/* 결과 카드 */}
        {!loading && results.map(item => {
          const isFree = !item.masked && item.rank <= 3;
          const isSelected = selected.has(item.id);

          return (
            <div key={item.id} style={{
              background: !item.masked ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.02)",
              border: isSelected ? "1px solid rgba(99,102,241,0.5)" : !item.masked ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: "12px 12px", marginBottom: 8,
              display: "flex", gap: 12, alignItems: "flex-start", transition: "all 0.15s",
            }}>
              {/* 체크박스 */}
              <div style={{ paddingTop: 2, flexShrink: 0 }}>
                {isFree ? (
                  <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 700 }}>FREE</span>
                ) : (
                  <div onClick={() => toggleSelect(item.id)}
                    style={{ width: 18, height: 18, borderRadius: 5, border: isSelected ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.2)", background: isSelected ? "#4f46e5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                    {isSelected && <CheckCircle size={11} color="white" />}
                  </div>
                )}
              </div>

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 상단 행 */}
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 600 }}>#{item.rank}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: item.masked ? "#9ca3af" : "white", letterSpacing: item.masked ? "1px" : "normal" }}>
                    {item.bsn_nm}
                  </span>
                  {item.uptae_nm && (
                    <span style={{ fontSize: 11, color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 6 }}>
                      {item.uptae_nm}
                    </span>
                  )}
                  {item.status && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600, background: item.status === "영업중" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)", color: item.status === "영업중" ? "#4ade80" : "#f87171" }}>
                      {item.status}
                    </span>
                  )}
                  {!item.has_tel && item.masked && (
                    <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", padding: "2px 7px", borderRadius: 6 }}>
                      📵 전화번호없음 15P 할인
                    </span>
                  )}
                  {item.masked && (
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#facc15", fontWeight: 700 }}>{item.point_cost}P</span>
                  )}
                </div>

                {/* 주소 */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                  <MapPin size={13} color="#6b7280" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: item.masked ? "#6b7280" : "#d1d5db", letterSpacing: item.masked ? "0.5px" : "normal" }}>
                    {item.road_addr || item.addr || "주소 정보 없음"}
                  </span>
                </div>

                {/* 개업일자 + 전화번호 */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {item.open_date && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Calendar size={12} color="#6b7280" />
                      <span style={{ fontSize: 12, color: "#6b7280" }}>개업일자: {item.open_date}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {item.has_tel ? (
                      <>
                        <Phone size={12} color={item.masked ? "#6b7280" : "#4ade80"} />
                        <span style={{ fontSize: 12, color: item.masked ? "#6b7280" : "#d1d5db", letterSpacing: item.masked ? "2px" : "normal" }}>
                          {item.tel}
                        </span>
                      </>
                    ) : (
                      <>
                        <PhoneOff size={12} color="#6b7280" />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>전화번호 없음</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 고정 바 */}
      {selectedCount > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(10,10,20,0.97)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(99,102,241,0.3)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>{selectedCount}건 선택</span>
            {totalCost > 0 && <span style={{ fontSize: 12, color: "#facc15", marginLeft: 6 }}>{totalCost.toLocaleString()}P 차감</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSelected(new Set())}
              style={{ fontSize: 12, color: "#6b7280", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
              선택해제
            </button>
            <button onClick={handleDownload} disabled={downloading}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "white", background: downloading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#4f46e5,#9333ea)", border: "none", padding: "9px 16px", borderRadius: 10, cursor: downloading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {downloading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
              <span className="dl-btn-full">{totalCost > 0 ? `${totalCost.toLocaleString()}P 차감 후 엑셀 다운로드` : "엑셀 다운로드"}</span>
              <span className="dl-btn-short">엑셀 다운로드</span>
            </button>
          </div>
        </div>
      )}

      {showCharge && <ChargeModal onClose={() => { setShowCharge(false); refreshUser(); }} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pagesize-short { display: none; }
        .pagesize-full { display: inline; }
        .dl-btn-short { display: none; }
        .dl-btn-full { display: inline; }
        @media (max-width: 480px) {
          .aidb-logo-text { display: none; }
          .header-username { display: none; }
          .pagesize-short { display: inline; }
          .pagesize-full { display: none; }
          .dl-btn-short { display: inline; }
          .dl-btn-full { display: none; }
          .summary-row { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>로딩 중...</div>}>
      <SearchContent />
    </Suspense>
  );
}
