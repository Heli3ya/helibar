"""
helibar | هلی‌بار - Waybill & Fleet Management Platform
Database Models: SQLAlchemy 2.0 Declarative Models

Implements:
1. User with RBAC (ADMIN, SUPPORT, DRIVER)
2. Support/Client subscription tracking (subscription_end_date with 1-month cycles)
3. DriverProfile for freight, vehicles, and smart card management
4. Support-Driver Multi-Tenant isolation assignments
5. DriverOtpRequest for 2FA / OTP routing
"""

from datetime import datetime, date, timedelta
import enum
import uuid
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    SUPPORT = "SUPPORT"
    DRIVER = "DRIVER"


class OtpStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    EXPIRED = "EXPIRED"
    FAILED = "FAILED"


class SubscriptionStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    WARNING_14_DAYS = "14_DAYS"
    WARNING_7_DAYS_BLINKING = "7_DAYS_BLINKING"
    EXPIRED = "SUBSCRIPTION_EXPIRED"


# ---------------------------------------------------------------------------
# 1. Users Table (Core Auth, RBAC, and Subscription)
# ---------------------------------------------------------------------------
class User(Base):
    """
    Central User model supporting:
    - ADMIN: Full access to all modules and settings.
    - SUPPORT: Operational module access (excluding system settings); includes subscription_end_date.
    - DRIVER: Strictly restricted to the 2FA/OTP Input endpoint.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role_enum"), nullable=False, index=True
    )
    full_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(15), index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Extended Profile Information
    national_id: Mapped[Optional[str]] = mapped_column(String(10), index=True, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    province_city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Subscription Management: 1-month cycles for SUPPORT/Client accounts
    subscription_start_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    subscription_end_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True, index=True
    )
    is_payment_approved: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    plate_capacity: Mapped[int] = mapped_column(
        Integer, default=50, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    driver_profile: Mapped[Optional["DriverProfile"]] = relationship(
        "DriverProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    managed_driver_assignments: Mapped[List["SupportDriverAssignment"]] = relationship(
        "SupportDriverAssignment",
        foreign_keys="[SupportDriverAssignment.support_id]",
        back_populates="support_user",
        cascade="all, delete-orphan",
    )
    assigned_support_assignments: Mapped[List["SupportDriverAssignment"]] = relationship(
        "SupportDriverAssignment",
        foreign_keys="[SupportDriverAssignment.driver_id]",
        back_populates="driver_user",
        cascade="all, delete-orphan",
    )
    initiated_otps: Mapped[List["DriverOtpRequest"]] = relationship(
        "DriverOtpRequest",
        foreign_keys="[DriverOtpRequest.support_id]",
        back_populates="support_user",
        cascade="all, delete-orphan",
    )
    plates: Mapped[List["Plate"]] = relationship(
        "Plate", back_populates="owner", cascade="all, delete-orphan"
    )
    managed_drivers: Mapped[List["Driver"]] = relationship(
        "Driver", back_populates="owner", cascade="all, delete-orphan"
    )
    waybills: Mapped[List["Waybill"]] = relationship(
        "Waybill", back_populates="owner", cascade="all, delete-orphan"
    )
    excel_uploads: Mapped[List["ExcelUpload"]] = relationship(
        "ExcelUpload", back_populates="owner", cascade="all, delete-orphan"
    )

    @property
    def subscription_days_left(self) -> float:
        """Returns the remaining days of the subscription."""
        if not self.subscription_end_date:
            return 999.0  # Admins or unconstrained users
        today = date.today()
        end = self.subscription_end_date
        if isinstance(end, datetime):
            end = end.date()
        return float((end - today).days)


# ---------------------------------------------------------------------------
# 2. Driver Profiles Table
# ---------------------------------------------------------------------------
class DriverProfile(Base):
    """
    Identity and freight profile for DRIVER accounts.
    Managed by SUPPORT operators.
    """
    __tablename__ = "driver_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    national_code: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    smart_card_number: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    license_number: Mapped[str] = mapped_column(String(32), nullable=False)

    # Iran Plate Format: 12 ع 345 ایران 77
    plate_part1: Mapped[str] = mapped_column(String(2), nullable=False)
    plate_letter: Mapped[str] = mapped_column(String(10), nullable=False)
    plate_part2: Mapped[str] = mapped_column(String(3), nullable=False)
    plate_province: Mapped[str] = mapped_column(String(2), nullable=False)

    vehicle_type: Mapped[str] = mapped_column(String(64), nullable=False)
    tonnage_kg: Mapped[int] = mapped_column(Integer, default=3800, nullable=False)
    active_trip_status: Mapped[str] = mapped_column(String(32), default="IDLE", nullable=False)
    fuel_quota_liters: Mapped[int] = mapped_column(Integer, default=600, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="driver_profile")


# ---------------------------------------------------------------------------
# 3. Support-Driver Multi-Tenant Isolation Assignment
# ---------------------------------------------------------------------------
class SupportDriverAssignment(Base):
    """
    Explicit isolation link between a SUPPORT operator and their managed DRIVERs.
    """
    __tablename__ = "support_driver_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    support_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("support_id", "driver_id", name="uq_support_driver"),
        Index("ix_support_driver_active", "support_id", "is_active"),
    )

    support_user: Mapped["User"] = relationship(
        "User", foreign_keys=[support_id], back_populates="managed_driver_assignments"
    )
    driver_user: Mapped["User"] = relationship(
        "User", foreign_keys=[driver_id], back_populates="assigned_support_assignments"
    )


# ---------------------------------------------------------------------------
# 4. Multi-Tenant OTP Routing
# ---------------------------------------------------------------------------
class DriverOtpRequest(Base):
    """
    Municipal/Sipaad 2FA OTP tracking routed to the designated Support operator.
    """
    __tablename__ = "driver_otp_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    support_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_name: Mapped[str] = mapped_column(
        String(64), nullable=False, default="WAYBILL_ISSUANCE"
    )
    otp_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    status: Mapped[OtpStatus] = mapped_column(
        SAEnum(OtpStatus, name="otp_status_enum"), default=OtpStatus.PENDING, nullable=False
    )
    trace_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_otp_support_status", "support_id", "status"),
        Index("ix_otp_driver_status", "driver_id", "status"),
    )

    support_user: Mapped["User"] = relationship(
        "User", foreign_keys=[support_id], back_populates="initiated_otps"
    )
    driver_user: Mapped["User"] = relationship("User", foreign_keys=[driver_id])


# ---------------------------------------------------------------------------
# 5. Waybills Table (Operational Waybill Records for Biweekly Stage Analytics)
# ---------------------------------------------------------------------------
class WaybillStatus(str, enum.Enum):
    PENDING = "PENDING"
    ISSUED = "ISSUED"
    FAILED = "FAILED"
    REJECTED = "REJECTED"
    REVOKED = "REVOKED"


class Waybill(Base):
    """
    Waybill (باربرگ) records representing municipal intra-city transit permits.
    Provides tracking of timestamps for calculating Stage 1 and Stage 2 statistics.
    Includes strict owner_id for anti-IDOR multi-tenant isolation.
    """
    __tablename__ = "waybills"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    tracking_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("driver_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    plate_number: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    status: Mapped[WaybillStatus] = mapped_column(
        SAEnum(WaybillStatus, name="waybill_status_enum"), default=WaybillStatus.ISSUED, nullable=False, index=True
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True, nullable=False
    )
    tonnage_kg: Mapped[int] = mapped_column(Integer, default=2200, nullable=False)
    origin: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    sender_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    receiver_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_waybill_owner_status", "owner_id", "status"),
        Index("ix_waybill_vehicle_issued_status", "vehicle_id", "issued_at", "status"),
        Index("ix_waybill_plate_issued_status", "plate_number", "issued_at", "status"),
    )

    owner: Mapped[Optional["User"]] = relationship("User", back_populates="waybills")


# ---------------------------------------------------------------------------
# 6. Operational Entities with Strict Multi-Tenancy & Anti-IDOR (owner_id)
# ---------------------------------------------------------------------------
class Plate(Base):
    """
    Fleet Plate entity strictly isolated to the SUPPORT operator who registered it.
    Anti-IDOR: Every query, update, and deletion is constrained by owner_id == current_user.id.
    """
    __tablename__ = "plates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plate_number: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    plate_part1: Mapped[str] = mapped_column(String(2), default="43", nullable=False)
    plate_letter: Mapped[str] = mapped_column(String(10), default="ع", nullable=False)
    plate_part2: Mapped[str] = mapped_column(String(3), default="789", nullable=False)
    plate_province: Mapped[str] = mapped_column(String(2), default="77", nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(64), default="وانت نیسان", nullable=False)
    smart_card_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_plate_owner_active", "owner_id", "is_active"),
        Index("ix_plate_owner_number", "owner_id", "plate_number"),
    )

    owner: Mapped["User"] = relationship("User", back_populates="plates")


class Driver(Base):
    """
    Operational Driver entity registered and managed by a specific Support user.
    Anti-IDOR: All operations are strictly locked to owner_id == current_user.id.
    """
    __tablename__ = "drivers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    national_code: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    license_number: Mapped[str] = mapped_column(String(32), nullable=False)
    smart_card_number: Mapped[str] = mapped_column(String(32), nullable=False)
    plate_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_driver_owner_active", "owner_id", "is_active"),
        Index("ix_driver_owner_national_code", "owner_id", "national_code"),
    )

    owner: Mapped["User"] = relationship("User", back_populates="managed_drivers")


class ExcelUpload(Base):
    """
    Excel bulk upload batch logs strictly tied to the Support user who uploaded them.
    Anti-IDOR: Only accessible by the owner or bypassed by ADMIN.
    """
    __tablename__ = "excel_uploads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="COMPLETED", nullable=False)
    error_log: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_excel_owner_created", "owner_id", "created_at"),
    )

    owner: Mapped["User"] = relationship("User", back_populates="excel_uploads")


