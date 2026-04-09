"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Zap, CheckCircle, Loader2, Gift, ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
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
  const { user, refreshUser } = useAuthStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/auth/login"); return; }
    api.get("/points/packages").then(({ data }) => setPackages(data.packages));
  }, []);

  const handleCharge = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await api.post("/points/charge", { package_id: selected });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setSelected(null); }, 2500);
    } catch (e) {
      alert("충전에 실패했습니다. 잠시 후 다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const selectedPkg = packages.find((p) => p.id === selected);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h1 className="text-2xl font-bold">포인트 충전</h1>
        </div>

        {/* 현재 잔액 */}
        <div className="glass rounded-2xl p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Coins size={16} className="text-yellow-400" />
            현재 보유 포인트
          </div>
          <div className="text-2xl font-bold text-yellow-400">{user.points.toLocaleString()} P</div>
        </div>

        {/* 안내 */}
        <div className="flex items-start gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-6">
          <Zap size={15} className="text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-200">
            1포인트 = 1원 · 업소 정보 1건 열람 시 <strong>30P</strong> 차감
            <br />
            <span className="text-xs text-indigo-300">※ 나이스페이먼츠 연동 후 실결제 가능합니다</span>
          </p>
        </div>

        {/* 패키지 선택 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelected(pkg.id)}
              className={`relative flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${
                selected === pkg.id
                  ? "bg-indigo-500/15 border-indigo-500 scale-[1.02]"
                  : "bg-white/[0.03] border-white/10 hover:border-white/20"
              }`}
            >
              {pkg.bonus > 0 && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                  +{pkg.bonus.toLocaleString()}P 보너스
                </span>
              )}
              <div className="text-lg font-bold text-white">{pkg.points.toLocaleString()}P</div>
              <div className="text-sm text-gray-400">{pkg.label}</div>
              {pkg.bonus > 0 && (
                <div className="text-xs text-yellow-400 flex items-center gap-0.5">
                  <Gift size={10} />
                  {Math.round((pkg.bonus / pkg.amount) * 100)}% 보너스
                </div>
              )}
              {selected === pkg.id && (
                <CheckCircle size={16} className="text-indigo-400 mt-1" />
              )}
            </button>
          ))}
        </div>

        {/* 충전 버튼 */}
        {success ? (
          <div className="w-full flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 py-4 rounded-xl font-semibold">
            <CheckCircle size={18} />
            {selectedPkg?.points.toLocaleString()}P 충전 완료!
          </div>
        ) : (
          <button
            onClick={handleCharge}
            disabled={!selected || loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
            {selected ? `${selectedPkg?.points.toLocaleString()}P 충전하기` : "패키지를 선택하세요"}
          </button>
        )}

        <p className="text-center text-xs text-gray-600 mt-4">
          나이스페이먼츠 결제 연동 후 실결제가 활성화됩니다
        </p>
      </div>
    </div>
  );
}
