from datetime import datetime, timedelta
from typing import Annotated
import uuid
import random
import string

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from config import settings
from database import get_db
from models.models import User, PointLog

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Schemas ──────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    phone_verified: bool = False
    agreed_terms: bool = False
    agreed_finance: bool = False
    agreed_privacy: bool = False
    agreed_marketing: bool = False

class SmsRequest(BaseModel):
    phone: str

class SmsVerifyRequest(BaseModel):
    phone: str
    code: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserMe(BaseModel):
    id: str
    email: str
    name: str
    phone: str | None
    points: int
    role: str


# ── Helpers ──────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_redis():
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)

def user_to_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "points": user.points,
        "role": user.role,
    }

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 유효하지 않습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

async def get_current_user_optional(
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None


# ── SMS OTP ───────────────────────────────────────────────
@router.post("/sms/send")
async def send_sms(body: SmsRequest):
    """
    SMS 인증번호 발송
    ※ API 키 수령 전: 6자리 코드를 응답에 포함 (테스트용)
    ※ API 키 수령 후: 실제 SMS 발송 + 응답에서 code 제거
    """
    phone = body.phone.replace("-", "").replace(" ", "")
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="올바른 휴대전화 번호를 입력하세요")

    code = "".join(random.choices(string.digits, k=6))

    r = get_redis()
    await r.setex(f"otp:{phone}", 300, code)  # 5분 유효
    await r.aclose()

    # TODO: SMS API 키 수령 후 실제 발송 코드로 교체
    # import httpx
    # await httpx.AsyncClient().post(SMS_API_URL, json={...})

    return {
        "message": "인증번호가 발송되었습니다 (5분 이내 입력)",
        "debug_code": code,  # ← API 키 연동 후 이 줄 삭제
    }


@router.post("/sms/verify")
async def verify_sms(body: SmsVerifyRequest):
    phone = body.phone.replace("-", "").replace(" ", "")
    r = get_redis()
    stored = await r.get(f"otp:{phone}")
    await r.aclose()

    if not stored:
        raise HTTPException(status_code=400, detail="인증번호가 만료되었거나 존재하지 않습니다")
    if stored != body.code.strip():
        raise HTTPException(status_code=400, detail="인증번호가 올바르지 않습니다")

    # 인증 성공 — 검증 토큰 발급 (5분)
    r = get_redis()
    await r.setex(f"otp_verified:{phone}", 300, "1")
    await r.delete(f"otp:{phone}")
    await r.aclose()

    return {"message": "인증되었습니다", "verified": True}


# ── Routes ───────────────────────────────────────────────
@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    # 필수 약관 체크
    if not body.agreed_terms or not body.agreed_finance or not body.agreed_privacy:
        raise HTTPException(status_code=400, detail="필수 약관에 동의해주세요")

    # 휴대폰 인증 확인
    phone = body.phone.replace("-", "").replace(" ", "")
    r = get_redis()
    verified = await r.get(f"otp_verified:{phone}")
    await r.aclose()
    if not verified:
        raise HTTPException(status_code=400, detail="휴대전화 인증이 필요합니다")

    # 이메일 중복 확인
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

    user = User(
        email=body.email,
        password=hash_password(body.password),
        name=body.name,
        phone=body.phone,
        points=0,
    )
    db.add(user)
    await db.flush()

    # 신규 가입 포인트 300P 지급
    log = PointLog(
        user_id=user.id,
        type="charge",
        amount=300,
        balance=300,
        description="신규 가입 환영 포인트",
    )
    user.points = 300
    db.add(log)
    await db.commit()

    # OTP 인증 상태 삭제
    r = get_redis()
    await r.delete(f"otp_verified:{phone}")
    await r.aclose()

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@router.get("/me", response_model=UserMe)
async def me(current_user: User = Depends(get_current_user)):
    return UserMe(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        phone=current_user.phone,
        points=current_user.points,
        role=current_user.role,
    )


# ── 소셜 로그인 (네이버) ───────────────────────────────────
@router.get("/social/naver")
async def naver_login():
    """
    네이버 OAuth 로그인 리다이렉트
    ※ 네이버 개발자센터에서 CLIENT_ID / CALLBACK_URL 설정 후 아래 값 교체
    """
    client_id = settings.NAVER_CLIENT_ID
    redirect_uri = settings.SOCIAL_REDIRECT_BASE + "/auth/social/naver/callback"
    state = "AIDB_NAVER_" + "".join(random.choices(string.ascii_letters, k=8))

    if not client_id:
        raise HTTPException(status_code=503, detail="네이버 로그인이 아직 설정되지 않았습니다")

    url = (
        f"https://nid.naver.com/oauth2.0/authorize"
        f"?response_type=code&client_id={client_id}"
        f"&redirect_uri={redirect_uri}&state={state}"
    )
    return RedirectResponse(url)


@router.get("/social/naver/callback")
async def naver_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    import httpx
    client_id = settings.NAVER_CLIENT_ID
    client_secret = settings.NAVER_CLIENT_SECRET
    redirect_uri = settings.SOCIAL_REDIRECT_BASE + "/auth/social/naver/callback"

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://nid.naver.com/oauth2.0/token",
            params={"grant_type": "authorization_code", "client_id": client_id,
                    "client_secret": client_secret, "code": code, "state": state,
                    "redirect_uri": redirect_uri},
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        profile_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile = profile_res.json().get("response", {})

    email = profile.get("email", "")
    name = profile.get("name", "네이버사용자")
    phone = profile.get("mobile", "").replace("-", "")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            password=hash_password(uuid.uuid4().hex),
            name=name,
            phone=phone or None,
            points=300,
        )
        db.add(user)
        await db.flush()
        db.add(PointLog(
            user_id=user.id, type="charge", amount=300, balance=300,
            description="신규 가입 환영 포인트 (네이버)",
        ))
        await db.commit()

    jwt_token = create_access_token({"sub": str(user.id)})
    frontend_url = settings.SOCIAL_REDIRECT_BASE.replace(":8000", ":3000")
    return RedirectResponse(f"{frontend_url}/auth/callback?token={jwt_token}")


# ── 소셜 로그인 (구글) ────────────────────────────────────
@router.get("/social/google")
async def google_login():
    """
    구글 OAuth 로그인 리다이렉트
    ※ Google Cloud Console에서 CLIENT_ID / CALLBACK_URL 설정 후 아래 값 교체
    """
    client_id = settings.GOOGLE_CLIENT_ID
    redirect_uri = settings.SOCIAL_REDIRECT_BASE + "/auth/social/google/callback"

    if not client_id:
        raise HTTPException(status_code=503, detail="구글 로그인이 아직 설정되지 않았습니다")

    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}&redirect_uri={redirect_uri}"
        f"&response_type=code&scope=openid%20email%20profile"
    )
    return RedirectResponse(url)


@router.get("/social/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    import httpx
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    redirect_uri = settings.SOCIAL_REDIRECT_BASE + "/auth/social/google/callback"

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={"code": code, "client_id": client_id, "client_secret": client_secret,
                  "redirect_uri": redirect_uri, "grant_type": "authorization_code"},
        )
        id_token = token_res.json().get("id_token", "")

        userinfo_res = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {token_res.json().get('access_token')}"},
        )
        profile = userinfo_res.json()

    email = profile.get("email", "")
    name = profile.get("name", "구글사용자")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            password=hash_password(uuid.uuid4().hex),
            name=name,
            points=300,
        )
        db.add(user)
        await db.flush()
        db.add(PointLog(
            user_id=user.id, type="charge", amount=300, balance=300,
            description="신규 가입 환영 포인트 (구글)",
        ))
        await db.commit()

    jwt_token = create_access_token({"sub": str(user.id)})
    frontend_url = settings.SOCIAL_REDIRECT_BASE.replace(":8000", ":3000")
    return RedirectResponse(f"{frontend_url}/auth/callback?token={jwt_token}")
