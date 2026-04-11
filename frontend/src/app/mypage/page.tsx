"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, User, Mail, Phone, Coins, LogOut, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

export default function MyPage() {
  const router = useRouter();
  const { user, logout, refreshUser, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.push("/auth/login"); return; }
    refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  if (!_hasHydrated || !user) return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", padding: "0 16px 60px" }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", height: 52, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "#6b7280", display: "flex", cursor: "pointer", textDecoration: "none" }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={11} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
          </div>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>마이페이지</span>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{user.role === "admin" ? "관리자" : "일반회원"}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Mail size={14} color="#6b7280" />
              <span style={{ fontSize: 13, color: "#6b7280", width: 80 }}>이메일</span>
              <span style={{ fontSize: 14, color: "#d1d5db" }}>{user.email}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Phone size={14} color="#6b7280" />
              <span style={{ fontSize: 13, color: "#6b7280", width: 80 }}>전화번호</span>
              <span style={{ fontSize: 14, color: "#d1d5db" }}>{user.phone || "미등록"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Coins size={14} color="#facc15" />
              <span style={{ fontSize: 13, color: "#6b7280", width: 80 }}>보유 포인트</span>
              <span style={{ fontSize: 16, color: "#facc15", fontWeight: 700 }}>{user.points.toLocaleString()} P</span>
            </div>
          </div>
        </div>

        <button onClick={() => router.push("/charge")}
          style={{ width: "100%", background: "linear-gradient(135deg,#4f46e5,#9333ea)", border: "none", color: "white", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
          <Coins size={16} /> 포인트 충전하기
        </button>

        <button onClick={() => router.push("/mypage/history")}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#d1d5db", padding: "13px 0", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
          <Coins size={15} color="#facc15" /> 포인트 사용/충전 내역
        </button>

        <button onClick={handleLogout}
          style={{ width: "100%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "12px 0", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
          <LogOut size={15} /> 로그아웃
        </button>
      </div>
    </div>
  );
}
