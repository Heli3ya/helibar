# Proxy import to backend.models
from backend.models import (
    Base,
    User,
    UserRole,
    DriverProfile,
    SupportDriverAssignment,
    DriverOtpRequest,
    OtpStatus,
    SubscriptionStatusEnum,
    Waybill,
    WaybillStatus,
    Plate,
    Driver,
    ExcelUpload,
)

__all__ = [
    "Base",
    "User",
    "UserRole",
    "DriverProfile",
    "SupportDriverAssignment",
    "DriverOtpRequest",
    "OtpStatus",
    "SubscriptionStatusEnum",
    "Waybill",
    "WaybillStatus",
    "Plate",
    "Driver",
    "ExcelUpload",
]

