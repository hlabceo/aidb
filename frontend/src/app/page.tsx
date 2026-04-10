"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Database, TrendingUp, Shield } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const SUGGESTIONS = [
  "강남구 치킨집", "홍대 카페", "부산 횟집",
  "서울 미용실", "판교 음식점", "인천 약국",
];

const TAGS = ["치킨집", "카페", "미용실", "약국", "편의점", "음식점", "병원", "세탁소"];

const STATS = [
  { label: "등록 매장", value: "500만+", icon: Database },
  { label: "월 검색", value: "200만+", icon: TrendingUp },
  { label: "데이터 정확도", value: "99.9%", icon: Shield },
];

export default function HomePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [suggIdx, setSuggIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isFocused) return;
    const target = SUGGESTIONS[suggIdx];
    const speed = deleting ? 40 : 80;
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < target.length) {
          setPlaceholder(target.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 1800);
        }
      } else {
        if (charIdx > 0) {
          setPlaceholder(target.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        } else {
          setDeleting(false);
          setSuggIdx((i) => (i + 1) % SUGGESTIONS.length);
        }
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, suggIdx, isFocused]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", position: "relative", overflow: "hidden" }}>

      {/* 배경 글로우 */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -200, left: -150, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -200, right: -150, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
      </div>

      {/* 헤더 */}
      <header style={{ position: "relative", zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* 로고 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={13} color="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AIDB
            </span>
          </div>

          {/* 네비 */}
          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {user ? (
              <>
                <a href="/charge" style={{ fontSize: 12, color: "#facc15", background: "rgba(234,179,8,0.1)", padding: "5px 12px", borderRadius: 999, textDecoration: "none" }}>
                  {user.points.toLocaleString()}P
                </a>
                <a href="/mypage" style={{ fontSize: 12, color: "#9ca3af", padding: "5px 12px", borderRadius: 999, textDecoration: "none" }}>
                  {user.name}
                </a>
                <button onClick={logout} style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: "5px 8px" }}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <a href="/auth/login" style={{ fontSize: 12, color: "#9ca3af", padding: "5px 12px", borderRadius: 999, textDecoration: "none" }}>
                  로그인
                </a>
                <a href="/auth/signup" style={{ fontSize: 12, fontWeight: 600, color: "white", background: "#4f46e5", padding: "6px 16px", borderRadius: 999, textDecoration: "none" }}>
                  무료 시작
                </a>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 메인 */}
      <main style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* 뱃지 */}
          <div style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 999, padding: "6px 14px", fontSize: 16, color: "#a5b4fc" }}>
            <Sparkles size={16} />
            현장 영업, 판촉 행사, 우편 발송에 딱! 좋은 플랫폼
          </div>

          {/* 타이틀 */}
          <h1 style={{ textAlign: "center", fontWeight: 800, lineHeight: 1.15, marginBottom: 12 }}>
            <span style={{ display: "block", fontSize: "clamp(2rem, 5vw, 3.2rem)", background: "linear-gradient(135deg, #818cf8, #c084fc, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              전국 사업장 · 매장 정보
            </span>
            <span style={{ display: "block", fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "white" }}>
              한 번에 검색
            </span>
          </h1>

          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
            공공기관 인허가 데이터 기반&nbsp;·&nbsp;실시간 영업 상태&nbsp;·&nbsp;500만+ 매장
          </p>

          {/* 검색창 */}
          <form onSubmit={handleSearch} style={{ width: "100%" }}>
            <div style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              background: "#111128",
              border: isFocused ? "2px solid rgba(99,102,241,0.6)" : "2px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              boxShadow: isFocused ? "0 0 0 4px rgba(99,102,241,0.1)" : "none",
              transition: "all 0.2s ease",
            }}>
              <Search size={20} color="#818cf8" style={{ position: "absolute", left: 20, pointerEvents: "none", flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isFocused ? "지역명, 업종, 상호명으로 검색하세요" : placeholder || ""}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  paddingLeft: 56,
                  paddingRight: 110,
                  paddingTop: 22,
                  paddingBottom: 22,
                  fontSize: 17,
                  color: "white",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="submit"
                style={{
                  position: "absolute",
                  right: 10,
                  background: "linear-gradient(135deg, #4f46e5, #9333ea)",
                  border: "none",
                  color: "white",
                  padding: "10px 22px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                검색
              </button>
            </div>

            {/* 추천 태그 */}
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "6px 14px",
                    borderRadius: 999,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#a5b4fc"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                >
                  # {tag}
                </button>
              ))}
            </div>
          </form>

          

          {/* 통계 카드 */}
          <div style={{ marginTop: 56, width: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "24px 16px",
              }}>
                <Icon size={18} color="#818cf8" />
                <span style={{ fontSize: "clamp(1.25rem, 3vw, 1.6rem)", fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {value}
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* 푸터 */}
      <footer style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "16px 0", fontSize: 11, color: "#374151", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        © 2026 AIDB · HLABSOFT
      </footer>
    </div>
  );
}
