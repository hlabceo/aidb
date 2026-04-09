# AIDB — 소상공인 정보 검색 서비스

## 시작 방법

### 1. Docker Compose 실행 (Synology NAS or 로컬)

```bash
cd aidb
docker-compose up -d
```

서비스 접속:
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서:   http://localhost:8000/docs

---

### 2. 개발 모드 실행

**백엔드**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**프론트엔드**
```bash
cd frontend
npm install
npm run dev
```

---

### 3. 공공데이터 수집

1. https://www.localdata.go.kr 에서 API 키 발급
2. `backend/.env` 파일 생성:
```
LOCALDATA_API_KEY=발급받은키
```

3. 수집 실행:
```bash
cd backend
# 일반음식점 1만건 수집
python services/collector.py --svc 일반음식점 --max 10000

# 전체 업종 수집
python services/collector.py --svc all --max 50000
```

---

### 4. 기본 관리자 계정

- 이메일: `admin@aidb.kr`
- 비밀번호: `admin1234`

---

## 프로젝트 구조

```
aidb/
├── backend/
│   ├── main.py              # FastAPI 진입점
│   ├── config.py            # 환경설정
│   ├── database.py          # DB 연결
│   ├── models/models.py     # SQLAlchemy 모델
│   ├── routers/
│   │   ├── auth.py          # 인증 API
│   │   ├── search.py        # 검색 + 열람 API
│   │   ├── points.py        # 포인트 충전/내역 API
│   │   └── admin.py         # 관리자 API
│   ├── services/
│   │   └── collector.py     # 공공데이터 수집 스크립트
│   └── sql/init.sql         # DB 초기화 SQL
├── frontend/
│   └── src/app/
│       ├── page.tsx         # 랜딩 (AI 검색창)
│       ├── search/          # 검색 결과 (마스킹 + 체크박스)
│       ├── auth/            # 로그인 / 회원가입
│       ├── mypage/          # 포인트 내역
│       ├── charge/          # 포인트 충전
│       └── admin/           # 관리자 대시보드
└── docker-compose.yml
```

---

## 나이스페이먼츠 연동 (추후)

`backend/routers/points.py` 의 `/points/charge` 엔드포인트에서
PG 검증 로직 추가 후 실결제 활성화 예정.
