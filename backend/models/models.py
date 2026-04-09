import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Date, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    points: Mapped[int] = mapped_column(Integer, default=0)
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    point_logs: Mapped[list["PointLog"]] = relationship(back_populates="user")
    view_logs: Mapped[list["ViewLog"]] = relationship(back_populates="user")

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opn_svc_id: Mapped[str | None] = mapped_column(String(20))
    opn_svc_nm: Mapped[str | None] = mapped_column(String(100))
    bsn_nm: Mapped[str] = mapped_column(String(255), nullable=False)
    bsn_nm_masked: Mapped[str | None] = mapped_column(String(255))
    uptae_nm: Mapped[str | None] = mapped_column(String(100))
    addr: Mapped[str | None] = mapped_column(String(500))
    road_addr: Mapped[str | None] = mapped_column(String(500))
    zip_cd: Mapped[str | None] = mapped_column(String(10))
    tel: Mapped[str | None] = mapped_column(String(50))
    lat: Mapped[float | None] = mapped_column(Numeric(10, 7))
    lng: Mapped[float | None] = mapped_column(Numeric(10, 7))
    status: Mapped[str | None] = mapped_column(String(20))
    status_code: Mapped[str | None] = mapped_column(String(5))
    open_date: Mapped[datetime | None] = mapped_column(Date)
    close_date: Mapped[datetime | None] = mapped_column(Date)
    sido: Mapped[str | None] = mapped_column(String(50))
    sigungu: Mapped[str | None] = mapped_column(String(50))
    raw_data: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class PointLog(Base):
    __tablename__ = "point_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(20))
    amount: Mapped[int] = mapped_column(Integer)
    balance: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(String(255))
    ref_id: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="point_logs")

class ViewLog(Base):
    __tablename__ = "view_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    points_used: Mapped[int] = mapped_column(Integer, default=30)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="view_logs")

class ChargeLog(Base):
    __tablename__ = "charge_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    amount: Mapped[int] = mapped_column(Integer)
    points: Mapped[int] = mapped_column(Integer)
    pg_tx_id: Mapped[str | None] = mapped_column(String(100))
    pg_method: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class SearchLog(Base):
    __tablename__ = "search_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    query: Mapped[str] = mapped_column(String(500))
    result_cnt: Mapped[int | None] = mapped_column(Integer)
    ip: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
