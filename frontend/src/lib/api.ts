import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// 요청 인터셉터: Authorization 헤더 자동 첨부
// access_token 없으면 Zustand persist(aidb-auth)에서 fallback 조회
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    let token = localStorage.getItem("access_token");
    if (!token) {
      try {
        const auth = JSON.parse(localStorage.getItem("aidb-auth") || "{}");
        token = auth?.state?.token ?? null;
        if (token) localStorage.setItem("access_token", token); // 복구
      } catch { /* ignore */ }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 응답 인터셉터: 401 시 토큰 + Zustand 상태 모두 정리
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      // Zustand aidb-auth에서도 토큰 제거
      try {
        const auth = JSON.parse(localStorage.getItem("aidb-auth") || "{}");
        if (auth?.state) {
          auth.state.token = null;
          auth.state.user = null;
          localStorage.setItem("aidb-auth", JSON.stringify(auth));
        }
      } catch { /* ignore */ }
    }
    return Promise.reject(err);
  }
);

export default api;
