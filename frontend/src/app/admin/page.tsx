"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Users,
  Database,
  Search,
  Eye,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  users: number;
  businesses: number;
  searches: number;
  views: number;
  revenue: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  points: number;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SidoCount {
  sido: string;
  count: number;
}

interface CollectStatus {
  total: number;
  by_sido: SidoCount[];
}

interface SearchLog {
  query: string;
  result_cnt: number;
  created_at: string;
}

type Tab = "stats" | "users" | "collect" | "searches";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDO_LIST = [
  "all",
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

// ─── Style helpers ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

const tabActive: React.CSSProperties = {
  background: "rgba(99,102,241,0.2)",
  border: "1px solid #6366f1",
  color: "#a5b4fc",
  borderRadius: 10,
  padding: "8px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const tabInactive: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#6b7280",
  borderRadius: 10,
  padding: "8px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  color: "#6b7280",
  fontWeight: 600,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "#d1d5db",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  whiteSpace: "nowrap",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  const [tab, setTab] = useState<Tab>("stats");

  // stats
  const [stats, setStats] = useState<Stats | null>(null);

  // users
  const [userList, setUserList] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);

  // 회원 수정 모달
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPw, setEditPw] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editRole, setEditRole] = useState("user");
  const [editActive, setEditActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  // collect
  const [collectStatus, setCollectStatus] = useState<CollectStatus | null>(null);
  const [collectSido, setCollectSido] = useState("all");
  const [collectMax, setCollectMax] = useState(50000);
  const [collectMsg, setCollectMsg] = useState("");
  const [fixMsg, setFixMsg] = useState("");
  const [collectLoading, setCollectLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);

  // searches
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [searchPage, setSearchPage] = useState(1);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.push("/auth/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  // ── Tab loaders ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    if (tab === "users") loadUsers(userPage);
    if (tab === "collect") loadCollectStatus();
    if (tab === "searches") loadSearches(searchPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadUsers(userPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadSearches(searchPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPage]);

  // ── API calls ───────────────────────────────────────────────────────────────

  async function loadStats() {
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data);
    } catch { /* silent */ }
  }

  async function loadUsers(page: number) {
    try {
      const { data } = await api.get(`/admin/users?page=${page}&size=20`);
      setUserList(data.users);
      setUserTotal(data.total);
    } catch { /* silent */ }
  }

  async function loadCollectStatus() {
    try {
      const { data } = await api.get("/admin/collect/status");
      setCollectStatus(data);
    } catch { /* silent */ }
  }

  async function loadSearches(page: number) {
    try {
      const { data } = await api.get(`/admin/searches?page=${page}&size=20`);
      setSearchLogs(data.logs);
    } catch { /* silent */ }
  }

  async function handleCollect() {
    setCollectLoading(true);
    setCollectMsg("");
    try {
      await api.post("/admin/collect", { sido: collectSido, max: collectMax });
      setCollectMsg("백그라운드에서 수집을 시작했습니다.");
    } catch {
      setCollectMsg("수집 요청 중 오류가 발생했습니다.");
    } finally {
      setCollectLoading(false);
    }
  }

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setEditName(u.name);
    setEditPw("");
    setEditPoints(u.points);
    setEditRole(u.role);
    setEditActive(u.is_active);
    setEditMsg("");
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setEditLoading(true);
    setEditMsg("");
    try {
      const body: Record<string, unknown> = {
        name: editName,
        points: editPoints,
        role: editRole,
        is_active: editActive,
      };
      if (editPw.trim()) body.password = editPw;
      await api.patch(`/admin/users/${editTarget.id}`, body);
      setEditMsg("✅ 수정 완료!");
      await loadUsers(userPage);
      setTimeout(() => setEditTarget(null), 800);
    } catch {
      setEditMsg("❌ 수정 중 오류가 발생했습니다.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleFixStatus() {
    setFixLoading(true);
    setFixMsg("");
    try {
      const { data } = await api.post("/admin/fix-status");
      setFixMsg(data?.message || "정규화가 완료되었습니다.");
    } catch {
      setFixMsg("정규화 중 오류가 발생했습니다.");
    } finally {
      setFixLoading(false);
    }
  }

  // ── Guard render ─────────────────────────────────────────────────────────────

  if (!user || user.role !== "admin") return null;

  const userPageMax = Math.ceil(userTotal / 20);

  // ── 회원 수정 모달 ────────────────────────────────────────────────────────────
  const EditModal = editTarget && (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#111128", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "white" }}>회원 정보 수정</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>{editTarget.email}</div>

        {[
          { label: "이름", value: editName, onChange: (v: string) => setEditName(v), type: "text" },
          { label: "비밀번호 초기화 (빈칸이면 유지)", value: editPw, onChange: (v: string) => setEditPw(v), type: "password" },
          { label: "포인트", value: String(editPoints), onChange: (v: string) => setEditPoints(Number(v)), type: "number" },
        ].map(({ label, value, onChange, type }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6 }}>{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "white", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6 }}>역할</label>
          <select value={editRole} onChange={e => setEditRole(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "white", outline: "none", fontFamily: "inherit" }}>
            <option value="user" style={{ background: "#111" }}>회원</option>
            <option value="admin" style={{ background: "#111" }}>관리자</option>
          </select>
        </div>

        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 12, color: "#9ca3af" }}>계정 활성화</label>
          <div onClick={() => setEditActive(v => !v)}
            style={{ width: 42, height: 24, borderRadius: 12, background: editActive ? "#4f46e5" : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 3, left: editActive ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
          </div>
          <span style={{ fontSize: 12, color: editActive ? "#4ade80" : "#f87171" }}>{editActive ? "활성" : "비활성"}</span>
        </div>

        {editMsg && <div style={{ fontSize: 13, color: editMsg.startsWith("✅") ? "#4ade80" : "#f87171", marginBottom: 14 }}>{editMsg}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setEditTarget(null)}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", padding: "12px 0", borderRadius: 12, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            취소
          </button>
          <button onClick={handleEditSave} disabled={editLoading}
            style={{ flex: 1, background: "linear-gradient(135deg,#4f46e5,#9333ea)", border: "none", color: "white", padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: editLoading ? 0.7 : 1 }}>
            {editLoading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", padding: "0 16px 60px" }}>
      {EditModal}

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 52, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", color: "#6b7280", display: "flex", alignItems: "center", cursor: "pointer", padding: 0 }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={11} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AIDB
            </span>
          </div>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>관리자 페이지</span>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {(["stats", "users", "collect", "searches"] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = { stats: "통계", users: "회원관리", collect: "데이터수집", searches: "검색로그" };
            return (
              <button key={t} onClick={() => setTab(t)} style={tab === t ? tabActive : tabInactive}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* ── Tab: 통계 ────────────────────────────────────────────────────────── */}
        {tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {[
                { label: "총 회원수", value: stats?.users, Icon: Users, color: "#818cf8", bg: "rgba(99,102,241,0.12)" },
                { label: "총 업체수", value: stats?.businesses, Icon: Database, color: "#c084fc", bg: "rgba(147,51,234,0.12)" },
                { label: "총 검색수", value: stats?.searches, Icon: Search, color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
                { label: "총 열람수", value: stats?.views, Icon: Eye, color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
                { label: "총 매출 (원)", value: stats?.revenue, Icon: TrendingUp, color: "#facc15", bg: "rgba(250,204,21,0.12)" },
              ].map(({ label, value, Icon, color, bg }) => (
                <div key={label} style={{ ...card, display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>
                      {value !== undefined ? value.toLocaleString() : "—"}
                      {label === "총 매출 (원)" && value !== undefined ? "원" : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: 회원관리 ─────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <div style={card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["이메일", "이름", "포인트", "역할", "상태", "가입일", ""].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userList.map((u) => (
                    <tr key={u.id}>
                      <td style={td}>{u.email}</td>
                      <td style={td}>{u.name}</td>
                      <td style={{ ...td, color: "#facc15" }}>{u.points.toLocaleString()} P</td>
                      <td style={td}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 600,
                          background: u.role === "admin" ? "rgba(99,102,241,0.2)" : "rgba(107,114,128,0.2)",
                          color: u.role === "admin" ? "#a5b4fc" : "#9ca3af",
                          border: `1px solid ${u.role === "admin" ? "#6366f1" : "rgba(107,114,128,0.3)"}`,
                        }}>
                          {u.role === "admin" ? "관리자" : "회원"}
                        </span>
                      </td>
                      <td style={td}>
                        {!u.is_active && (
                          <span style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "rgba(239,68,68,0.15)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.3)",
                          }}>
                            비활성
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, color: "#6b7280" }}>
                        {new Date(u.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td style={td}>
                        <button onClick={() => openEdit(u)}
                          style={{ fontSize: 11, color: "#a5b4fc", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
                          수정
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage <= 1}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: userPage <= 1 ? "#374151" : "#d1d5db", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: userPage <= 1 ? "default" : "pointer", fontFamily: "inherit" }}
              >
                이전
              </button>
              <span style={{ fontSize: 13, color: "#6b7280" }}>{userPage} / {userPageMax || 1}</span>
              <button
                onClick={() => setUserPage((p) => Math.min(userPageMax, p + 1))}
                disabled={userPage >= userPageMax}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: userPage >= userPageMax ? "#374151" : "#d1d5db", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: userPage >= userPageMax ? "default" : "pointer", fontFamily: "inherit" }}
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: 데이터수집 ───────────────────────────────────────────────────── */}
        {tab === "collect" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* 수집 현황 */}
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>수집 현황</div>
                  {collectStatus && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      총 {collectStatus.total.toLocaleString()} 건
                    </div>
                  )}
                </div>
                <button
                  onClick={loadCollectStatus}
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc", borderRadius: 10, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  현황 새로고침
                </button>
              </div>
              {collectStatus && collectStatus.by_sido.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>시도</th>
                        <th style={{ ...th, textAlign: "right" }}>건수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectStatus.by_sido.map((row) => (
                        <tr key={row.sido}>
                          <td style={td}>{row.sido}</td>
                          <td style={{ ...td, textAlign: "right", color: "#a5b4fc" }}>{row.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                  {collectStatus ? "데이터 없음" : "새로고침 버튼을 눌러 현황을 불러오세요."}
                </div>
              )}
            </div>

            {/* 수집 트리거 */}
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 16 }}>수집 트리거</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>시도 선택</label>
                  <select
                    value={collectSido}
                    onChange={(e) => setCollectSido(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", appearance: "auto" }}
                  >
                    {SIDO_LIST.map((s) => (
                      <option key={s} value={s} style={{ background: "#1a1a2e" }}>
                        {s === "all" ? "all (전체)" : s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>최대 건수</label>
                  <input
                    type="number"
                    value={collectMax}
                    onChange={(e) => setCollectMax(Number(e.target.value))}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontFamily: "inherit", width: 110 }}
                  />
                </div>
                <button
                  onClick={handleCollect}
                  disabled={collectLoading}
                  style={{ background: "linear-gradient(135deg,#4f46e5,#9333ea)", border: "none", color: "white", borderRadius: 10, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: collectLoading ? "default" : "pointer", fontFamily: "inherit", opacity: collectLoading ? 0.6 : 1 }}
                >
                  {collectLoading ? "요청 중..." : "수집 시작"}
                </button>
              </div>
              {collectMsg && (
                <div style={{ marginTop: 14, fontSize: 13, color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  {collectMsg}
                </div>
              )}
            </div>

            {/* 영업상태 정규화 */}
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>영업상태 정규화</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                &quot;영업/정상&quot; → &quot;영업중&quot; 으로 일괄 변환합니다.
              </div>
              <button
                onClick={handleFixStatus}
                disabled={fixLoading}
                style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", color: "#facc15", borderRadius: 10, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: fixLoading ? "default" : "pointer", fontFamily: "inherit", opacity: fixLoading ? 0.6 : 1 }}
              >
                {fixLoading ? "처리 중..." : "영업/정상 → 영업중 일괄 정규화"}
              </button>
              {fixMsg && (
                <div style={{ marginTop: 14, fontSize: 13, color: "#a5b4fc", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  {fixMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: 검색로그 ─────────────────────────────────────────────────────── */}
        {tab === "searches" && (
          <div style={card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["검색어", "결과건수", "시간"].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchLogs.map((s, i) => (
                    <tr key={i}>
                      <td style={td}>{s.query}</td>
                      <td style={{ ...td, color: "#a5b4fc" }}>{s.result_cnt?.toLocaleString() ?? "—"}</td>
                      <td style={{ ...td, color: "#6b7280" }}>
                        {new Date(s.created_at).toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                disabled={searchPage <= 1}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: searchPage <= 1 ? "#374151" : "#d1d5db", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: searchPage <= 1 ? "default" : "pointer", fontFamily: "inherit" }}
              >
                이전
              </button>
              <span style={{ fontSize: 13, color: "#6b7280" }}>페이지 {searchPage}</span>
              <button
                onClick={() => setSearchPage((p) => p + 1)}
                disabled={searchLogs.length < 20}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: searchLogs.length < 20 ? "#374151" : "#d1d5db", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: searchLogs.length < 20 ? "default" : "pointer", fontFamily: "inherit" }}
              >
                다음
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
