"use client";

import { Sparkles, User, Coins, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="font-bold gradient-text text-sm">AIDB</span>
        </Link>

        <div className="flex-1" />

        {/* 데스크탑 메뉴 */}
        <nav className="hidden sm:flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/charge"
                className="flex items-center gap-1.5 text-sm text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 px-3 py-1.5 rounded-full transition-colors"
              >
                <Coins size={13} />
                {user.points.toLocaleString()}P
              </Link>
              <Link
                href="/mypage"
                className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors"
              >
                <User size={13} />
                {user.name}
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="text-sm text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors">
                  관리
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5"
              >
                <LogOut size={13} />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 transition-colors">
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full transition-colors"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>

        {/* 모바일 메뉴 토글 */}
        <button className="sm:hidden p-2 text-gray-400" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {mobileOpen && (
        <div className="sm:hidden glass border-t border-white/5 px-4 py-3 flex flex-col gap-2">
          {user ? (
            <>
              <Link href="/charge" className="flex items-center gap-2 text-yellow-400 py-2">
                <Coins size={14} /> {user.points.toLocaleString()}P 충전
              </Link>
              <Link href="/mypage" className="flex items-center gap-2 text-gray-300 py-2">
                <User size={14} /> 마이페이지
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 py-2">
                <LogOut size={14} /> 로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-300 py-2">로그인</Link>
              <Link href="/auth/signup" className="text-indigo-400 py-2">회원가입</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
