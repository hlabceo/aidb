"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

const sections = [
  {
    num: 1,
    title: "목적",
    content:
      '본 약관은 주식회사 에이치랩(이하 "회사")이 운영하는 AIDB 서비스 이용에 관한 조건 및 절차를 규정함을 목적으로 합니다.',
  },
  {
    num: 2,
    title: "서비스 이용",
    content:
      "회원가입 후 포인트를 충전하여 사업장 정보를 열람할 수 있습니다. 1포인트는 1원에 해당하며, 전화번호가 있는 업체는 30P, 없는 업체는 5P가 차감됩니다.",
  },
  {
    num: 3,
    title: "포인트 정책",
    content:
      "충전된 포인트는 환불되지 않습니다. 단, 서비스 오류로 인한 잘못된 차감은 운영자에게 문의 시 복구해드립니다.",
  },
  {
    num: 4,
    title: "금지행위",
    content:
      "수집된 데이터의 무단 재배포, 크롤링, 상업적 악용을 금지합니다.",
  },
  {
    num: 5,
    title: "면책조항",
    content:
      "공공데이터 기반 서비스로 일부 정보가 실제와 다를 수 있으며, 회사는 이에 대한 책임을 지지 않습니다.",
  },
  {
    num: 6,
    title: "문의",
    content: "1555-1265 / help@hlabsoft.co.kr",
  },
];

export default function TermsPage() {
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "white", margin: "0 0 8px" }}>서비스 이용약관</h1>
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
