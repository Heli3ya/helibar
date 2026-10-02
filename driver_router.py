# Proxy import to backend.driver_router
from backend.driver_router import (
    router,
    DriverAddSimplifiedRequest,
    DriverSubmitOtpRequest,
    TriggerWaybillOtpRequest,
    ExcelImportSummaryResponse,
    ExcelImportRowResult,
    parse_excel_two_columns,
    validate_and_parse_strict_two_columns,
    get_excel_template,
    bulk_upload_drivers,
)

__all__ = [
    "router",
    "DriverAddSimplifiedRequest",
    "DriverSubmitOtpRequest",
    "TriggerWaybillOtpRequest",
    "ExcelImportSummaryResponse",
    "ExcelImportRowResult",
    "parse_excel_two_columns",
    "validate_and_parse_strict_two_columns",
    "get_excel_template",
    "bulk_upload_drivers",
]
