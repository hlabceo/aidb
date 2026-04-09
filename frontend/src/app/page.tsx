"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Database, TrendingUp, Shield, ChevronRight } from "lucide-react";

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

const STATS = [
  { label: "등록 업소", value: "500만+", icon: Database },
  { label: "월 검색", value: "200만+", icon: TrendingUp },
  { label: "데이터 정확도", value: "99.2%", icon: Shield },
];

export default function HomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [suggIdx, setSuggIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // 타이핑 애니메이션
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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* 배경 그라디언트 오브 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-sky-900/10 blur-[100px]" />
      </div>

      {/* 헤더 */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">AIDB</span>
        </div>
        <nav className="flex items-center gap-3">
          <a href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
            로그인
          </a>
          <a
            href="/auth/signup"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full transition-colors"
          >
            무료 시작
          </a>
        </nav>
      </header>

      {/* 메인 히어로 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-20">
        {/* 뱃지 */}
        <div className="mb-8 flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-indigo-300">
          <Sparkles size={14} />
          <span>AI 기반 소상공인 데이터 분석 플랫폼</span>
        </div>

        {/* 타이틀 */}
        <h1 className="text-center text-4xl sm:text-5xl lg:text-7xl font-bold mb-4 leading-tight">
          <span className="gradient-text">전국 업소 정보</span>
          <br />
          <span className="text-white">한 번에 검색</span>
        </h1>
        <p className="text-center text-gray-400 text-lg mb-12 max-w-xl">
          지방행정인허가 데이터 기반 · 실시간 영업 상태 · 500만+ 업소 보유
        </p>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          <div
            className={`relative flex items-center rounded-2xl transition-all duration-300 ${
              isFocused
                ? "animate-glow bg-[#13132a] border border-indigo-500/50"
                : "bg-[#13132a] border border-white/10 hover:border-white/20"
            }`}
          >
            <Search
              size={20}
              className="absolute left-5 text-indigo-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? "지역명, 업종, 상호명으로 검색하세요" : placeholder || "검색어를 입력하세요"}
              className="w-full bg-transparent pl-14 pr-36 py-5 text-lg text-white placeholder-gray-500 outline-none"
            />
            <button
              type="submit"
              className="absolute right-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 active:scale-95"
            >
              검색
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 추천 검색어 */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {["치킨집", "카페", "미용실", "약국", "편의점", "음식점"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  router.push(`/search?q=${encodeURIComponent(tag)}`);
                }}
                className="text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
              >
                # {tag}
              </button>
            ))}
          </div>
        </form>

        {/* 통계 */}
        <div className="mt-20 grid grid-cols-3 gap-6 sm:gap-12">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="flex justify-center mb-2">
                <Icon size={20} className="text-indigo-400" />
              </div>
              <div className="text-2xl font-bold gradient-text">{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* 하단 */}
      <footer className="relative z-10 text-center py-6 text-sm text-gray-600">
        © 2024 AIDB · 지방행정인허가 공공데이터 기반
      </footer>
    </div>
  );
}
