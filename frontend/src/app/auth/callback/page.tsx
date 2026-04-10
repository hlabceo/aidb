"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshUser } = useAuthStore();

  useEffect(() => {
    const token = params.get("token");
    if (!token) { router.replace("/auth/login"); return; }

    localStorage.setItem("access_token", token);

    api.get("/auth/me")
      .then(({ data }) => {
        useAuthStore.setState({ user: data, token });
        router.replace("/");
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        router.replace("/auth/login");
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Loader2 size={32} color="#818cf8" className="animate-spin" />
      <p style={{ color: "#6b7280", fontSize: 14 }}>로그인 처리 중...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color="#818cf8" className="animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
