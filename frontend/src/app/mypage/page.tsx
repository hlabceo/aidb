"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, History, User, LogOut, TrendingDown, TrendingUp, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface PointLog {
  id: string;
  type: "charge" | "use" | "refund";
  amount: number;
  balance: number;
  description: string;
  created_at: string;
}

export default function MyPage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/auth/login"); return; }
    refreshUser();
    api.get("/points/history").then(({ data }) => {
      setLogs(data.logs);
      setLoading(false);
    });
  }, []);

  if (!user) return null;

  const typeIcon = (type: string) => {
    if (type === "charge" || type === "refund") return <TrendingUp size={14} className="text-green-400" />;
    return <TrendingDown size={14} className="text-red-400" />;
  };

  const typeColor = (type: string) =>
    type === "use" ? "text-red-400" : "text-green-400";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

        {/* 프로필 카드 */}
        <div className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-white">{user.name}</div>
              <div className="text-sm text-gray-400">{user.email}</div>
            </div>
          </div>

          {/* 포인트 잔액 */}
          <div className="flex items-center justify-between bg-indigo-500/10 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-yellow-400" />
              <span className="text-sm text-gray-300">보유 포인트</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {user.points.toLocaleString()} P
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/charge")}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Coins size={14} />
              포인트 충전
            </button>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </div>
        </div>

        {/* 포인트 내역 */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-indigo-400" />
            <h2 className="font-semibold">포인트 내역</h2>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">포인트 내역이 없습니다</p>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    {typeIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{log.description}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleDateString("ko-KR")} · 잔액 {log.balance.toLocaleString()}P
                    </div>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 ${typeColor(log.type)}`}>
                    {log.amount > 0 ? "+" : ""}{log.amount.toLocaleString()}P
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
