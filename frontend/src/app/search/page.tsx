"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, MapPin, Phone, Clock, CheckCircle, Lock, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import SignupModal from "@/components/SignupModal";
import FloatingCart from "@/components/FloatingCart";
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

const STATUS_COLOR: Record<string, string> = {
  "영업": "bg-green-500/20 text-green-400 border-green-500/30",
  "폐업": "bg-red-500/20 text-red-400 border-red-500/30",
  "휴업": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "***": "bg-gray-500/20 text-gray-500 border-gray-500/30",
};

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const q = searchParams.get("q") || "";

  const [query, setQuery] = useState(q);
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSido, setFilterSido] = useState("");

  const SIZE = 20;
  const totalPages = Math.ceil(total / SIZE);

  const fetchResults = useCallback(async (searchQ: string, pg: number) => {
    if (!searchQ.trim()) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { q: searchQ, page: pg, size: SIZE };
      if (filterStatus) params.status = filterStatus;
      if (filterSido) params.sido = filterSido;
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
    if (q) {
      setQuery(q);
      fetchResults(q, 1);
      setPage(1);
    }
  }, [q, fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const toggleSelect = (id: string, masked: boolean) => {
    if (!masked) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReveal = async () => {
    if (!user || selectedIds.size === 0) return;
    setRevealLoading(true);
    try {
      const { data } = await api.post("/search/reveal", { ids: Array.from(selectedIds) });
      // 열람된 항목 로컬 업데이트
      const revealedMap: Record<string, BusinessItem> = {};
      for (const d of data.revealed) revealedMap[d.id] = d;

      setItems((prev) =>
        prev.map((item) =>
          revealedMap[item.id]
            ? { ...item, ...revealedMap[item.id], masked: false }
            : item
        )
      );
      setRevealedIds((prev) => {
        const next = new Set(prev);
        for (const id of selectedIds) next.add(id);
        return next;
      });
      setSelectedIds(new Set());
      await refreshUser();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(msg || "열람에 실패했습니다");
    } finally {
      setRevealLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <SignupModal />

      {/* 검색 헤더 */}
      <div className="sticky top-14 z-20 bg-[#0a0a0f]/95 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/50 transition-colors"
                placeholder="업소명, 주소, 업종 검색"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0"
            >
              검색
            </button>
          </form>

          {/* 필터 */}
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-indigo-500/50"
            >
              <option value="">전체 상태</option>
              <option value="영업">영업중</option>
              <option value="폐업">폐업</option>
              <option value="휴업">휴업</option>
            </select>
            <select
              value={filterSido}
              onChange={(e) => setFilterSido(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-indigo-500/50"
            >
              <option value="">전국</option>
              {["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 결과 영역 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 결과 수 */}
        {!loading && total > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <span className="text-white font-semibold">{total.toLocaleString()}건</span> 검색됨
            <span className="text-gray-600">·</span>
            <span>1~3번째는 무료 · 이후는 30P/건</span>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && (
          <div className="grid gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
        )}

        {/* 결과 그리드 */}
        {!loading && items.length > 0 && (
          <div className="grid gap-2">
            {items.map((item) => {
              const isFree = item.rank <= 3;
              const isRevealed = revealedIds.has(item.id) || !item.masked;
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => !isFree && !isRevealed && toggleSelect(item.id, item.masked)}
                  className={`
                    relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-200
                    ${item.masked && !isRevealed ? "cursor-pointer" : "cursor-default"}
                    ${isSelected
                      ? "bg-indigo-500/10 border-indigo-500/50"
                      : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"}
                  `}
                >
                  {/* 체크박스 (마스킹된 항목만) */}
                  {item.masked && !isRevealed && (
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-600"
                    }`}>
                      {isSelected && <CheckCircle size={12} className="text-white" />}
                    </div>
                  )}

                  {/* 순번 */}
                  <div className={`text-xs font-mono mt-0.5 w-5 text-center shrink-0 ${isFree ? "text-indigo-400" : "text-gray-600"}`}>
                    {item.rank}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-semibold text-sm ${item.masked ? "text-gray-400 blur-[2px]" : "text-white"}`}>
                        {item.bsn_nm}
                      </span>
                      {item.uptae_nm && (
                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                          {item.masked ? "****" : item.uptae_nm}
                        </span>
                      )}
                      {item.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[item.status] || STATUS_COLOR["***"]}`}>
                          {item.status}
                        </span>
                      )}
                      {isFree && (
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">FREE</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {item.addr && (
                        <span className={`flex items-center gap-1 ${item.masked ? "blur-[3px]" : ""}`}>
                          <MapPin size={11} />
                          {item.addr}
                        </span>
                      )}
                      {item.tel && (
                        <span className={`flex items-center gap-1 ${item.masked ? "blur-[3px]" : ""}`}>
                          <Phone size={11} />
                          {item.tel}
                        </span>
                      )}
                      {item.open_date && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {item.open_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 잠금 아이콘 */}
                  {item.masked && !isRevealed && !isSelected && (
                    <Lock size={14} className="text-gray-600 shrink-0 mt-1" />
                  )}
                  {isRevealed && !isFree && (
                    <CheckCircle size={14} className="text-green-400 shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && items.length === 0 && q && (
          <div className="text-center py-20 text-gray-500">
            <Search size={40} className="mx-auto mb-4 opacity-30" />
            <p>"{q}"에 대한 검색 결과가 없습니다</p>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pb-24">
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); fetchResults(q, Math.max(1, page - 1)); }}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-400 px-4">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchResults(q, Math.min(totalPages, page + 1)); }}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 플로팅 카트 */}
      <FloatingCart
        selectedIds={Array.from(selectedIds)}
        onReveal={handleReveal}
        onClear={() => setSelectedIds(new Set())}
        loading={revealLoading}
      />
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
