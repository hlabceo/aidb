"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, MapPin, Phone, Clock, Lock,
  CheckCircle, ChevronLeft, ChevronRight,
  FileDown, Loader2, Coins,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SignupModal from "@/components/SignupModal";
import ChargeModal from "@/components/ChargeModal";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface BusinessItem {
  id: string;
  rank: number;
  bsn_nm: string;
  uptae_nm: string;
  addr: string;
  road_addr: string;
  tel: string;
  status: string;
  open_date: string | null;
  sido: string;
  sigungu: string;
  masked: boolean;
}

const POINT_PER_VIEW = 30;
const FREE_COUNT = 3;
const SIZE = 20;

const STATUS_COLOR: Record<string, React.CSSProperties> = {
  "영업":  { background: "rgba(34,197,94,0.12)",  color: "#4ade80",  border: "1px solid rgba(34,197,94,0.3)" },
  "폐업":  { background: "rgba(239,68,68,0.12)",  color: "#f87171",  border: "1px solid rgba(239,68,68,0.3)" },
  "휴업":  { background: "rgba(234,179,8,0.12)",  color: "#facc15",  border: "1px solid rgba(234,179,8,0.3)" },
  "***":   { background: "rgba(107,114,128,0.12)", color: "#6b7280", border: "1px solid rgba(107,114,128,0.3)" },
};

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { user, refreshUser } = useAuthStore();
  const q = searchParams.get("q") || "";

  const [query,        setQuery]        = useState(q);
  const [items,        setItems]        = useState<BusinessItem[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSido,   setFilterSido]   = useState("");
  const [showCharge,   setShowCharge]   = useState(false);

  const totalPages = Math.ceil(total / SIZE);

  const fetchResults = useCallback(async (searchQ: string, pg: number) => {
    if (!searchQ.trim()) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { q: searchQ, page: pg, size: SIZE };
      if (filterStatus) params.status = filterStatus;
      if (filterSido)   params.sido   = filterSido;
      const { data } = await api.get("/search", { params });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSido]);

  useEffect(() => {
    if (q) { setQuery(q); fetchResults(q, 1); setPage(1); }
  }, [q, fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const toggleSelect = (id: string, masked: boolean) => {
    if (!masked) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExcelDownload = async () => {
    if (selectedIds.size === 0) return;

    if (!user) { router.push("/auth/login"); return; }

    const required = selectedIds.size * POINT_PER_VIEW;
    if (user.points < required) {
      setShowCharge(true);
      return;
    }

    setExcelLoading(true);
    try {
      const response = await api.post("/search/excel",
        { ids: Array.from(selectedIds) },
        { responseType: "blob" }
      );

      const url  = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", "AIDB_업소정보.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setSelectedIds(new Set());
      await refreshUser();

      // 다운로드 후 목록 새로고침 (마스킹 해제 반영)
      fetchResults(q, page);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 402) {
        setShowCharge(true);
      } else {
        alert("다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setExcelLoading(false);
    }
  };

  const count    = selectedIds.size;
  const required = count * POINT_PER_VIEW;
  const hasEnough = (user?.points ?? 0) >= required;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <Navbar />
      <SignupModal />
      {showCharge && <ChargeModal onClose={() => { setShowCharge(false); refreshUser(); }} />}

      {/* 검색 헤더 */}
      <div style={{ position: "sticky", top: 56, zIndex: 20, background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "10px 16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", gap: 8, minWidth: 200 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={15} color="#6b7280" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="업소명, 주소, 업종 검색"
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13, color: "white", outline: "none", fontFamily: "inherit" }} />
              </div>
              <button type="submit"
                style={{ background: "#4f46e5", border: "none", color: "white", padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                검색
              </button>
            </form>

            {/* 필터 */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 12px", fontSize: 13, color: "#d1d5db", outline: "none", fontFamily: "inherit" }}>
              <option value="">전체 상태</option>
              <option value="영업">영업중</option>
              <option value="폐업">폐업</option>
              <option value="휴업">휴업</option>
            </select>
            <select value={filterSido} onChange={e => setFilterSido(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 12px", fontSize: 13, color: "#d1d5db", outline: "none", fontFamily: "inherit" }}>
              <option value="">전국</option>
              {["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 결과 영역 */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 120px" }}>

        {/* 결과 수 */}
        {!loading && total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 13, color: "#6b7280" }}>
            <span style={{ color: "white", fontWeight: 600 }}>{total.toLocaleString()}건</span> 검색됨
            <span style={{ color: "#374151" }}>·</span>
            <span>상위 {FREE_COUNT}건 무료 · 이후 선택 후 엑셀 다운로드 (30P/건)</span>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ height: 72, borderRadius: 14 }} />
            ))}
          </div>
        )}

        {/* 결과 목록 */}
        {!loading && items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map(item => {
              const isFree     = item.rank <= FREE_COUNT;
              const isSelected = selectedIds.has(item.id);

              return (
                <div key={item.id}
                  onClick={() => item.masked && !isFree && toggleSelect(item.id, item.masked)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                    borderRadius: 14, border: isSelected ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.06)",
                    background: isSelected ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.025)",
                    cursor: item.masked && !isFree ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}>

                  {/* 체크박스 (마스킹 항목만) */}
                  {item.masked && !isFree && (
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: isSelected ? "2px solid #6366f1" : "2px solid #374151", background: isSelected ? "#4f46e5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, transition: "all 0.15s" }}>
                      {isSelected && <CheckCircle size={11} color="white" />}
                    </div>
                  )}

                  {/* 순번 */}
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: isFree ? "#818cf8" : "#374151", marginTop: 3, minWidth: 20, textAlign: "center", flexShrink: 0 }}>
                    {item.rank}
                  </span>

                  {/* 내용 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: item.masked ? "#4b5563" : "white", filter: item.masked ? "blur(3px)" : "none" }}>
                        {item.bsn_nm}
                      </span>
                      {item.uptae_nm && (
                        <span style={{ fontSize: 11, color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 999 }}>
                          {item.masked ? "●●●●" : item.uptae_nm}
                        </span>
                      )}
                      {item.status && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, ...(STATUS_COLOR[item.status] || STATUS_COLOR["***"]) }}>
                          {item.status}
                        </span>
                      )}
                      {isFree && (
                        <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 999 }}>FREE</span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: "#6b7280" }}>
                      {item.addr && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, filter: item.masked ? "blur(4px)" : "none" }}>
                          <MapPin size={10} /> {item.addr}
                        </span>
                      )}
                      {item.tel && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, filter: item.masked ? "blur(4px)" : "none" }}>
                          <Phone size={10} /> {item.tel}
                        </span>
                      )}
                      {item.open_date && !item.masked && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} /> {item.open_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 잠금 */}
                  {item.masked && !isFree && !isSelected && (
                    <Lock size={13} color="#374151" style={{ flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && items.length === 0 && q && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#4b5563" }}>
            <Search size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p>"{q}"에 대한 검색 결과가 없습니다</p>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32 }}>
            <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchResults(q, p); }} disabled={page === 1}
              style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "none", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.3 : 1, color: "white", display: "flex" }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, color: "#6b7280", padding: "0 16px" }}>{page} / {totalPages}</span>
            <button onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchResults(q, p); }} disabled={page === totalPages}
              style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "none", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.3 : 1, color: "white", display: "flex" }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 플로팅 엑셀 다운로드 바 */}
      {count > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 40, width: "calc(100% - 32px)", maxWidth: 560 }}>
          <div style={{ background: "#111128", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            {/* 선택 카운트 */}
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>
              {count}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{count}건 선택됨</div>
              <div style={{ fontSize: 11, color: hasEnough ? "#4ade80" : "#f87171" }}>
                {required.toLocaleString()}P 차감 후 엑셀 다운로드
                {user && <span style={{ color: "#6b7280", marginLeft: 4 }}>(보유 {user.points.toLocaleString()}P)</span>}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* 취소 */}
            <button onClick={() => setSelectedIds(new Set())}
              style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontFamily: "inherit" }}>
              취소
            </button>

            {/* 다운로드 or 충전 */}
            {user ? (
              hasEnough ? (
                <button onClick={handleExcelDownload} disabled={excelLoading}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #4f46e5, #9333ea)", border: "none", color: "white", padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", opacity: excelLoading ? 0.7 : 1 }}>
                  {excelLoading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  {excelLoading ? "처리 중..." : "엑셀 다운로드"}
                </button>
              ) : (
                <button onClick={() => setShowCharge(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#eab308", border: "none", color: "black", padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                  <Coins size={14} />
                  포인트 충전
                </button>
              )
            ) : (
              <button onClick={() => router.push("/auth/login")}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#4f46e5", border: "none", color: "white", padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                로그인 후 다운로드
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
