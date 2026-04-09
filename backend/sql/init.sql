-- =============================================
-- AIDB 소상공인 검색 서비스 초기 스키마
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 사용자
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    points      INTEGER NOT NULL DEFAULT 0,
    role        VARCHAR(20) NOT NULL DEFAULT 'user',  -- user | admin
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 포인트 내역
CREATE TABLE IF NOT EXISTS point_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL,  -- charge | use | refund
    amount      INTEGER NOT NULL,
    balance     INTEGER NOT NULL,
    description VARCHAR(255),
    ref_id      VARCHAR(100),          -- PG 거래 ID 등
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 충전 내역
CREATE TABLE IF NOT EXISTS charge_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,      -- 결제 금액(원)
    points      INTEGER NOT NULL,      -- 충전 포인트
    pg_tx_id    VARCHAR(100),
    pg_method   VARCHAR(50),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | success | failed
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 업소 데이터 (지방행정인허가)
CREATE TABLE IF NOT EXISTS businesses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opn_svc_id      VARCHAR(20),           -- 인허가 서비스 ID
    opn_svc_nm      VARCHAR(100),          -- 인허가 서비스명 (일반음식점 등)
    bsn_nm          VARCHAR(255) NOT NULL, -- 사업장명
    bsn_nm_masked   VARCHAR(255),          -- 마스킹된 사업장명 (홍**치킨)
    uptae_nm        VARCHAR(100),          -- 업태명
    addr            VARCHAR(500),          -- 주소
    road_addr       VARCHAR(500),          -- 도로명 주소
    zip_cd          VARCHAR(10),
    tel             VARCHAR(50),
    lat             NUMERIC(10,7),
    lng             NUMERIC(10,7),
    status          VARCHAR(20),           -- 영업 / 폐업 / 휴업
    status_code     VARCHAR(5),
    open_date       DATE,
    close_date      DATE,
    update_dt       VARCHAR(20),
    sido            VARCHAR(50),
    sigungu         VARCHAR(50),
    raw_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 열람 기록
CREATE TABLE IF NOT EXISTS view_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    points_used     INTEGER NOT NULL DEFAULT 30,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 검색 로그 (통계용)
CREATE TABLE IF NOT EXISTS search_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    query       VARCHAR(500) NOT NULL,
    result_cnt  INTEGER,
    ip          VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX IF NOT EXISTS idx_businesses_bsn_nm ON businesses USING gin(bsn_nm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_addr ON businesses USING gin(addr gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_opn_svc_nm ON businesses(opn_svc_nm);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_sido ON businesses(sido);
CREATE INDEX IF NOT EXISTS idx_businesses_sigungu ON businesses(sigungu);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_id ON point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_user_id ON view_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);

-- =============================================
-- 기본 관리자 계정 (비밀번호: admin1234)
-- =============================================
INSERT INTO users (email, password, name, role, points)
VALUES (
    'admin@aidb.kr',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    '관리자',
    'admin',
    999999
) ON CONFLICT (email) DO NOTHING;
