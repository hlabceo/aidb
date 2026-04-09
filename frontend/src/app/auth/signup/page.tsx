"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Mail, Lock, User, Phone, Eye, EyeOff, Loader2, Gift } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다"); return; }
    setError("");
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name, form.phone || undefined);
      router.push("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-indigo-900/20 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-purple-900/20 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AIDB</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">회원가입</h1>
          <p className="text-gray-400 text-sm mt-1">가입 즉시 300 포인트 지급</p>
        </div>

        {/* 웰컴 보너스 */}
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
          <Gift size={18} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-200">
            가입 완료 시 <strong>300 포인트 (10건 열람)</strong> 즉시 지급!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 flex flex-col gap-4">
          {/* 이름 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text" required value={form.name} onChange={(e) => set("name", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/60 transition-colors"
                placeholder="홍길동"
              />
            </div>
          </div>

          {/* 이메일 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이메일</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email" required value={form.email} onChange={(e) => set("email", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/60 transition-colors"
                placeholder="name@example.com"
              />
            </div>
          </div>

          {/* 전화번호 (선택) */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">전화번호 <span className="text-gray-600">(선택)</span></label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/60 transition-colors"
                placeholder="010-0000-0000"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">비밀번호 <span className="text-gray-600">(8자 이상)</span></label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPw ? "text" : "password"} required value={form.password} onChange={(e) => set("password", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/60 transition-colors"
                placeholder="8자 이상 입력"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 mt-1"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            무료 회원가입
          </button>

          <p className="text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300">로그인</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
