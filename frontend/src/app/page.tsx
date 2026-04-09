"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Database, TrendingUp, Shield } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const SUGGESTIONS = [
  "강남구 치킨집",
  "홍대 카페",
  "부산 횟집",
  "서울 미용실",
  "판교 음식점",
  "인천 약국",
  "수원 편의점",
  "대전 세탁소",
];

const TAGS = ["치킨집", "카페", "미용실", "약국", "편의점", "음식점", "병원", "세탁소"];

const STATS = [
  { label: "등록 업소", value: "500만+", icon: Database },
  { label: "월 검색", value: "200만+", icon: TrendingUp },
  { label: "데이터 정확도", value: "99.2%", icon: Shield },
];

export default function HomePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [suggIdx, setSuggIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isFocused) return;
    const target = SUGGESTIONS[suggIdx];
    const speed = deleting ? 40 : 80;
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < target.length) {
          setPlaceholder(target.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 1800);
        }
      } else {
        if (charIdx > 0) {
          setPlaceholder(target.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        } else {
          setDeleting(false);
          setSuggIdx((i) => (i + 1) % SUGGESTIONS.length);
        }
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, suggIdx, isFocused]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0a0a0f]">
      {/* 배경 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-900/25 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-purple-900/25 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-sky-900/10 blur-[100px]" />
      </div>

      {/* 헤더 — 최소화 */}
      <header className="relative z-10 flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-bold gradient-text">AIDB</span>
        </div>
        <nav className="flex items-center gap-1.5">
          {user ? (
            <>
              <a href="/mypage" className="text-xs text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full">
                {user.points.toLocaleString()}P
              </a>
              <a href="/mypage" className="text-xs text-gray-400 hover:text-white px-2.5 py-1 transition-colors">
                {user.name}
              </a>
              <button onClick={logout} className="text-xs text-gray-600 hover:text-red-400 px-2 py-1 transition-colors">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <a href="/auth/login" className="text-xs text-gray-400 hover:text-white px-3 py-1.5 transition-colors">
                로그인
              </a>
              <a href="/auth/signup" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition-colors">
                무료 시작
              </a>
            </>
          )}
        </nav>
      </header>

      {/* 메인 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">

        {/* 뱃지 */}
        <div className="mb-5 flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-xs text-indigo-300">
          <Sparkles size={11} />
          <span>AI 기반 소상공인 데이터 분석 플랫폼</span>
        </div>

        {/* 타이틀 */}
        <h1 className="text-center font-bold mb-3 leading-tight">
          <span className="gradient-text text-3xl sm:text-5xl lg:text-6xl">전국 업소 정보</span>
          <br />
          <span className="text-white text-3xl sm:text-5xl lg:text-6xl">한 번에 검색</span>
        </h1>
        <p className="text-center text-gray-500 text-sm sm:text-base mb-8 max-w-md">
          지방행정인허가 데이터 기반 · 실시간 영업 상태 · 500만+ 업소
        </p>

        {/* 검색창 — 크게 */}
        <form onSubmit={handleSearch} className="w-full max-w-3xl">
          <div
            className={`relative flex items-center rounded-2xl transition-all duration-300 ${
              isFocused
                ? "animate-glow bg-[#13132a] border-2 border-indigo-500/60"
                : "bg-[#13132a] border-2 border-white/10 hover:border-white/20"
            }`}
          >
            <Search size={22} className="absolute left-5 text-indigo-400 pointer-events-none shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? "지역명, 업종, 상호명으로 검색하세요" : placeholder || "검색어를 입력하세요"}
              className="w-full bg-transparent pl-14 pr-4 sm:pr-32 py-5 sm:py-6 text-lg sm:text-xl text-white placeholder-gray-500 outline-none"
            />
            <button
              type="submit"
              className="hidden sm:flex absolute right-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-semibold items-center gap-2 transition-all duration-200 active:scale-95 text-base"
            >
              검색
            </button>
          </div>

          {/* 모바일 검색 버튼 */}
          <button
            type="submit"
            className="sm:hidden w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-semibold text-base active:scale-95 transition-all"
          >
            검색하기
          </button>

          {/* 추천 태그 */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                className="text-xs sm:text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
              >
                # {tag}
              </button>
            ))}
          </div>
        </form>

        {/* 통계 */}
        <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-8 sm:gap-16">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="flex justify-center mb-1.5">
                <Icon size={16} className="text-indigo-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold gradient-text">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="relative z-10 text-center py-4 text-xs text-gray-700">
        © 2024 AIDB · 지방행정인허가 공공데이터 기반
      </footer>
    </div>
  );
}
