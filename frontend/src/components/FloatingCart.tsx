"use client";

import { ShoppingCart, Zap, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

interface Props {
  selectedIds: string[];
  onReveal: () => void;
  onClear: () => void;
  loading: boolean;
}

const POINT_PER_VIEW = 30;

export default function FloatingCart({ selectedIds, onReveal, onClear, loading }: Props) {
  const { user } = useAuthStore();
  const router = useRouter();
  const count = selectedIds.length;
  const required = count * POINT_PER_VIEW;
  const hasEnough = (user?.points ?? 0) >= required;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-fade-in-up">
      <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4 border border-indigo-500/30">
        {/* 선택 카운트 */}
        <div className="flex items-center gap-2 text-white min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
            {count}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">{count}건 선택됨</div>
            <div className="text-xs text-gray-400">
              <span className={hasEnough ? "text-green-400" : "text-red-400"}>
                {required.toLocaleString()}P 필요
              </span>
              {user && (
                <span className="ml-1 text-gray-500">
                  (보유 {user.points.toLocaleString()}P)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* 취소 */}
        <button
          onClick={onClear}
          className="text-gray-500 hover:text-white transition-colors p-1"
        >
          <X size={16} />
        </button>

        {/* 열람 버튼 */}
        {user ? (
          hasEnough ? (
            <button
              onClick={onReveal}
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shrink-0"
            >
              <Zap size={14} />
              {loading ? "처리 중..." : "열람하기"}
            </button>
          ) : (
            <button
              onClick={() => router.push("/charge")}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shrink-0"
            >
              <ShoppingCart size={14} />
              포인트 충전
            </button>
          )
        ) : (
          <button
            onClick={() => router.push("/auth/login")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shrink-0"
          >
            로그인 후 열람
          </button>
        )}
      </div>
    </div>
  );
}
