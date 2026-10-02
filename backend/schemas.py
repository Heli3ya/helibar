"""
helibar | هلی‌بار - Pydantic Schemas
Defines request and response schemas for Authentication, RBAC, Subscriptions,
Driver Profiles, and Multi-Tenant Support-Driver operations.
"""

from datetime import datetime
from typing import Optional, List
import re
import uuid

try:
    from pydantic import BaseModel, Field, ConfigDict, field_validator
except ImportError:
    class MockBaseModel:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
        def dict(self):
            return self.__dict__
    BaseModel = MockBaseModel  # type: ignore
    Field = lambda *args, **kwargs: None  # type: ignore
    ConfigDict = lambda *args, **kwargs: None  # type: ignore
    field_validator = lambda *args, **kwargs: lambda f: f  # type: ignore

from backend.models import UserRole, OtpStatus, SubscriptionStatusEnum


# ---------------------------------------------------------------------------
# Authentication & User Schemas
# ---------------------------------------------------------------------------
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, description="نام کاربری (حروف انگلیسی)")
    full_name: Optional[str] = Field(None, max_length=128, description="نام و نام خانوادگی")
    mobile: Optional[str] = Field(None, pattern=r"^09\d{9}$", description="شماره موبایل (مثال: 09123456789)")


class SupportSignupRequest(UserBase):
    """
    Support users can sign up using simple Username/Password.
    NO OTP required for their signup (frictionless entry).
    """
    password: str = Field(..., min_length=6, description="رمز عبور (حروف انگلیسی و ارقام)")


class UserLoginRequest(BaseModel):
    """
    Universal login schema for ADMIN, SUPPORT, and DRIVER.
    Enforces English characters and includes optional Captcha validation.
    """
    username: str = Field(..., description="نام کاربری (انگلیسی)")
    password: str = Field(..., description="رمز عبور (انگلیسی)")
    captcha_id: Optional[str] = Field(None, description="شناسه یکتای کپچا")
    captcha_code: Optional[str] = Field(None, description="کد امنیتی کپچا")


class CaptchaResponse(BaseModel):
    captcha_id: str
    captcha_text: str
    expires_in_seconds: int = 120


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    role: UserRole
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    is_active: bool
    subscription_end_date: Optional[datetime] = None
    subscription_days_left: Optional[float] = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: str  # user id as str
    username: str
    role: str
    exp: int


class SubscriptionRenewRequest(BaseModel):
    months: int = Field(1, ge=1, le=12, description="تعداد ماه‌های تمدید اشتراک")


class SubscriptionStatusResponse(BaseModel):
    subscription_end_date: Optional[datetime]
    days_left: float
    status: SubscriptionStatusEnum
    warning_header: Optional[str] = None


# ---------------------------------------------------------------------------
# Driver Management Schemas (Created and Managed by Support)
# ---------------------------------------------------------------------------
class DriverProfileCreate(BaseModel):
    national_code: str = Field(..., min_length=10, max_length=10, description="کد ملی ۱۰ رقمی راننده")
    smart_card_number: str = Field(..., min_length=5, max_length=32, description="شماره کارت هوشمند راننده")
    license_number: str = Field(..., min_length=5, max_length=32, description="شماره گواهینامه رانندگی")

    # Iran Plate fields: 12 ع 345 ایران 77
    plate_part1: str = Field(..., min_length=2, max_length=2, description="دو رقم اول پلاک")
    plate_letter: str = Field(..., max_length=10, description="حرف پلاک (مانند ع یا ب)")
    plate_part2: str = Field(..., min_length=3, max_length=3, description="سه رقم پلاک")
    plate_province: str = Field(..., min_length=2, max_length=2, description="کد استان ایران (مثلا 77)")

    vehicle_type: str = Field(..., description="نوع ناوگان (وانت نیسان، ایسوزو، خاور و ...)")
    tonnage_kg: int = Field(3800, ge=500, le=50000, description="ظرفیت تناژ بر حسب کیلوگرم")


class DriverAccountCreateBySupport(BaseModel):
    """
    Payload when a SUPPORT user creates a new DRIVER user with credentials.
    Automatically assigns this driver to the creating SUPPORT user.
    """
    username: str = Field(..., min_length=3, max_length=64, description="نام کاربری راننده")
    password: str = Field(..., min_length=6, description="رمز عبور اولیه راننده")
    full_name: str = Field(..., max_length=128, description="نام و نام خانوادگی راننده")
    mobile: str = Field(..., pattern=r"^09\d{9}$", description="موبایل راننده جهت دریافت پیامک‌های شهرداری")
    profile: DriverProfileCreate


class DriverProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    national_code: str
    smart_card_number: str
    license_number: str
    plate_part1: str
    plate_letter: str
    plate_part2: str
    plate_province: str
    vehicle_type: str
    tonnage_kg: int
    active_trip_status: str
    fuel_quota_liters: int
    # Biweekly Stage Statistics (Jalali 15-day Split)
    stage1_count: int = Field(0, description="تعداد ثبت بارنامه در مرحله اول (۸ تا ۲۲ ماه جاری)")
    stage2_count: int = Field(0, description="تعداد ثبت بارنامه در مرحله دوم (۲۳ ماه جاری تا ۷ ماه بعد)")
    quota_limit: int = Field(15, description="سقف مجاز باربرگ دوره")


class DriverDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: Optional[str]
    mobile: Optional[str]
    role: UserRole
    is_active: bool
    driver_profile: Optional[DriverProfileResponse] = None
    stage1_count: int = Field(0, description="تعداد بارنامه مرحله اول (۸ تا ۲۳)")
    stage2_count: int = Field(0, description="تعداد بارنامه مرحله دوم (۲۳ تا ۸)")


# ---------------------------------------------------------------------------
# Jalali Biweekly Stage Statistics Schemas
# ---------------------------------------------------------------------------
class StagePeriodInfo(BaseModel):
    title: str = Field(..., description="عنوان مرحله (مثال: مرحله اول (۸ تا ۲۳))")
    jalali_range: str = Field(..., description="بازه تاریخ جلالی")
    start_iso: str = Field(..., description="تاریخ شروع دقیق (ISO)")
    end_iso: str = Field(..., description="تاریخ پایان دقیق (ISO)")


class PlateWaybillStageStats(BaseModel):
    """
    Split 15-day Waybill Statistics based on the Persian (Jalali) Calendar.
    Stage 1: 8th day (00:00:00) to 22nd day (23:59:59) of current Jalali month.
    Stage 2: 23rd day (00:00:00) of current to 7th day (23:59:59) of next Jalali month.
    """
    vehicle_id: str
    plate_number: str
    stage1_count: int = Field(0, description="تعداد بارنامه‌های مرحله اول (۸ تا ۲۳)")
    stage2_count: int = Field(0, description="تعداد بارنامه‌های مرحله دوم (۲۳ تا ۸)")
    active_stage: int = Field(1, description="مرحله فعال فعلی (۱ یا ۲)")
    quota_limit: int = Field(15, description="سقف مجاز ثبت دوره")


class FleetPlateStatsResponse(BaseModel):
    jalali_month: str = Field(..., description="نام ماه جاری جلالی")
    active_stage: int = Field(..., description="مرحله جاری (۱ یا ۲)")
    stage1_period: StagePeriodInfo
    stage2_period: StagePeriodInfo
    plates: List[PlateWaybillStageStats] = []



# ---------------------------------------------------------------------------
# Multi-Tenant OTP Routing Schemas
# ---------------------------------------------------------------------------
class OtpTriggerRequest(BaseModel):
    driver_id: uuid.UUID
    service_name: str = Field("WAYBILL_ISSUANCE", description="عنوان خدمت سپاد/شهرداری")


class OtpVerifyRequest(BaseModel):
    otp_request_id: uuid.UUID
    otp_code: str = Field(..., min_length=4, max_length=10, description="کد پیامک‌شده از شهرداری")


class DriverDirectOtpInputRequest(BaseModel):
    """Payload for DRIVER's restricted 2FA/OTP input endpoint."""
    otp_code: str = Field(..., min_length=4, max_length=10, description="کد دوعاملی دریافتی راننده")
    otp_request_id: Optional[uuid.UUID] = None


class OtpRoutingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    support_id: uuid.UUID
    driver_id: uuid.UUID
    service_name: str
    status: OtpStatus
    trace_code: Optional[str] = None
    expires_at: datetime
    created_at: datetime
    driver_name: Optional[str] = None
    driver_mobile: Optional[str] = None


# ---------------------------------------------------------------------------
# Admin Client/Support Panel Registration Schema
# ---------------------------------------------------------------------------
ALLOWED_PLATE_CAPACITIES = (50, 150, 350, 550, 700)


class CreateSupportUserRequest(BaseModel):
    """
    Schema for ADMIN creating a new Client (SUPPORT role) panel
    after purchasing a subscription.
    Enforces strict English letters, numbers, and underscores for username and password.
    """
    full_name: str = Field(..., min_length=2, max_length=128, description="نام و نام خانوادگی مشتری")
    phone_number: str = Field(..., min_length=10, max_length=20, description="شماره تماس مشتری")
    national_id: Optional[str] = Field(None, max_length=10, description="کد ملی مشتری")
    address: Optional[str] = Field(None, max_length=500, description="آدرس مشتری")
    province_city: Optional[str] = Field(None, max_length=128, description="استان و شهر")
    plate_capacity: int = Field(..., description="ظرفیت پلاک (تنها ۵۰، ۱۵۰، ۳۵۰، ۵۵۰، ۷۰۰ مجاز است)")
    username: str = Field(..., min_length=3, max_length=64, description="نام کاربری (صرفاً حروف انگلیسی و ارقام)")
    password: str = Field(..., min_length=4, max_length=128, description="رمز عبور (صرفاً حروف انگلیسی و ارقام)")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[a-zA-Z0-9_]+$", clean):
            raise ValueError("نام کاربری صرفاً باید شامل حروف انگلیسی، اعداد و زیرخط (_) باشد.")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[a-zA-Z0-9_]+$", clean):
            raise ValueError("رمز عبور صرفاً باید شامل حروف انگلیسی، اعداد و زیرخط (_) باشد.")
        return clean

    @field_validator("plate_capacity")
    @classmethod
    def validate_capacity(cls, v: int) -> int:
        if v not in ALLOWED_PLATE_CAPACITIES:
            raise ValueError(f"ظرفیت پلاک باید یکی از مقادیر {ALLOWED_PLATE_CAPACITIES} باشد.")
        return v

    @property
    def is_valid_capacity(self) -> bool:
        return self.plate_capacity in ALLOWED_PLATE_CAPACITIES


class UpdateCapacityRequest(BaseModel):
    """
    Schema for ADMIN modifying the plate capacity of a Support user.
    """
    new_capacity: int = Field(..., description="ظرفیت پلاک جدید (۵۰، ۱۵۰، ۳۵۰، ۵۵۰، ۷۰۰)")

    @field_validator("new_capacity")
    @classmethod
    def validate_capacity(cls, v: int) -> int:
        if v not in ALLOWED_PLATE_CAPACITIES:
            raise ValueError(f"ظرفیت باید یکی از مقادیر {ALLOWED_PLATE_CAPACITIES} باشد.")
        return v


class CreateSupportUserResponse(BaseModel):
    status: str = Field(default="success", description="وضعیت عملیات")
    message: str = Field(..., description="پیام نتیجه")
    user_id: str = Field(..., description="شناسه کاربر ایجاد شده")
    username: str = Field(..., description="نام کاربری اختصاص‌یافته")
    role: str = Field(default="SUPPORT", description="سطح دسترسی ایجاد شده")
    plate_capacity: int = Field(..., description="سقف ظرفیت پلاک اختصاص‌یافته")
    subscription_start_date: Optional[str] = Field(None, description="تاریخ شروع اشتراک")
    subscription_end_date: Optional[str] = Field(None, description="تاریخ پایان اشتراک (دوره ۱ ماهه جلالی)")
    is_payment_approved: bool = Field(default=True, description="وضعیت تایید پرداخت")
    national_id: Optional[str] = None
    address: Optional[str] = None
    province_city: Optional[str] = None


# ---------------------------------------------------------------------------
# Strict Multi-Tenant Operational Schemas (Plates, Drivers, Uploads, Stats)
# ---------------------------------------------------------------------------
class PlateCreate(BaseModel):
    plate_number: str = Field(..., description="شماره پلاک ایران (مثال: 43ع789-77)")
    plate_part1: str = Field("43", max_length=2)
    plate_letter: str = Field("ع", max_length=10)
    plate_part2: str = Field("789", max_length=3)
    plate_province: str = Field("77", max_length=2)
    vehicle_type: str = Field("وانت نیسان", description="نوع ناوگان")
    smart_card_number: Optional[str] = None


class PlateUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    smart_card_number: Optional[str] = None
    is_active: Optional[bool] = None


class PlateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    plate_number: str
    plate_part1: str
    plate_letter: str
    plate_part2: str
    plate_province: str
    vehicle_type: str
    smart_card_number: Optional[str] = None
    is_active: bool
    created_at: datetime


class ExcelUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    file_name: str
    total_rows: int
    processed_rows: int
    successful_rows: int
    failed_rows: int
    status: str
    error_log: Optional[str] = None
    created_at: datetime


class DashboardStatsResponse(BaseModel):
    total_plates: int
    active_drivers: int
    issued_waybills: int
    total_excel_uploads: int
    owner_id: Optional[str] = None
    role: str


