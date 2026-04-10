"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Database, TrendingUp, Shield, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import Link from "next/link";

const SUGGESTIONS = ["강남구 치킨집","홍대 카페","부산 횟집","서울 미용실","수영장","인천 약국"];
const TAGS = ["수영장","카페","미용실","약국","편의점","음식점","병원","세탁소"];

interface Stats { total: number; this_month: number; this_week: number; today: number; updated_at: string; }

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [showBiz, setShowBiz] = useState(false);

  useEffect(() => {
    if (isFocused) return;
    const target = SUGGESTIONS[suggIdx];
    const speed = deleting ? 40 : 80;
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < target.length) { setPlaceholder(target.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }
        else { setTimeout(() => setDeleting(true), 1800); }
      } else {
        if (charIdx > 0) { setPlaceholder(target.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }
        else { setDeleting(false); setSuggIdx(i => (i + 1) % SUGGESTIONS.length); }
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, suggIdx, isFocused]);

  useEffect(() => {
    api.get("/search/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -200, left: -150, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -200, right: -150, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
      </div>

      {/* 헤더 */}
      <header style={{ position: "relative", zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={13} color="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {user ? (
              <>
                <span style={{ fontSize: 12, color: "#facc15", background: "rgba(234,179,8,0.1)", padding: "5px 12px", borderRadius: 999 }}>{user.points.toLocaleString()}P</span>
                <Link href="/mypage" style={{ fontSize: 12, color: "#9ca3af", padding: "5px 12px", borderRadius: 999, textDecoration: "none", cursor: "pointer" }}>{user.name}</Link>
                <button onClick={logout} style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: "5px 8px" }}>로그아웃</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{ fontSize: 12, color: "#9ca3af", padding: "5px 12px", borderRadius: 999, textDecoration: "none", cursor: "pointer" }}>로그인</Link>
                <Link href="/auth/signup" style={{ fontSize: 12, fontWeight: 600, color: "white", background: "#4f46e5", padding: "6px 16px", borderRadius: 999, textDecoration: "none", cursor: "pointer" }}>무료 시작</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 메인 */}
      <main style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 999, padding: "6px 14px", fontSize: 14, color: "#a5b4fc" }}>
            <Sparkles size={14} /> 현장 영업, 판촉 행사, 우편 발송에 딱! 좋은 플랫폼
          </div>
          <h1 style={{ textAlign: "center", fontWeight: 800, lineHeight: 1.15, margin: "0 0 12px" }}>
            <span style={{ display: "block", fontSize: "clamp(2rem, 5vw, 3.2rem)", background: "linear-gradient(135deg, #818cf8, #c084fc, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>전국 사업장 · 가게 정보</span>
            <span style={{ display: "block", fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "white" }}>한 번에 검색</span>
          </h1>
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
            공공기관 인허가 데이터 기반&nbsp;·&nbsp;실시간 영업 상태&nbsp;·&nbsp;전국 가게 정보
          </p>

          {/* 검색창 */}
          <form onSubmit={handleSearch} style={{ width: "100%" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", background: "#111128", border: isFocused ? "2px solid rgba(99,102,241,0.6)" : "2px solid rgba(255,255,255,0.08)", borderRadius: 18, boxShadow: isFocused ? "0 0 0 4px rgba(99,102,241,0.1)" : "none", transition: "all 0.2s ease" }}>
              <Search size={20} color="#818cf8" style={{ position: "absolute", left: 20, pointerEvents: "none" }} />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                placeholder={isFocused ? "지역명, 업종, 상호명으로 검색하세요" : placeholder || ""}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", paddingLeft: 56, paddingRight: 110, paddingTop: 22, paddingBottom: 22, fontSize: 17, color: "white", fontFamily: "inherit" }} />
              <button type="submit" style={{ position: "absolute", right: 10, background: "linear-gradient(135deg, #4f46e5, #9333ea)", border: "none", color: "white", padding: "10px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>검색</button>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                  style={{ fontSize: 12, color: "#6b7280", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 14px", borderRadius: 999, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#a5b4fc"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                  # {tag}
                </button>
              ))}
            </div>
          </form>

          {/* 실시간 통계 배너 */}
          {stats && (
            <div style={{ marginTop: 28, width: "100%", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 16, padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <RefreshCw size={13} color="#818cf8" />
                <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 600 }}>{stats.updated_at} 업데이트!</span>
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label: "전체 데이터", val: stats.total },
                  { label: "이번달 신규", val: stats.this_month },
                  { label: "이번주 신규", val: stats.this_week },
                  { label: "오늘 신규", val: stats.today },
                ].map(({ label, val }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{val.toLocaleString()}<span style={{ fontSize: 11, color: "#6b7280", marginLeft: 2 }}>건</span></div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 통계 카드 */}
          <div style={{ marginTop: 40, width: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "등록 가게", value: stats ? `${stats.total.toLocaleString()}+` : "집계중", icon: Database },
              { label: "월 검색", value: "200만+", icon: TrendingUp },
              { label: "데이터 정확도", value: "99.9%", icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px 16px" }}>
                <Icon size={18} color="#818cf8" />
                <span style={{ fontSize: "clamp(1.1rem, 3vw, 1.5rem)", fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", padding: "28px 24px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={11} color="white" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: "서비스이용약관", href: "/terms" },
                { label: "개인정보처리방침", href: "/privacy" },
                { label: "1:1 상담", href: "mailto:help@hlabsoft.co.kr" },
              ].map(({ label, href }) => (
                <a key={label} href={href} style={{ fontSize: 12, color: "#6b7280", textDecoration: "none", cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <button onClick={() => setShowBiz(v => !v)}
            style={{ fontSize: 11, color: "#4b5563", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "4px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 8, fontFamily: "inherit" }}>
            사업자정보보기 {showBiz ? "▲" : "▼"}
          </button>
          {showBiz && (
            <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 2, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10, marginBottom: 8 }}>
              <div>회사명: 주식회사 에이치랩 &nbsp;|&nbsp; 대표자: 유호혁 &nbsp;|&nbsp; 사업자번호: 745-87-03566</div>
              <div>통신판매업신고번호: 제2024-창원의창-0602호</div>
              <div>주소: 경남 창원시 의창구 차룡로 48번길 44, 1409호</div>
              <div>대표번호: 1555-1265 &nbsp;|&nbsp; 이메일: help@hlabsoft.co.kr</div>
            </div>
          )}
          <p style={{ fontSize: 11, color: "#1f2937", margin: 0 }}>© 2026 AIDB · 주식회사 에이치랩 · All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
