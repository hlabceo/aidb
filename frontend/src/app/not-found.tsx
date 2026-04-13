import Link from "next/link";
import { Sparkles, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -150, left: -150, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -150, right: -150, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", textAlign: "center", maxWidth: 400 }}>
        {/* Logo */}
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} color="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
        </Link>

        {/* 404 */}
        <div style={{ fontSize: "clamp(4rem, 15vw, 7rem)", fontWeight: 800, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, marginBottom: 16 }}>
          404
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 8 }}>
          페이지를 찾을 수 없습니다
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 32, lineHeight: 1.6 }}>
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #4f46e5, #9333ea)",
              color: "white",
              textDecoration: "none",
              padding: "12px 22px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Home size={15} />
            홈으로
          </Link>
          <Link
            href="/search?q=헬스"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#9ca3af",
              textDecoration: "none",
              padding: "12px 22px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Search size={15} />
            검색하기
          </Link>
        </div>
      </div>
    </div>
  );
}
