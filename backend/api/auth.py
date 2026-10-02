"""
Urban Bill of Lading (سامانه بارنامه شهری) - Authentication Endpoints
Delegates and extends authentication, driver creation, and multi-tenant assignment.
"""

from typing import List, Annotated, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.database import get_db
from backend.models import User, UserRole, DriverProfile, SupportDriverAssignment
from backend.schemas import (
    SupportSignupRequest,
    UserLoginRequest,
    UserResponse,
    Token,
    DriverAccountCreateBySupport,
    DriverDetailResponse,
)
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    validate_credentials_regex,
    captcha_manager,
)
from backend.dependencies import (
    get_current_user,
    require_roles,
    require_support_or_admin,
    require_admin,
    check_subscription_status,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])


# ---------------------------------------------------------------------------
# 1. Current User Profile (/api/auth/me)
# ---------------------------------------------------------------------------
@router.get("/me", response_model=UserResponse, summary="دریافت اطلاعات کاربر جاری")
def get_me(
    current_user: User = Depends(get_current_user),
    _: User = Depends(check_subscription_status),
):
    """Returns the authenticated user profile along with role and subscription status."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        full_name=current_user.full_name,
        mobile=current_user.mobile,
        is_active=current_user.is_active,
        subscription_end_date=current_user.subscription_end_date,
        subscription_days_left=current_user.subscription_days_left if current_user.role == UserRole.SUPPORT else None,
        created_at=current_user.created_at,
    )


# ---------------------------------------------------------------------------
# 2. Driver Provisioning by SUPPORT (Strict Isolation & Multi-Tenancy)
# ---------------------------------------------------------------------------
@router.post(
    "/drivers",
    response_model=DriverDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="ایجاد حساب راننده توسط پشتیبان و انتساب خودکار",
)
def create_driver_by_support(
    data: DriverAccountCreateBySupport,
    current_user: User = Depends(require_support_or_admin),
    _: User = Depends(check_subscription_status),
    db: Session = Depends(get_db),
):
    """
    Drivers do NOT self-register; SUPPORT operators create their accounts.
    Automatically assigns the new driver to the current SUPPORT operator for isolation.
    """
    validate_credentials_regex(data.username, data.password)

    # Check duplicate username
    if db.execute(select(User).where(User.username == data.username.strip())).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="این نام کاربری برای راننده قبلاً ثبت شده است.",
        )

    # Check duplicate national code
    if db.execute(
        select(DriverProfile).where(DriverProfile.national_code == data.profile.national_code.strip())
    ).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="راننده‌ای با این کد ملی قبلاً در سامانه ثبت شده است.",
        )

    # Create DRIVER User
    driver_user = User(
        username=data.username.strip(),
        password_hash=get_password_hash(data.password),
        role=UserRole.DRIVER,
        full_name=data.full_name,
        mobile=data.mobile,
        is_active=True,
    )
    db.add(driver_user)
    db.flush()

    # Create DriverProfile
    profile = DriverProfile(
        user_id=driver_user.id,
        national_code=data.profile.national_code.strip(),
        smart_card_number=data.profile.smart_card_number.strip(),
        license_number=data.profile.license_number.strip(),
        plate_part1=data.profile.plate_part1.strip(),
        plate_letter=data.profile.plate_letter.strip(),
        plate_part2=data.profile.plate_part2.strip(),
        plate_province=data.profile.plate_province.strip(),
        vehicle_type=data.profile.vehicle_type,
        tonnage_kg=data.profile.tonnage_kg,
        active_trip_status="IDLE",
        fuel_quota_liters=600,
    )
    db.add(profile)

    # Link assignment to support operator
    assignment = SupportDriverAssignment(
        support_id=current_user.id,
        driver_id=driver_user.id,
        is_active=True,
    )
    db.add(assignment)

    db.commit()
    db.refresh(driver_user)

    return DriverDetailResponse.model_validate(driver_user)


# ---------------------------------------------------------------------------
# 3. List Assigned Drivers for Current Support User
# ---------------------------------------------------------------------------
@router.get(
    "/my-drivers",
    response_model=List[DriverDetailResponse],
    summary="لیست رانندگان منتسب به پشتیبان جاری (ایزولاسیون داده‌ای)",
)
def get_my_drivers(
    current_user: User = Depends(require_support_or_admin),
    _: User = Depends(check_subscription_status),
    db: Session = Depends(get_db),
):
    """
    Returns only the drivers assigned to the logged-in Support operator.
    Admins see all drivers across all operators.
    """
    if current_user.role == UserRole.ADMIN:
        drivers = db.execute(
            select(User).where(User.role == UserRole.DRIVER)
        ).scalars().all()
    else:
        stmt = (
            select(User)
            .join(SupportDriverAssignment, SupportDriverAssignment.driver_id == User.id)
            .where(
                SupportDriverAssignment.support_id == current_user.id,
                SupportDriverAssignment.is_active == True,
                User.role == UserRole.DRIVER,
            )
        )
        drivers = db.execute(stmt).scalars().all()

    return [DriverDetailResponse.model_validate(d) for d in drivers]
