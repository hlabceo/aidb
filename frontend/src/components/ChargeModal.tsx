"use client";

import { useState } from "react";
import { X, Coins, Gift, Zap, CheckCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface Package {
  id: number;
  amount: number;
  points: number;
  bonus: number;
  label: string;
}

const PACKAGES: Package[] = [
  { id: 1, amount: 1000,  points: 1000,  bonus: 0,     label: "1,000원" },
  { id: 2, amount: 3000,  points: 3300,  bonus: 300,   label: "3,000원" },
  { id: 3, amount: 5000,  points: 5500,  bonus: 500,   label: "5,000원" },
  { id: 4, amount: 10000, points: 11000, bonus: 1000,  label: "10,000원" },
  { id: 5, amount: 30000, points: 33000, bonus: 3000,  label: "30,000원" },
  { id: 6, amount: 50000, points: 60000, bonus: 10000, label: "50,000원" },
];

interface Props {
  onClose: () => void;
}

export default function ChargeModal({ onClose }: Props) {
  const { user, refreshUser } = useAuthStore();
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const selectedPkg = PACKAGES.find(p => p.id === selected);

  const handleCharge = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post("/points/charge", { package_id: selected });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setSelected(null); onClose(); }, 2000);
    } catch {
      alert("충전에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, background: "#111128", borderRadius: 24, padding: 24, position: "relative", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Coins size={20} color="#facc15" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>포인트 충전</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* 현재 잔액 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>현재 보유 포인트</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#facc15" }}>{user.points.toLocaleString()} P</span>
        </div>

        {/* 안내 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "10px 12px", marginBottom: 18 }}>
          <Zap size={14} color="#818cf8" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: "#a5b4fc", margin: 0, lineHeight: 1.6 }}>
            1포인트 = 1원 · 가게 정보 1건 열람 시 <strong>30P</strong> (전화번호없음 <strong>5P</strong>) 차감
            <br /><span style={{ color: "#6b7280" }}>※ 나이스페이먼츠 연동 후 실결제 가능</span>
          </p>
        </div>

        {/* 패키지 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {PACKAGES.map(pkg => (
            <button key={pkg.id} onClick={() => setSelected(pkg.id)}
              style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "16px 8px", borderRadius: 16, border: selected === pkg.id ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.08)", background: selected === pkg.id ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)", cursor: "pointer", transform: selected === pkg.id ? "scale(1.02)" : "scale(1)", transition: "all 0.15s", fontFamily: "inherit" }}>
              {pkg.bonus > 0 && (
                <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 10, background: "#eab308", color: "black", fontWeight: 700, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
                  +{pkg.bonus.toLocaleString()}P 보너스
                </span>
              )}
              <span style={{ fontSize: 17, fontWeight: 700, color: "white" }}>{pkg.points.toLocaleString()}P</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{pkg.label}</span>
              {pkg.bonus > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#facc15" }}>
                  <Gift size={9} /> {Math.round((pkg.bonus / pkg.amount) * 100)}% 추가
                </span>
              )}
              {selected === pkg.id && <CheckCircle size={14} color="#818cf8" style={{ marginTop: 2 }} />}
            </button>
          ))}
        </div>

        {/* 충전 버튼 */}
        {success ? (
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 600 }}>
            <CheckCircle size={18} /> 충전 완료!
          </div>
        ) : (
          <button onClick={handleCharge} disabled={!selected || loading}
            style={{ width: "100%", background: selected ? "linear-gradient(135deg, #4f46e5, #9333ea)" : "rgba(99,102,241,0.2)", border: "none", color: "white", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: selected ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s", fontFamily: "inherit" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
            {selected ? `${selectedPkg?.points.toLocaleString()}P 충전하기` : "패키지를 선택하세요"}
          </button>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#4b5563", marginTop: 10 }}>
          나이스페이먼츠 결제 연동 후 실결제가 활성화됩니다
        </p>
      </div>
    </div>
  );
}
