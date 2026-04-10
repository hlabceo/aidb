"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: "naver" | "google") => {
    window.location.href = `${API_URL}/auth/social/${provider}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px", position: "relative", overflow: "hidden" }}>
      {/* 배경 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -160, left: -160, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -160, right: -160, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "white", margin: 0 }}>로그인</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>계속하려면 로그인하세요</p>
        </div>

        {/* 소셜 로그인 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {/* 네이버 */}
          <button onClick={() => handleSocialLogin("naver")}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#03C75A", border: "none", borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <NaverIcon />
            네이버로 로그인
          </button>

          {/* 구글 */}
          <button onClick={() => handleSocialLogin("google")}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "white", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "white")}>
            <GoogleIcon />
            구글로 로그인
          </button>
        </div>

        {/* 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 12, color: "#4b5563" }}>또는 이메일로 로그인</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleSubmit} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 이메일 */}
          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6 }}>이메일</label>
            <div style={{ position: "relative", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}>
              <Mail size={15} color="#6b7280" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", paddingTop: 12, paddingBottom: 12, paddingLeft: 38, paddingRight: 14, fontSize: 14, color: "white", fontFamily: "inherit" }} />
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6 }}>비밀번호</label>
            <div style={{ position: "relative", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}>
              <Lock size={15} color="#6b7280" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", paddingTop: 12, paddingBottom: 12, paddingLeft: 38, paddingRight: 42, fontSize: 14, color: "white", fontFamily: "inherit" }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: "100%", background: "linear-gradient(135deg, #4f46e5, #9333ea)", border: "none", color: "white", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1, transition: "opacity 0.2s", fontFamily: "inherit" }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            로그인
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", margin: 0 }}>
            계정이 없으신가요?{" "}
            <Link href="/auth/signup" style={{ color: "#818cf8", textDecoration: "none" }}>회원가입</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function NaverIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
