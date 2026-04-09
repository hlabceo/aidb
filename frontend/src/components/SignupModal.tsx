"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function SignupModal() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user || dismissed) return;
    const t = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(t);
  }, [user, dismissed]);

  if (!visible || user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md glass rounded-2xl p-8 animate-fade-in-up">
        <button
          onClick={() => { setVisible(false); setDismissed(true); }}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* 아이콘 */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-glow">
            <Sparkles size={28} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">
          더 많은 정보를 확인하세요
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          회원가입하면 <span className="text-yellow-400 font-semibold">300 포인트</span>를 즉시 드립니다
          <br />
          <span className="text-indigo-300">10건 무료 열람</span> 가능!
        </p>

        {/* 보너스 뱃지 */}
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-6">
          <Gift size={20} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-200">
            지금 가입하면 <strong>300 포인트 (약 10건)</strong> 즉시 지급
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/auth/signup")}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
          >
            무료 회원가입
          </button>
          <button
            onClick={() => router.push("/auth/login")}
            className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
          >
            이미 계정이 있으신가요? <span className="text-indigo-400 underline">로그인</span>
          </button>
          <button
            onClick={() => { setVisible(false); setDismissed(true); }}
            className="text-gray-600 hover:text-gray-400 text-xs text-center transition-colors"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
