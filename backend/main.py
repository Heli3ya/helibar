"""
helibar | هلی‌بار - Waybill & Fleet Management Platform
FastAPI Application Entry Point

Features:
1. Full Swagger UI (/docs) with Bearer Token Authentication.
2. RBAC Enforcement (ADMIN, SUPPORT, DRIVER).
3. Global Subscription Management Middleware (X-Sub-Warning headers & expired write-blocking).
4. Automated Startup Database Schema Initialization & User Seeding:
   - ADMIN:   Username 'heliya',       Password 'heliya84'
   - SUPPORT: Username 'Test Support', Password '09120000000' (1-month subscription cycle)
   - DRIVER:  Username '09124451092',  Password 'Driver@1404'
"""

from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
import os
import uuid
from typing import Dict, Any, List

from fastapi import FastAPI, Depends, Request, Response, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import init_db, get_db, SessionLocal
from backend.models import User, UserRole, Plate, Driver, Waybill, ExcelUpload
from backend.auth import router as core_auth_router, seed_initial_users
from backend.api.auth import router as api_auth_router
from backend.api.otp import router as otp_router
from backend.driver_router import router as driver_router
from routers.plates import router as plate_router
from routers.fuel import router as fuel_router
from backend.jalali_periods import add_jalali_month, format_jalali_date
from backend.security import get_password_hash
from backend.schemas import (
    CreateSupportUserRequest,
    CreateSupportUserResponse,
    UpdateCapacityRequest,
    DashboardStatsResponse,
    ALLOWED_PLATE_CAPACITIES,
)
from backend.dependencies import (
    SubscriptionMiddleware,
    get_current_user,
    require_admin,
    require_support_or_admin,
    require_settings_access,
    check_subscription_status,
    get_isolated_tenant,
    IsolatedTenantContext,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database tables and seeds initial users upon startup."""
    init_db()
    db = SessionLocal()
    try:
        seed_initial_users(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="helibar - سامانه مدیریت بارنامه و ناوگان",
    description="""
### سامانه جامع صدور بارنامه، مدیریت ناوگان و احراز هویت دوعاملی سپاد (UTCMS)

#### سطوح دسترسی (RBAC):
- **ADMIN**: دسترسی کامل به تمامی ماژول‌ها و تنظیمات سیستمی (کاربر اولیه: `heliya` / رمز: `heliya84`).
- **SUPPORT**: دسترسی به ماژول‌های عملیاتی بجز بخش تنظیمات؛ دارای چرخه اشتراک ۱ ماهه (کاربر آزمایشی: `Test Support` / رمز: `09120000000`).
- **DRIVER**: دسترسی کاملاً محدود به ثبت کد دوعاملی (ورود پیامک ۲FA).

#### آزمون احراز هویت در Swagger UI:
روی دکمه سبز **Authorize** در بالای صفحه کلیک کنید و نام کاربری و رمز عبور را وارد نمایید.
""",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
    },
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middlewares
# ---------------------------------------------------------------------------
# Global Subscription Middleware (Warning headers & write blocking on expired)
app.add_middleware(SubscriptionMiddleware)

# Cross-Origin Resource Sharing (CORS) with exposed warning headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Sub-Warning", "X-Days-Left", "Authorization"],
)

# ---------------------------------------------------------------------------
# Routers Registration
# ---------------------------------------------------------------------------
# Core Auth Router provides /token, /captcha, /login, and /subscription endpoints
app.include_router(core_auth_router)
app.include_router(api_auth_router)
app.include_router(otp_router)
app.include_router(driver_router)
app.include_router(plate_router)
app.include_router(fuel_router)


# ---------------------------------------------------------------------------
# Health & Status
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "helibar | هلی‌بار Backend",
        "version": "1.0.0",
        "rbac_roles": ["ADMIN", "SUPPORT", "DRIVER"],
        "subscription_cycle": "1_MONTH",
    }


# ---------------------------------------------------------------------------
# Strict Multi-Tenant Isolated Dashboard Stats (Anti-IDOR)
# ---------------------------------------------------------------------------
@app.get(
    "/api/dashboard-stats",
    tags=["Dashboard & Statistics"],
    summary="آمار تفکیک‌شده داشبورد با ایزولاسیون چندمستأجری (Anti-IDOR)",
    response_model=DashboardStatsResponse,
)
def get_dashboard_stats(
    tenant: IsolatedTenantContext = Depends(get_isolated_tenant),
):
    """
    URL-less isolated dashboard stats.
    The backend extracts the user from Authorization: Bearer <token>.
    - For SUPPORT users: Automatically and strictly filters .filter(Model.owner_id == current_user.id)
    - For ADMIN users ('heliya'): Dynamically bypasses owner_id filter to show platform-wide aggregates.
    """
    total_plates = tenant.query(Plate).filter(Plate.is_active == True).count()
    active_drivers = tenant.query(Driver).filter(Driver.is_active == True).count()
    issued_waybills = tenant.query(Waybill).count()
    total_excel_uploads = tenant.query(ExcelUpload).count()

    return DashboardStatsResponse(
        total_plates=total_plates,
        active_drivers=active_drivers,
        issued_waybills=issued_waybills,
        total_excel_uploads=total_excel_uploads,
        owner_id=str(tenant.user.id) if not tenant.is_admin else "ALL_TENANTS (ADMIN_BYPASS)",
        role=tenant.user.role.value if hasattr(tenant.user.role, "value") else str(tenant.user.role),
    )



# ---------------------------------------------------------------------------
# Operational Modules Demonstration (Accessible by SUPPORT & ADMIN)
# ---------------------------------------------------------------------------
@app.get(
    "/api/operations/waybills",
    tags=["Operational Modules"],
    summary="دریافت باربرگ‌های روزانه (دسترسی SUPPORT و ADMIN)",
)
def list_waybills(
    current_user: User = Depends(require_support_or_admin),
    _: User = Depends(check_subscription_status),
):
    """Operational endpoint accessible by SUPPORT and ADMIN. Blocked for DRIVER."""
    return {
        "message": "Operational waybills data retrieved successfully.",
        "user": current_user.username,
        "role": current_user.role.value,
        "count": 42,
    }


@app.post(
    "/api/operations/waybills/issue",
    tags=["Operational Modules"],
    summary="ثبت باربرگ جدید (مسدودسازی خودکار در صورت انقضای اشتراک)",
)
def issue_waybill(
    current_user: User = Depends(require_support_or_admin),
    _: User = Depends(check_subscription_status),
):
    """
    Non-GET operation.
    If the Support account subscription is expired (days_left <= 0),
    the request is automatically rejected with HTTP 403 Forbidden 'SUBSCRIPTION_EXPIRED'.
    """
    return {
        "status": "ISSUED",
        "tracking_code": "UTCMS-140307-889104",
        "issued_by": current_user.username,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Settings Module (Restricted strictly to ADMIN - SUPPORT is blocked)
# ---------------------------------------------------------------------------
@app.get(
    "/api/settings/system",
    tags=["Settings (ADMIN Only)"],
    summary="مشاهده تنظیمات سیستمی (فقط ادمین - عدم دسترسی پشتیبان)",
)
def get_system_settings(
    current_user: User = Depends(require_settings_access),
):
    """
    Settings module:
    - ADMIN: Granted full access.
    - SUPPORT: HTTP 403 Forbidden ('SUPPORT users are restricted from accessing system settings').
    - DRIVER: HTTP 403 Forbidden.
    """
    return {
        "sipaad_endpoint": "https://utcms.ir/ws/v2/itmb",
        "auto_issuance_enabled": True,
        "jwt_expiry_minutes": 10080,
        "support_quota_limit": 50,
        "modified_by": current_user.username,
    }


# ---------------------------------------------------------------------------
# Billing & Subscription Renewal (Exempt from write-blocking lock)
# ---------------------------------------------------------------------------
@app.post(
    "/api/billing/renew",
    tags=["Billing & Subscriptions"],
    summary="تمدید دوره اشتراک پشتیبان (مسیر استثنا در زمان انقضا)",
)
def billing_renew(
    months: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Renews the subscription in 1-month cycles (30 days per month).
    Exempt from write-blocking lock so an expired account can always renew.
    """
    base_date = current_user.subscription_end_date or datetime.utcnow()
    if base_date < datetime.utcnow():
        base_date = datetime.utcnow()

    new_end_date = base_date + timedelta(days=30 * months)
    current_user.subscription_end_date = new_end_date
    db.commit()
    db.refresh(current_user)

    return {
        "message": f"اشتراک با موفقیت به مدت {months} ماه تمدید گردید.",
        "username": current_user.username,
        "subscription_end_date": new_end_date.isoformat(),
        "days_left": current_user.subscription_days_left,
    }


# ---------------------------------------------------------------------------
# Admin Subscription Approval Endpoint
# ---------------------------------------------------------------------------
@app.post(
    "/api/admin/users/{user_id}/approve-payment",
    tags=["Admin Subscription Management"],
    summary="تأیید پرداخت کاربر پشتیبان و تمدید اشتراک به مدت ۱ ماه جلالی (مخصوص ادمین)",
)
def admin_approve_payment(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Sets is_payment_approved = True and extends subscription_end_date
    by exactly 1 Jalali month based on the previous end date.
    Only ADMIN can call this.
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="شناسه کاربر نامعتبر است (UUID معتبر الزامی است).",
        )

    target_user = db.get(User, user_uuid)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="کاربر مورد نظر یافت نشد.",
        )

    today = date.today()
    # Calculate base date from previous subscription_end_date
    base_date = target_user.subscription_end_date
    if base_date is not None:
        if isinstance(base_date, datetime):
            base_date = base_date.date()
        # If expired in the past, renew from today
        if base_date < today:
            base_date = today
    else:
        base_date = today

    new_end_date = add_jalali_month(base_date)

    if not target_user.subscription_start_date:
        target_user.subscription_start_date = today

    target_user.subscription_end_date = new_end_date
    target_user.is_payment_approved = True

    db.commit()
    db.refresh(target_user)

    return {
        "status": "success",
        "message": "پرداخت با موفقیت تأیید شد و اشتراک کاربر به مدت ۱ ماه تمدید گردید.",
        "user_id": str(target_user.id),
        "username": target_user.username,
        "is_payment_approved": target_user.is_payment_approved,
        "subscription_start_date": target_user.subscription_start_date.isoformat() if target_user.subscription_start_date else None,
        "subscription_end_date": target_user.subscription_end_date.isoformat(),
        "jalali_end_date": format_jalali_date(target_user.subscription_end_date),
        "days_left": target_user.subscription_days_left,
        "approved_by": current_admin.username,
    }


# ---------------------------------------------------------------------------
# Admin Create Support / Client Panel Endpoint
# ---------------------------------------------------------------------------
@app.post(
    "/api/admin/users/create-support",
    tags=["Admin User Management"],
    summary="ایجاد پنل کاربر پشتیبان جدید پس از خرید اشتراک (مخصوص ادمین)",
    response_model=CreateSupportUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_support_user(
    payload: CreateSupportUserRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Creates a new Client (SUPPORT role) user account after subscription purchase:
    - Stores manual username and securely hashes manual password
    - Stores national_id, address, and province_city
    - Strictly validates English-only username & password via Pydantic
    - Sets plate_capacity strictly validated to [50, 150, 350, 550, 700]
    """
    if payload.plate_capacity not in ALLOWED_PLATE_CAPACITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ظرفیت پلاک نامعتبر است. تنها مقادیر {list(ALLOWED_PLATE_CAPACITIES)} مجاز هستند.",
        )

    clean_name = payload.full_name.strip()
    clean_phone = payload.phone_number.strip()
    clean_username = payload.username.strip()

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="نام و نام خانوادگی الزامی است.",
        )

    # Check for existing username or phone
    existing_user = db.execute(
        select(User).where((User.username == clean_username) | (User.mobile == clean_phone))
    ).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"کاربری با نام کاربری «{clean_username}» یا شماره تلفن «{clean_phone}» قبلاً در سامانه ثبت شده است.",
        )

    # Calculate Jalali dates (with jdatetime if available)
    today = date.today()
    sub_start = today
    sub_end = add_jalali_month(today)

    new_user = User(
        id=uuid.uuid4(),
        username=clean_username,
        full_name=clean_name,
        mobile=clean_phone,
        password_hash=get_password_hash(payload.password),
        role=UserRole.SUPPORT,
        plate_capacity=payload.plate_capacity,
        national_id=payload.national_id.strip() if payload.national_id else None,
        address=payload.address.strip() if payload.address else None,
        province_city=payload.province_city.strip() if payload.province_city else None,
        is_active=True,
        subscription_start_date=sub_start,
        subscription_end_date=sub_end,
        is_payment_approved=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return CreateSupportUserResponse(
        status="success",
        message=f"پنل کاربر «{new_user.full_name}» با نام کاربری «{new_user.username}» و ظرفیت {new_user.plate_capacity} پلاک ایجاد شد.",
        user_id=str(new_user.id),
        username=new_user.username,
        role=new_user.role.value,
        plate_capacity=new_user.plate_capacity,
        national_id=new_user.national_id,
        address=new_user.address,
        province_city=new_user.province_city,
        subscription_start_date=new_user.subscription_start_date.isoformat() if new_user.subscription_start_date else None,
        subscription_end_date=new_user.subscription_end_date.isoformat() if new_user.subscription_end_date else None,
        is_payment_approved=new_user.is_payment_approved,
    )


# ---------------------------------------------------------------------------
# Admin Edit Plate Capacity Endpoint: PATCH /api/admin/users/{user_id}/capacity
# ---------------------------------------------------------------------------
@app.patch(
    "/api/admin/users/{user_id}/capacity",
    tags=["Admin User Management"],
    summary="ویرایش سقف ظرفیت پلاک مشتری توسط ادمین",
)
def edit_user_plate_capacity(
    user_id: str,
    payload: UpdateCapacityRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Endpoint strictly for the ADMIN role.
    Accepts payload: {"new_capacity": int} (must be one of 50, 150, 350, 550, 700).
    Updates the plate_capacity column for the specified user and returns the updated record.
    """
    if payload.new_capacity not in ALLOWED_PLATE_CAPACITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ظرفیت نامعتبر است. تنها مقادیر {list(ALLOWED_PLATE_CAPACITIES)} مجاز هستند.",
        )

    try:
        parsed_id = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="شناسه کاربر نامعتبر است.",
        )

    target_user = db.get(User, parsed_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="کاربر مورد نظر یافت نشد.",
        )

    target_user.plate_capacity = payload.new_capacity
    db.commit()
    db.refresh(target_user)

    return {
        "status": "success",
        "message": f"ظرفیت پلاک کاربر «{target_user.full_name or target_user.username}» به {target_user.plate_capacity} پلاک ارتقا یافت.",
        "user_id": str(target_user.id),
        "username": target_user.username,
        "full_name": target_user.full_name,
        "plate_capacity": target_user.plate_capacity,
        "updated_by": current_admin.username,
    }


# ---------------------------------------------------------------------------
# Admin User List & Delete Endpoints
# ---------------------------------------------------------------------------
@app.get(
    "/api/admin/users/supports",
    tags=["Admin User Management"],
    summary="دریافت لیست تمام کاربران و نقش‌های سامانه توسط ادمین",
)
def list_system_users_for_admin(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Returns all operational users (SUPPORT and DRIVER) for admin monitoring.
    Includes their assigned role, national ID, plate capacity, and active status.
    """
    users = db.execute(
        select(User).where(User.username != "heliya").order_by(User.created_at.desc())
    ).scalars().all()

    return {
        "supports": [
            {
                "id": str(u.id),
                "username": u.username,
                "full_name": u.full_name or u.username,
                "mobile": u.mobile,
                "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                "plate_capacity": getattr(u, "plate_capacity", 50),
                "national_id": getattr(u, "national_id", None) or "",
                "address": getattr(u, "address", None) or "",
                "province_city": getattr(u, "province_city", None) or "",
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }


@app.delete(
    "/api/admin/users/{user_id}",
    tags=["Admin User Management"],
    summary="حذف کامل حساب کاربری و پنل توسط ادمین کل",
)
def delete_user_account_by_admin(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Deletes a user account (SUPPORT or DRIVER).
    Prevents deletion of the Super Admin (heliya).
    """
    try:
        parsed_id = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="شناسه کاربر نامعتبر است.",
        )

    target_user = db.get(User, parsed_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="کاربر مورد نظر یافت نشد.",
        )

    if target_user.username == "heliya" or target_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="امکان حذف حساب کاربری مدیر کل سیستم (heliya) وجود ندارد.",
        )

    username = target_user.username
    full_name = target_user.full_name or username

    db.delete(target_user)
    db.commit()

    return {
        "status": "success",
        "message": f"حساب کاربری «{full_name}» ({username}) با موفقیت از سیستم حذف گردید.",
        "user_id": user_id,
        "deleted_by": current_admin.username,
    }


# ---------------------------------------------------------------------------
# Authenticated User Profile Endpoint: GET /api/users/me
# ---------------------------------------------------------------------------
@app.get(
    "/api/users/me",
    tags=["User Profile"],
    summary="دریافت مشخصات کاربر جاری و محاسبه دقیق روزهای باقی‌مانده اشتراک",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    In the /api/users/me endpoint, calculate days_left.
    The calculation MUST base the start date exactly on the created_at date
    generated when the Super Admin created this user.
    days_left = 30 - elapsed_days_since_creation.
    """
    now = datetime.utcnow()
    created_at = current_user.created_at or now
    elapsed_days_since_creation = (now - created_at).days
    days_left = max(0, 30 - elapsed_days_since_creation)

    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        "full_name": current_user.full_name or current_user.username,
        "mobile": current_user.mobile,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "days_left": days_left,
        "subscription_days_left": days_left,
        "plate_capacity": getattr(current_user, "plate_capacity", 50),
    }



