"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

const sections = [
  {
    num: 1,
    title: "수집하는 개인정보",
    content: "이메일, 이름, 전화번호, 서비스 이용 기록",
  },
  {
    num: 2,
    title: "수집 목적",
    content: "회원 관리, 포인트 서비스 제공, 고객 문의 응대",
  },
  {
    num: 3,
    title: "보유 기간",
    content: "회원 탈퇴 시까지. 단, 관계 법령에 따라 일정 기간 보관",
  },
  {
    num: 4,
    title: "제3자 제공",
    content: "원칙적으로 외부에 제공하지 않습니다. 단, 법령에 의한 경우 예외",
  },
  {
    num: 5,
    title: "개인정보 보호책임자",
    content: "유호혁 / help@hlabsoft.co.kr",
  },
  {
    num: 6,
    title: "문의",
    content: "1555-1265",
  },
];

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", padding: "0 16px 60px" }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", height: 52, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "#6b7280", display: "flex", alignItems: "center", cursor: "pointer", padding: 0 }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={11} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "white", margin: "0 0 8px" }}>개인정보처리방침</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>시행일: 2026년 1월 1일</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sections.map((section) => (
            <div
              key={section.num}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 24px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>{section.num}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: "white" }}>{section.title}</span>
              </div>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.7, margin: 0 }}>{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
