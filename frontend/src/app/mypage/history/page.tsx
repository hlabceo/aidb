"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Coins, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface HistoryItem {
  id: string;
  type: "charge" | "use";
  amount: number;
  balance: number;
  description: string;
  created_at: string;
}

// Backend returns: { balance: number, logs: HistoryItem[] }
interface HistoryResponse {
  balance: number;
  logs: HistoryItem[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, refreshUser, _hasHydrated } = useAuthStore();
  const [logs, setLogs] = useState<HistoryItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  // Hydration guard
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    fetchHistory(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, _hasHydrated, user]);

  const fetchHistory = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<HistoryResponse>(`/points/history?page=${p}&size=${PAGE_SIZE}`);
      setLogs(res.data.logs || []);
      setBalance(res.data.balance ?? user?.points ?? 0);
      setHasMore((res.data.logs || []).length >= PAGE_SIZE);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (!_hasHydrated || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", padding: "0 16px 60px" }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", height: 52, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/mypage" style={{ color: "#6b7280", display: "flex", cursor: "pointer", textDecoration: "none" }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={11} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
          </div>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>포인트 내역</span>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* 보유 포인트 카드 */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Coins size={20} color="#facc15" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>현재 보유 포인트</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#facc15" }}>
                {balance.toLocaleString()} P
              </div>
            </div>
          </div>
        </div>

        {/* 내역 리스트 */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
            <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "60px 24px", textAlign: "center" }}>
            <Coins size={36} color="#374151" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: "#6b7280" }}>포인트 내역이 없습니다</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {logs.map((item) => {
                const isCharge = item.type === "charge";
                return (
                  <div
                    key={item.id}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: "#d1d5db", fontWeight: 500, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{formatDate(item.created_at)}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: isCharge ? "#4ade80" : "#f87171", marginBottom: 2 }}>
                        {isCharge ? "+" : "-"}{Math.abs(item.amount).toLocaleString()} P
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>잔액 {item.balance.toLocaleString()} P</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 페이지네이션 */}
            {(page > 1 || hasMore) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: page === 1 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)", color: page === 1 ? "#374151" : "#9ca3af", cursor: page === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  {page} 페이지
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: !hasMore ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)", color: !hasMore ? "#374151" : "#9ca3af", cursor: !hasMore ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
