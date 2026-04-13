"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, Mail, Lock, User, Phone, Eye, EyeOff,
  LoaderCircle, Gift, CheckCircle, ChevronRight, X, ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

type TermsKey = "terms" | "finance" | "privacy" | "marketing";

const TERMS_LIST: { key: TermsKey; label: string; required: boolean }[] = [
  { key: "terms",     label: "이용약관",                required: true },
  { key: "finance",   label: "전자금융거래 이용약관",      required: true },
  { key: "privacy",   label: "개인정보 수집·이용 안내",   required: true },
  { key: "marketing", label: "마케팅 정보 이용 및 제공 동의", required: false },
];

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "", email: "", password: "", passwordConfirm: "", phone: "",
  });
  const [showPw, setShowPw]     = useState(false);
  const [showPw2, setShowPw2]   = useState(false);
  const [otpSent, setOtpSent]   = useState(false);
  const [otpCode, setOtpCode]   = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading]   = useState(false);
  const [debugOtp, setDebugOtp]       = useState("");

  const [agreed, setAgreed] = useState<Record<TermsKey, boolean>>({
    terms: false, finance: false, privacy: false, marketing: false,
  });
  const [termsModal, setTermsModal] = useState<TermsKey | null>(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAgree = (k: TermsKey) => setAgreed((a) => ({ ...a, [k]: !a[k] }));
  const allRequired = agreed.terms && agreed.finance && agreed.privacy;
  const allAgree    = allRequired && agreed.marketing;

  const handleToggleAll = () => {
    const next = !allAgree;
    setAgreed({ terms: next, finance: next, privacy: next, marketing: next });
  };

  const handleSendOtp = async () => {
    const phone = form.phone.replace(/-/g, "").replace(/ /g, "");
    if (phone.length < 10) { setError("올바른 휴대전화 번호를 입력하세요"); return; }
    setOtpLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/sms/send", { phone });
      setOtpSent(true);
      if (data.debug_code) setDebugOtp(data.debug_code); // 테스트용
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "발송에 실패했습니다");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpLoading(true);
    setError("");
    try {
      await api.post("/auth/sms/verify", { phone: form.phone, code: otpCode });
      setOtpVerified(true);
      setDebugOtp("");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "인증에 실패했습니다");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8)       { setError("비밀번호는 8자 이상이어야 합니다"); return; }
    if (form.password !== form.passwordConfirm) { setError("비밀번호가 일치하지 않습니다"); return; }
    if (!otpVerified)                   { setError("휴대전화 인증을 완료해주세요"); return; }
    if (!allRequired)                   { setError("필수 약관에 동의해주세요"); return; }

    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", {
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        agreed_terms: agreed.terms,
        agreed_finance: agreed.finance,
        agreed_privacy: agreed.privacy,
        agreed_marketing: agreed.marketing,
      });
      localStorage.setItem("access_token", data.access_token);
      useAuthStore.setState({ user: data.user, token: data.access_token });
      router.push("/");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px", position: "relative", overflow: "hidden" }}>
      {/* 배경 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -160, right: -160, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -160, left: -160, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIDB</span>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "white", margin: 0 }}>회원가입</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>가입 즉시 300 포인트 지급</p>
        </div>

        {/* 웰컴 배너 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 14, padding: "10px 14px", marginBottom: 16 }}>
          <Gift size={18} color="#facc15" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#fef08a", margin: 0 }}>가입 완료 시 <strong>300 포인트 (10건 열람)</strong> 즉시 지급!</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 이름 */}
          <Field label="이름">
            <InputIcon icon={<User size={15} color="#6b7280" />}>
              <input type="text" required value={form.name} onChange={(e) => setF("name", e.target.value)}
                placeholder="홍길동" style={inputStyle} />
            </InputIcon>
          </Field>

          {/* 이메일 */}
          <Field label="이메일 (아이디)">
            <InputIcon icon={<Mail size={15} color="#6b7280" />}>
              <input type="email" required value={form.email} onChange={(e) => setF("email", e.target.value)}
                placeholder="name@example.com" style={inputStyle} />
            </InputIcon>
          </Field>

          {/* 비밀번호 */}
          <Field label="비밀번호 (8자 이상)">
            <InputIcon icon={<Lock size={15} color="#6b7280" />} right={
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }>
              <input type={showPw ? "text" : "password"} required value={form.password} onChange={(e) => setF("password", e.target.value)}
                placeholder="8자 이상 입력" style={inputStyle} />
            </InputIcon>
          </Field>

          {/* 비밀번호 확인 */}
          <Field label="비밀번호 확인">
            <InputIcon icon={<Lock size={15} color="#6b7280" />} right={
              <button type="button" onClick={() => setShowPw2(v => !v)} style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                {showPw2 ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }>
              <input type={showPw2 ? "text" : "password"} required value={form.passwordConfirm} onChange={(e) => setF("passwordConfirm", e.target.value)}
                placeholder="비밀번호 재입력" style={inputStyle} />
            </InputIcon>
            {form.passwordConfirm && (
              <p style={{ fontSize: 11, marginTop: 4, color: form.password === form.passwordConfirm ? "#4ade80" : "#f87171" }}>
                {form.password === form.passwordConfirm ? "✓ 비밀번호가 일치합니다" : "✗ 비밀번호가 일치하지 않습니다"}
              </p>
            )}
          </Field>

          {/* 휴대전화 + OTP */}
          <Field label={<>휴대전화 <span style={{ color: "#ef4444", fontSize: 11 }}>*필수</span></>}>
            <div style={{ display: "flex", gap: 8 }}>
              <InputIcon icon={<Phone size={15} color="#6b7280" />} style={{ flex: 1 }}>
                <input type="tel" required value={form.phone} onChange={(e) => setF("phone", e.target.value)}
                  placeholder="010-0000-0000" style={inputStyle} disabled={otpVerified} />
              </InputIcon>
              <button type="button" onClick={handleSendOtp} disabled={otpLoading || otpVerified}
                style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: otpVerified ? "#4ade80" : "#818cf8", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, padding: "0 14px", cursor: otpVerified ? "default" : "pointer", whiteSpace: "nowrap" }}>
                {otpVerified ? "인증완료" : otpSent ? "재발송" : "인증번호 받기"}
              </button>
            </div>

            {/* 테스트용 OTP 표시 */}
            {debugOtp && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, fontSize: 12, color: "#fbbf24" }}>
                📱 [테스트] 인증번호: <strong>{debugOtp}</strong> (SMS API 연동 전 임시 표시)
              </div>
            )}

            {otpSent && !otpVerified && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="6자리 인증번호 입력" maxLength={6}
                  style={{ ...inputStyle, flex: 1, paddingLeft: 14, letterSpacing: 4, fontSize: 16, fontWeight: 700 }} />
                <button type="button" onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length < 6}
                  style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #4f46e5, #9333ea)", border: "none", borderRadius: 10, padding: "0 16px", cursor: "pointer" }}>
                  {otpLoading ? "확인 중..." : "확인"}
                </button>
              </div>
            )}

            {otpVerified && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#4ade80" }}>
                <ShieldCheck size={13} /> 휴대전화 인증이 완료되었습니다
              </div>
            )}
          </Field>

          {/* 약관 동의 */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            {/* 전체 동의 */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 10 }}>
              <CheckBox checked={allAgree} onChange={handleToggleAll} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>전체 동의</span>
            </label>

            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 10 }} />

            {TERMS_LIST.map(({ key, label, required }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer" }}>
                  <CheckBox checked={agreed[key]} onChange={() => toggleAgree(key)} />
                  <span style={{ fontSize: 12, color: "#d1d5db" }}>
                    {required ? <span style={{ color: "#818cf8", marginRight: 3 }}>[필수]</span> : <span style={{ color: "#6b7280", marginRight: 3 }}>[선택]</span>}
                    {label}
                  </span>
                </label>
                <button type="button" onClick={() => setTermsModal(key)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !allRequired || !otpVerified}
            style={{ width: "100%", background: allRequired && otpVerified ? "linear-gradient(135deg, #4f46e5, #9333ea)" : "rgba(99,102,241,0.3)", border: "none", color: "white", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: allRequired && otpVerified ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s", fontFamily: "inherit" }}>
            {loading ? <LoaderCircle size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
            무료 회원가입
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", margin: 0 }}>
            이미 계정이 있으신가요?{" "}
            <Link href="/auth/login" style={{ color: "#818cf8", textDecoration: "none" }}>로그인</Link>
          </p>
        </form>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* 약관 모달 */}
      {termsModal && (
        <TermsModal termKey={termsModal} onClose={() => setTermsModal(null)}
          onAgree={() => { setAgreed(a => ({ ...a, [termsModal]: true })); setTermsModal(null); }} />
      )}
    </div>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", background: "transparent", border: "none", outline: "none",
  paddingTop: 12, paddingBottom: 12, paddingLeft: 38, paddingRight: 14,
  fontSize: 14, color: "white", fontFamily: "inherit",
};

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function InputIcon({ icon, right, children, style }: { icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", ...style }}>
      <div style={{ position: "absolute", left: 12, pointerEvents: "none" }}>{icon}</div>
      {children}
      {right && <div style={{ position: "absolute", right: 12 }}>{right}</div>}
    </div>
  );
}

function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 18, height: 18, borderRadius: 5, border: checked ? "2px solid #6366f1" : "2px solid #374151", background: checked ? "#4f46e5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
      {checked && <CheckCircle size={11} color="white" />}
    </div>
  );
}

// ── 약관 모달 ─────────────────────────────────────────────
const TERMS_CONTENT: Record<TermsKey, { title: string; content: string }> = {
  terms: {
    title: "이용약관",
    content: `제1조 (목적)
본 약관은 주식회사 에이치랩(이하 "회사")이 운영하는 AIDB 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 전국 사업장·매장 정보 검색 플랫폼을 의미합니다.
2. "이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.
3. "포인트"란 서비스 내에서 유료 정보를 열람하기 위해 사용하는 가상 화폐를 말합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스 화면에 게시하거나 이용자에게 공지함으로써 효력이 발생합니다.
2. 회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 7일 전 공지합니다.

제4조 (서비스 이용)
1. 서비스는 공공데이터를 기반으로 전국 인허가 사업장 정보를 제공합니다.
2. 검색 결과 상위 3건은 무료로 제공되며, 이후 항목은 포인트 차감 후 열람 가능합니다.
3. 이용자는 서비스를 통해 취득한 정보를 상업적 목적으로 무단 재배포할 수 없습니다.

제5조 (포인트 정책)
1. 포인트는 회원가입 시 300포인트가 무상 지급됩니다.
2. 추가 포인트는 결제를 통해 충전할 수 있습니다.
3. 충전된 포인트는 환불이 원칙적으로 불가하며, 미사용 포인트에 한해 관련 법령에 따라 환불을 요청할 수 있습니다.

제6조 (면책사항)
1. 회사는 공공데이터의 정확성을 보증하지 않으며, 데이터 오류로 인한 손해에 대해 책임지지 않습니다.
2. 서비스 중단·장애 시 회사는 이를 사전 고지하며, 불가피한 경우 사후 고지합니다.

제7조 (준거법 및 관할)
본 약관은 대한민국 법률에 따르며, 분쟁 발생 시 회사 소재지 관할 법원을 1심 법원으로 합니다.

사업자명: 주식회사 에이치랩 | 사업자번호: 745-87-03566
고객센터: help@hlabsoft.co.kr | 1555-1265`,
  },
  finance: {
    title: "전자금융거래 이용약관",
    content: `제1조 (목적)
본 약관은 주식회사 에이치랩(이하 "회사")이 제공하는 전자금융거래 서비스의 이용조건과 절차에 관한 사항을 규정합니다.

제2조 (전자금융거래의 종류)
회사가 제공하는 전자금융거래는 다음과 같습니다.
1. 포인트 충전: 신용카드, 체크카드 등을 통한 포인트 구매
2. 포인트 사용: 서비스 내 정보 열람 및 엑셀 다운로드에 포인트 사용

제3조 (거래내용의 확인)
1. 이용자는 마이페이지에서 포인트 사용 내역을 확인할 수 있습니다.
2. 거래 내용에 이의가 있는 경우 고객센터(1555-1265)로 문의하시기 바랍니다.

제4조 (오류의 정정)
이용자는 전자금융거래 오류 발생 시 회사에 정정을 요구할 수 있으며, 회사는 조사 후 3영업일 이내에 결과를 통지합니다.

제5조 (전자금융거래 거절)
부정사용 의심, 잔액 부족, 시스템 장애 등의 경우 거래가 거절될 수 있습니다.

제6조 (책임의 한계)
천재지변, 해킹 등 불가항력적 사유로 인한 서비스 장애 시 회사의 책임이 제한될 수 있습니다.

문의: help@hlabsoft.co.kr | 1555-1265`,
  },
  privacy: {
    title: "개인정보 수집·이용 안내",
    content: `주식회사 에이치랩은 개인정보보호법에 따라 이용자의 개인정보를 다음과 같이 수집·이용합니다.

■ 수집 항목
- 필수: 이름, 이메일, 비밀번호(암호화), 휴대전화번호
- 선택: 마케팅 수신 동의 여부
- 자동 수집: 접속 IP, 이용 일시, 서비스 이용 기록

■ 수집 목적
1. 회원 식별 및 인증
2. 서비스 제공 및 포인트 관리
3. 고객 문의 대응
4. 불법·부정 사용 방지

■ 보유 기간
- 회원 탈퇴 시까지 (단, 관련 법령에 따라 일부 정보는 법정 기간 보유)
- 전자상거래 거래 기록: 5년 (전자상거래법)
- 접속 로그: 3개월 (통신비밀보호법)

■ 제3자 제공
회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
단, 결제 처리를 위해 PG사(나이스페이먼츠)에 최소 정보를 제공합니다.

■ 개인정보 파기
보유 기간 종료 시 전자적 방법으로 복구 불가능하게 삭제합니다.

■ 권리 행사
이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.
문의: help@hlabsoft.co.kr | 1555-1265`,
  },
  marketing: {
    title: "마케팅 정보 이용 및 제공 동의",
    content: `■ 수집 항목
이름, 이메일, 휴대전화번호

■ 이용 목적
1. 신규 서비스 및 기능 안내
2. 이벤트, 프로모션, 포인트 혜택 안내
3. 맞춤형 광고 및 추천 서비스 제공

■ 보유 기간
동의 철회 시 또는 회원 탈퇴 시까지

■ 수신 채널
이메일, SMS/MMS, 앱 푸시

■ 동의 철회
마이페이지 → 알림 설정에서 언제든 철회 가능합니다.
동의를 거부하시더라도 서비스 이용에 불이익은 없습니다.

문의: help@hlabsoft.co.kr | 주식회사 에이치랩`,
  },
};

function TermsModal({ termKey, onClose, onAgree }: { termKey: TermsKey; onClose: () => void; onAgree: () => void }) {
  const { title, content } = TERMS_CONTENT[termKey];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0 0" }}
      onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 540, background: "#111128", borderRadius: "20px 20px 0 0", padding: "20px 20px 32px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", fontSize: 12, color: "#9ca3af", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 16 }}>
          {content}
        </div>
        <button onClick={onAgree}
          style={{ width: "100%", background: "linear-gradient(135deg, #4f46e5, #9333ea)", border: "none", color: "white", padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          동의합니다
        </button>
      </div>
    </div>
  );
}
