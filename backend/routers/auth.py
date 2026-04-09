from datetime import datetime, timedelta
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
    phone: str | None = None

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


# ── Routes ───────────────────────────────────────────────
@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
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

    # 신규 가입 포인트 지급 (300포인트 = 10건 무료)
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

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": str(user.id), "email": user.email, "name": user.name,
        "points": user.points, "role": user.role,
    }}


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": str(user.id), "email": user.email, "name": user.name,
        "points": user.points, "role": user.role,
    }}


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
