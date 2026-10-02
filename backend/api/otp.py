"""
Urban Bill of Lading (سامانه بارنامه شهری) - OTP Routing API Router
Provides endpoints for:
1. Triggering SMS OTP for a driver (Restricted to assigned Support).
2. Fetching pending/routed OTPs for the logged-in Support operator (Isolated).
3. Verifying the received OTP code on behalf of the Driver.
4. Restricted Driver personal dashboard view.
"""

from typing import List
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, UserRole
from backend.schemas import (
    OtpTriggerRequest,
    OtpVerifyRequest,
    OtpRoutingResponse,
)
from backend.services import OtpRoutingService
from backend.api.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/otp", tags=["Multi-Tenant OTP Routing"])


@router.post(
    "/trigger",
    response_model=OtpRoutingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="ارسال پیامک کد دوعاملی سپاد/شهرداری برای راننده تخصیص‌یافته",
)
def trigger_driver_otp(
    payload: OtpTriggerRequest,
    current_user: User = Depends(require_roles(UserRole.SUPPORT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Support operator requests a municipal 2FA SMS OTP on behalf of their assigned driver.
    Multi-tenant check prevents triggering for drivers belonging to other support operators.
    """
    otp_record = OtpRoutingService.trigger_driver_otp(
        db=db,
        support_user=current_user,
        driver_id=payload.driver_id,
        service_name=payload.service_name,
    )
    driver = db.get(User, otp_record.driver_id)
    return OtpRoutingResponse(
        id=otp_record.id,
        support_id=otp_record.support_id,
        driver_id=otp_record.driver_id,
        service_name=otp_record.service_name,
        status=otp_record.status,
        trace_code=otp_record.trace_code,
        expires_at=otp_record.expires_at,
        created_at=otp_record.created_at,
        driver_name=driver.full_name if driver else "نامشخص",
        driver_mobile=driver.mobile if driver else None,
    )


@router.get(
    "/pending",
    response_model=List[OtpRoutingResponse],
    summary="دریافت کدهای دوعاملی منتظر تأیید هدایت‌شده به پشتیبان جاری",
)
def get_routed_otps_for_support(
    current_user: User = Depends(require_roles(UserRole.SUPPORT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Returns only the OTP requests assigned to the logged-in Support operator.
    Guarantees strict data isolation between Support accounts.
    """
    return OtpRoutingService.get_support_pending_otps(db=db, support_user=current_user)


@router.post(
    "/verify",
    response_model=OtpRoutingResponse,
    summary="تأیید و ثبت کد دوعاملی توسط پشتیبان (بدون نیاز به دخالت راننده)",
)
def verify_driver_otp(
    payload: OtpVerifyRequest,
    current_user: User = Depends(require_roles(UserRole.SUPPORT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    The support user verifies the OTP code. Only the support operator who owns this
    driver's session can complete this action.
    """
    verified = OtpRoutingService.verify_driver_otp(
        db=db,
        support_user=current_user,
        otp_request_id=payload.otp_request_id,
        otp_code=payload.otp_code,
    )
    driver = db.get(User, verified.driver_id)
    return OtpRoutingResponse(
        id=verified.id,
        support_id=verified.support_id,
        driver_id=verified.driver_id,
        service_name=verified.service_name,
        status=verified.status,
        trace_code=verified.trace_code,
        expires_at=verified.expires_at,
        created_at=verified.created_at,
        driver_name=driver.full_name if driver else "نامشخص",
        driver_mobile=driver.mobile if driver else None,
    )


@router.get(
    "/driver/dashboard",
    summary="داشبورد بسیار فشرده و اختصاصی راننده (فقط‌خواندنی)",
)
def get_driver_dashboard(
    current_user: User = Depends(require_roles(UserRole.DRIVER)),
    db: Session = Depends(get_db),
):
    """
    Extremely restricted view for logged-in Drivers.
    Displays their profile, plate, assigned support operator, and latest OTP status.
    """
    return OtpRoutingService.get_driver_personal_view(db=db, driver_user=current_user)
