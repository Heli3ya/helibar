"""
Urban Bill of Lading (سامانه بارنامه شهری) - OTP & Fleet Service Layer
Implements Multi-Tenant OTP Routing and Data Isolation:
- Support user triggers external SMS OTP on behalf of an assigned Driver.
- Strict isolation: Support "A" can ONLY trigger/view/verify OTPs for drivers assigned to Support "A".
- The Driver does NOT need to enter OTP; the assigned Support user manages and verifies it.
- Automatic OTP expiry management (default 2 minutes) and trace logging.
"""

from datetime import datetime, timedelta
import random
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, desc
from fastapi import HTTPException, status

from backend.models import (
    User,
    UserRole,
    DriverProfile,
    SupportDriverAssignment,
    DriverOtpRequest,
    OtpStatus,
)
from backend.schemas import (
    OtpRoutingResponse,
    DriverDetailResponse,
)


class OtpRoutingService:
    @staticmethod
    def verify_driver_assignment(
        db: Session, support_user: User, driver_id: uuid.UUID
    ) -> User:
        """
        Validates that the given driver exists, has role DRIVER, and is actively
        assigned to the requesting SUPPORT user.
        ADMIN bypasses this check.
        """
        driver = db.get(User, driver_id)
        if not driver or driver.role != UserRole.DRIVER or not driver.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="راننده مورد نظر در سامانه یافت نشد یا غیرفعال است.",
            )

        if support_user.role == UserRole.ADMIN:
            return driver

        # Strict Multi-Tenant Isolation: Check SupportDriverAssignment
        assignment = db.execute(
            select(SupportDriverAssignment).where(
                and_(
                    SupportDriverAssignment.support_id == support_user.id,
                    SupportDriverAssignment.driver_id == driver_id,
                    SupportDriverAssignment.is_active == True,
                )
            )
        ).scalar_one_or_none()

        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="این راننده به حساب کاربری شما تخصیص داده نشده است و اجازه دسترسی به عملیات آن را ندارید.",
            )

        return driver

    @classmethod
    def trigger_driver_otp(
        cls,
        db: Session,
        support_user: User,
        driver_id: uuid.UUID,
        service_name: str = "WAYBILL_ISSUANCE",
    ) -> DriverOtpRequest:
        """
        Trigger an OTP request for a driver.
        Routes the OTP session explicitly to the initiating support_user.
        """
        driver = cls.verify_driver_assignment(db, support_user, driver_id)

        # Invalidate any previously pending OTP for this driver under this support user
        existing_pending = db.execute(
            select(DriverOtpRequest).where(
                and_(
                    DriverOtpRequest.support_id == support_user.id,
                    DriverOtpRequest.driver_id == driver_id,
                    DriverOtpRequest.status == OtpStatus.PENDING,
                )
            )
        ).scalars().all()

        for req in existing_pending:
            req.status = OtpStatus.EXPIRED

        # Generate mock/simulated municipal SMS trace code
        trace_code = f"UTCMS-{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=2)

        new_otp_request = DriverOtpRequest(
            support_id=support_user.id,
            driver_id=driver.id,
            service_name=service_name,
            status=OtpStatus.PENDING,
            trace_code=trace_code,
            expires_at=expires_at,
        )

        db.add(new_otp_request)
        db.commit()
        db.refresh(new_otp_request)

        return new_otp_request

    @classmethod
    def get_support_pending_otps(
        cls,
        db: Session,
        support_user: User,
        limit: int = 50,
    ) -> List[OtpRoutingResponse]:
        """
        Returns all active/pending OTP requests specifically routed to this support user.
        Guarantees that Support A NEVER sees OTPs belonging to Support B.
        """
        # Automatically mark expired ones
        now = datetime.utcnow()
        expired_items = db.execute(
            select(DriverOtpRequest).where(
                and_(
                    DriverOtpRequest.status == OtpStatus.PENDING,
                    DriverOtpRequest.expires_at < now,
                )
            )
        ).scalars().all()

        if expired_items:
            for item in expired_items:
                item.status = OtpStatus.EXPIRED
            db.commit()

        # Query isolated to support_user.id (or all if ADMIN)
        query = select(DriverOtpRequest).order_by(desc(DriverOtpRequest.created_at))
        if support_user.role != UserRole.ADMIN:
            query = query.where(DriverOtpRequest.support_id == support_user.id)

        otp_requests = db.execute(query.limit(limit)).scalars().all()

        results = []
        for req in otp_requests:
            # fetch driver info for display
            driver = db.get(User, req.driver_id)
            resp = OtpRoutingResponse(
                id=req.id,
                support_id=req.support_id,
                driver_id=req.driver_id,
                service_name=req.service_name,
                status=req.status,
                trace_code=req.trace_code,
                expires_at=req.expires_at,
                created_at=req.created_at,
                driver_name=driver.full_name if driver else "نامشخص",
                driver_mobile=driver.mobile if driver else None,
            )
            results.append(resp)

        return results

    @classmethod
    def verify_driver_otp(
        cls,
        db: Session,
        support_user: User,
        otp_request_id: uuid.UUID,
        otp_code: str,
    ) -> DriverOtpRequest:
        """
        The SUPPORT operator enters the OTP received by the driver or central municipal gateway.
        Guarantees that Support user can only verify OTP requests routed to them.
        """
        otp_req = db.get(DriverOtpRequest, otp_request_id)
        if not otp_req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="درخواست کد اعتبارسنجی یافت نشد.",
            )

        # Multi-Tenant Isolation Check
        if support_user.role != UserRole.ADMIN and otp_req.support_id != support_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="شما دسترسی مجاز به تایید این درخواست کد دوعاملی را ندارید.",
            )

        if otp_req.status == OtpStatus.VERIFIED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="این کد قبلاً با موفقیت تأیید شده است.",
            )

        if otp_req.expires_at < datetime.utcnow():
            otp_req.status = OtpStatus.EXPIRED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="مهلت زمانی ۲ دقیقه‌ای این کد به پایان رسیده است. لطفاً مجدداً کد ارسال کنید.",
            )

        # Check code validity (clean whitespace)
        cleaned_code = otp_code.strip()
        if len(cleaned_code) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="کد وارد شده نامعتبر است. حداقل باید ۴ رقم باشد.",
            )

        # Accept verification
        otp_req.otp_code = cleaned_code
        otp_req.status = OtpStatus.VERIFIED
        otp_req.verified_at = datetime.utcnow()
        db.commit()
        db.refresh(otp_req)

        return otp_req

    @classmethod
    def get_driver_personal_view(
        cls,
        db: Session,
        driver_user: User,
    ) -> dict:
        """
        Extremely restricted view for DRIVER accounts upon login:
        - Basic profile and freight vehicle details.
        - Latest OTP status (read-only; informed that their Support is handling it).
        - Assigned Support operator details so the driver knows who handles their file.
        """
        if driver_user.role != UserRole.DRIVER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="این بخش منحصراً متعلق به رانندگان است.",
            )

        profile = db.execute(
            select(DriverProfile).where(DriverProfile.user_id == driver_user.id)
        ).scalar_one_or_none()

        # Find assigned Support user
        assignment = db.execute(
            select(SupportDriverAssignment).where(
                and_(
                    SupportDriverAssignment.driver_id == driver_user.id,
                    SupportDriverAssignment.is_active == True,
                )
            )
        ).scalar_one_or_none()

        support_info = None
        if assignment:
            sup = db.get(User, assignment.support_id)
            if sup:
                support_info = {
                    "support_name": sup.full_name or sup.username,
                    "support_mobile": sup.mobile or "---",
                }

        # Latest OTP for this driver
        latest_otp = db.execute(
            select(DriverOtpRequest)
            .where(DriverOtpRequest.driver_id == driver_user.id)
            .order_by(desc(DriverOtpRequest.created_at))
        ).scalars().first()

        return {
            "driver_name": driver_user.full_name,
            "national_code": profile.national_code if profile else "---",
            "mobile": driver_user.mobile,
            "vehicle": {
                "plate": f"{profile.plate_part1} {profile.plate_letter} {profile.plate_part2} ایران {profile.plate_province}"
                if profile
                else "ثبت‌نشده",
                "vehicle_type": profile.vehicle_type if profile else "---",
                "tonnage_kg": profile.tonnage_kg if profile else 0,
                "fuel_quota_liters": profile.fuel_quota_liters if profile else 0,
                "active_trip_status": profile.active_trip_status if profile else "IDLE",
            },
            "assigned_support": support_info,
            "latest_otp_status": {
                "service_name": latest_otp.service_name if latest_otp else None,
                "status": latest_otp.status if latest_otp else None,
                "trace_code": latest_otp.trace_code if latest_otp else None,
                "expires_at": latest_otp.expires_at if latest_otp else None,
                "info_message": "کد تأیید به صورت خودکار توسط کارشناس پشتیبان شما در سامانه ثبت می‌گردد.",
            }
            if latest_otp
            else None,
        }
