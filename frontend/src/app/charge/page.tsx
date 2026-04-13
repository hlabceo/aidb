"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Zap, CheckCircle, LoaderCircle, Gift, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface Package {
  id: number;
  amount: number;
  points: number;
  bonus: number;
  label: string;
}

export default function ChargePage() {
  const router = useRouter();
  const { user, refreshUser, _hasHydrated } = useAuthStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pkgLoading, setPkgLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.push("/auth/login"); return; }
    setPkgLoading(true);
    api.get("/points/packages")
      .then(({ data }) => setPackages(data.packages))
      .catch(() => {})
      .finally(() => setPkgLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  const handleCharge = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post("/points/charge", { package_id: selected });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setSelected(null); }, 2500);
    } catch {
      alert("충전에 실패했습니다. 잠시 후 다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  if (!_hasHydrated || !user) return null;

  const selectedPkg = packages.find((p) => p.id === selected);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white" }}>
      {/* Navbar */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 0 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
          <button
            onClick={() => router.push("/mypage")}
            style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "white" }}>포인트 충전</span>
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 현재 잔액 */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#9ca3af" }}>
            <Coins size={16} color="#facc15" />
            현재 보유 포인트
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#facc15" }}>{user.points.toLocaleString()} P</div>
        </div>

        {/* 안내 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: "12px 14px", marginBottom: 20 }}>
          <Zap size={15} color="#818cf8" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#c7d2fe", margin: 0 }}>
            1포인트 = 1원 · 업소 정보 1건 열람 시 <strong>30P</strong> 차감
            <br />
            <span style={{ fontSize: 12, color: "#a5b4fc" }}>※ 나이스페이먼츠 연동 후 실결제 가능합니다</span>
          </p>
        </div>

        {/* 패키지 선택 */}
        {pkgLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <LoaderCircle size={24} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "20px 12px",
                  borderRadius: 18,
                  border: selected === pkg.id ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                  background: selected === pkg.id ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  transform: selected === pkg.id ? "scale(1.02)" : "scale(1)",
                  fontFamily: "inherit",
                }}
              >
                {pkg.bonus > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 11,
                    background: "#eab308",
                    color: "black",
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}>
                    +{pkg.bonus.toLocaleString()}P 보너스
                  </span>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{pkg.points.toLocaleString()}P</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>{pkg.label}</div>
                {pkg.bonus > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#facc15" }}>
                    <Gift size={10} />
                    {Math.round((pkg.bonus / pkg.amount) * 100)}% 보너스
                  </div>
                )}
                {selected === pkg.id && (
                  <CheckCircle size={16} color="#818cf8" style={{ marginTop: 4 }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* 충전 버튼 */}
        {success ? (
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "16px 0", borderRadius: 14, fontWeight: 600, fontSize: 15 }}>
            <CheckCircle size={18} />
            {selectedPkg?.points.toLocaleString()}P 충전 완료!
          </div>
        ) : (
          <button
            onClick={handleCharge}
            disabled={!selected || loading}
            style={{
              width: "100%",
              background: selected && !loading ? "linear-gradient(135deg, #4f46e5, #9333ea)" : "rgba(99,102,241,0.3)",
              border: "none",
              color: "white",
              padding: "16px 0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              cursor: selected && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            {loading ? <LoaderCircle size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Coins size={16} />}
            {selected ? `${selectedPkg?.points.toLocaleString()}P 충전하기` : "패키지를 선택하세요"}
          </button>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: "#4b5563", marginTop: 16 }}>
          나이스페이먼츠 결제 연동 후 실결제가 활성화됩니다
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
