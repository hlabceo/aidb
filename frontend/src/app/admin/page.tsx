"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Database, Search, Eye, DollarSign, TrendingUp, Activity } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface Stats {
  users: number;
  businesses: number;
  searches: number;
  views: number;
  revenue: number;
}

interface RecentUser {
  id: string;
  email: string;
  name: string;
  points: number;
  created_at: string;
}

interface SearchLog {
  query: string;
  result_cnt: number;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [searches, setSearches] = useState<SearchLog[]>([]);
  const [tab, setTab] = useState<"users" | "searches">("users");

  useEffect(() => {
    if (!user) { router.push("/auth/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }

    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/searches"),
    ]).then(([s, u, q]) => {
      setStats(s.data);
      setUsers(u.data.users);
      setSearches(q.data.logs);
    });
  }, []);

  if (!user || user.role !== "admin") return null;

  const statCards = stats
    ? [
        { label: "총 회원", value: stats.users.toLocaleString(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "업소 데이터", value: stats.businesses.toLocaleString(), icon: Database, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        { label: "총 검색", value: stats.searches.toLocaleString(), icon: Search, color: "text-purple-400", bg: "bg-purple-500/10" },
        { label: "총 열람", value: stats.views.toLocaleString(), icon: Eye, color: "text-green-400", bg: "bg-green-500/10" },
        { label: "총 매출", value: `${stats.revenue.toLocaleString()}원`, icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={20} className="text-indigo-400" />
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        </div>

        {/* 통계 카드 */}
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="glass rounded-2xl p-4">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={16} className={color} />
                </div>
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer h-24 rounded-2xl" />
            ))}
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          {(["users", "searches"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {t === "users" ? "최근 가입자" : "검색 로그"}
            </button>
          ))}
        </div>

        {/* 테이블 */}
        <div className="glass rounded-2xl overflow-hidden">
          {tab === "users" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-4 py-3 text-gray-500 font-medium">이름</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">이메일</th>
                  <th className="px-4 py-3 text-gray-500 font-medium text-right">포인트</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3 text-yellow-400 text-right">{u.points.toLocaleString()}P</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-4 py-3 text-gray-500 font-medium">검색어</th>
                  <th className="px-4 py-3 text-gray-500 font-medium text-right">결과 수</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">시간</th>
                </tr>
              </thead>
              <tbody>
                {searches.map((s, i) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white">{s.query}</td>
                    <td className="px-4 py-3 text-gray-400 text-right">{s.result_cnt?.toLocaleString() ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
