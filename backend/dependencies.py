"""
helibar | هلی‌بار - Dependencies and Middleware
Implements:
1. Multi-role RBAC dependencies (ADMIN, SUPPORT, DRIVER)
2. Settings restriction for SUPPORT users
3. Strict 2FA/OTP Input endpoint restriction for DRIVER users
4. Subscription Management System (Middleware & Dependency)
   - days_left <= 14 and > 7  => Header X-Sub-Warning: 14_DAYS
   - days_left <= 7 and > 0   => Header X-Sub-Warning: 7_DAYS_BLINKING
   - days_left <= 0           => Block non-GET (except Login/Billing) -> HTTP 403 "SUBSCRIPTION_EXPIRED"
"""

from datetime import datetime
import re
from typing import Annotated, Generator, List, Optional
import uuid

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db, SessionLocal
from backend.models import User, UserRole
from backend.security import decode_access_token

# Dual OAuth2 + Bearer schemes for Swagger UI and Client compatibility
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token", auto_error=False)
http_bearer_scheme = HTTPBearer(auto_error=False)

# Exempt paths from expired subscription write-blocking (Login, Auth, Billing, Documentation)
SUBSCRIPTION_EXEMPT_PATHS = [
    "/token",
    "/api/auth/token",
    "/api/auth/login",
    "/login",
    "/billing",
    "/api/billing",
    "/api/subscription/renew",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/health",
    "/favicon.ico",
]

# Endpoints that DRIVER is permitted to access (strictly 2FA/OTP Input)
DRIVER_ALLOWED_PATHS = [
    "/api/otp/driver-input",
    "/api/otp/verify",
    "/otp/driver-input",
    "/otp/verify",
    "/api/auth/me",
]


SUPER_ADMIN_UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")


# ---------------------------------------------------------------------------
# 1. Current User Authentication Dependency
# ---------------------------------------------------------------------------
def get_current_user(
    request: Request,
    oauth2_token: Annotated[Optional[str], Depends(oauth2_scheme)] = None,
    bearer_token: Annotated[Optional[HTTPAuthorizationCredentials], Depends(http_bearer_scheme)] = None,
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts Bearer token from Swagger OAuth2, HTTPBearer, or direct Authorization header.
    Decodes the JWT payload and verifies active status in the database.
    Supports hardcoded Super Admin ('heliya') without requiring prior database record.
    """
    raw_token: Optional[str] = None

    if oauth2_token:
        raw_token = oauth2_token
    elif bearer_token:
        raw_token = bearer_token.credentials
    else:
        # Fallback check direct header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header.split(" ", 1)[1].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Super Admin Hardcoded Access Check (heliya / special identifier ONLY)
    if (
        payload.sub in [str(SUPER_ADMIN_UUID), "0"]
        or (payload.role == UserRole.ADMIN.value and payload.username == "heliya")
    ):
        admin_user = db.execute(select(User).where(User.username == "heliya")).scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                id=SUPER_ADMIN_UUID,
                username="heliya",
                role=UserRole.ADMIN,
                full_name="Heliya System Administrator",
                mobile="09121111111",
                is_active=True,
                subscription_end_date=None,
            )
        request.state.current_user = admin_user
        return admin_user

    # 2. Database User Lookup for all other users
    try:
        user_uuid = uuid.UUID(payload.sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token subject identifier.",
        )

    user = db.get(User, user_uuid)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or is currently inactive.",
        )

    # Attach user to request state for middleware/logging inspection
    request.state.current_user = user
    return user


# ---------------------------------------------------------------------------
# Strict Multi-Tenancy Data Isolation & Anti-IDOR Context
# ---------------------------------------------------------------------------
class IsolatedTenantContext:
    """
    Enforces strict Multi-Tenancy Data Isolation and prevents IDOR vulnerabilities.
    - SUPPORT users: Every single Database Query (GET, POST, PUT, DELETE) MUST forcefully
      include a filter locking the data to their user ID: .filter(Model.owner_id == current_user.id).
    - ADMIN users ('heliya'): Dynamically bypasses owner_id filters to oversee all tenants.
    - Mutation & Read Protection: Before updating, deleting, or viewing ANY record,
      verifies record.owner_id == current_user.id. If unauthorized, returns 404 Not Found
      (preferred over 403 to prevent data enumeration attacks).
    """

    def __init__(self, current_user: User, db: Session):
        self.user = current_user
        self.db = db
        self.is_admin = (current_user.role == UserRole.ADMIN)
        self.tenant_id = current_user.id

    def filter(self, query, model):
        """
        Forcefully appends .filter(Model.owner_id == current_user.id) for SUPPORT users.
        For ADMIN users, dynamically bypasses the filter to see all tenants.
        """
        if not self.is_admin and hasattr(model, "owner_id"):
            return query.filter(model.owner_id == self.user.id)
        return query

    def query(self, model):
        """Returns a pre-filtered SQLAlchemy query strictly isolated to the tenant."""
        base_query = self.db.query(model)
        return self.filter(base_query, model)

    def get_or_404(self, model, record_id: Any, error_msg: Optional[str] = None):
        """
        Fetches a record by ID with strict tenant isolation.
        If record does not exist OR is not owned by current user (for SUPPORT),
        returns 404 Not Found to prevent data enumeration / IDOR attacks.
        """
        if isinstance(record_id, str):
            try:
                parsed_id = uuid.UUID(record_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=error_msg or f"{model.__name__} یافت نشد (Not Found).",
                )
        else:
            parsed_id = record_id

        record = self.db.get(model, parsed_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg or f"{model.__name__} یافت نشد (Not Found).",
            )

        # Anti-IDOR Check: Record MUST be owned by current_user if not ADMIN
        if not self.is_admin and hasattr(record, "owner_id"):
            if record.owner_id != self.user.id:
                # Return 404 instead of 403 to prevent ID enumeration
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=error_msg or f"{model.__name__} یافت نشد (Not Found).",
                )

        return record

    def verify_ownership_or_404(self, record: Any, model_name: str = "Record"):
        """
        Mutation Protection: Verifies ownership before updating or deleting ANY record.
        Raises 404 Not Found if the record does not belong to the current user.
        """
        if not self.is_admin and hasattr(record, "owner_id"):
            if record.owner_id != self.user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{model_name} یافت نشد (Not Found).",
                )

    def create(self, model, **kwargs):
        """
        Instantiates a model instance, ensuring owner_id is rigidly bound to current_user.id.
        """
        if hasattr(model, "owner_id") and "owner_id" not in kwargs:
            kwargs["owner_id"] = self.user.id
        instance = model(**kwargs)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance


def get_isolated_tenant(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IsolatedTenantContext:
    """
    FastAPI Dependency injecting the isolated tenant context.
    Verifies the JWT token and extracts current_user.
    Forces all queries and mutations to be scoped to current_user.id for SUPPORT,
    while allowing ADMIN ('heliya') to dynamically bypass filters.
    """
    return IsolatedTenantContext(current_user=current_user, db=db)



# ---------------------------------------------------------------------------
# 2. Role-Based Access Control (RBAC) Dependency Factories
# ---------------------------------------------------------------------------
def require_roles(*allowed_roles: UserRole):
    """
    Strict RBAC permission validator.
    - ADMIN: full access
    - SUPPORT: operational modules
    - DRIVER: restricted to 2FA/OTP
    """
    def role_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{current_user.role.value}' does not have permission.",
            )

        # Enforce DRIVER strict restriction: only allowed on 2FA/OTP Input endpoints
        if current_user.role == UserRole.DRIVER:
            path = request.url.path
            is_allowed = any(path.startswith(allowed) for allowed in DRIVER_ALLOWED_PATHS)
            if not is_allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="DRIVER access is strictly restricted to the 2FA/OTP Input endpoint.",
                )

        return current_user

    return role_checker


# Convenient Pre-configured RBAC Dependencies
require_admin = require_roles(UserRole.ADMIN)
require_support_or_admin = require_roles(UserRole.ADMIN, UserRole.SUPPORT)
require_driver_only = require_roles(UserRole.DRIVER)


def require_settings_access(current_user: User = Depends(get_current_user)) -> User:
    """
    Enforces that SUPPORT users CANNOT access Settings.
    Only ADMIN has access to settings modules.
    """
    if current_user.role == UserRole.SUPPORT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPPORT users are restricted from accessing system settings.",
        )
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify or view system settings.",
        )
    return current_user


def enforce_driver_otp_only(request: Request, current_user: User = Depends(get_current_user)) -> User:
    """
    Explicitly guards an endpoint ensuring DRIVER accounts cannot escape the 2FA flow.
    """
    if current_user.role == UserRole.DRIVER:
        path = request.url.path
        if not any(path.startswith(p) for p in DRIVER_ALLOWED_PATHS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="DRIVER accounts are strictly restricted to the 2FA/OTP Input endpoint.",
            )
    return current_user


# ---------------------------------------------------------------------------
# 3. Subscription Verification Dependency
# ---------------------------------------------------------------------------
def check_subscription_status(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Verifies subscription_end_date and is_payment_approved for Support accounts:
    - days_left <= 14 and > 7: sets header X-Sub-Warning: 14_DAYS
    - days_left <= 7 and > 0:  sets header X-Sub-Warning: 7_DAYS_BLINKING
    - days_left <= 0 and not is_payment_approved: blocks request entirely with HTTP 403 "SUBSCRIPTION_EXPIRED"
      (exceptions only for /login and /billing)
    """
    # ADMIN users bypass subscription constraints
    if current_user.role == UserRole.ADMIN:
        return current_user

    if not current_user.subscription_end_date:
        return current_user

    today = date.today()
    sub_end = current_user.subscription_end_date
    if isinstance(sub_end, datetime):
        sub_end = sub_end.date()

    days_left = (sub_end - today).days
    response.headers["X-Sub-Days-Left"] = str(days_left)

    # 1. Auto-Block check (days_left <= 0 and is_payment_approved == False)
    if days_left <= 0 and not current_user.is_payment_approved:
        path = request.url.path
        is_exempt = (
            "/login" in path
            or "/billing" in path
            or any(path.startswith(p) for p in SUBSCRIPTION_EXEMPT_PATHS)
        )
        if not is_exempt:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SUBSCRIPTION_EXPIRED",
                headers={
                    "X-Sub-Warning": "SUBSCRIPTION_EXPIRED",
                    "X-Sub-Days-Left": str(days_left),
                    "Access-Control-Expose-Headers": "X-Sub-Warning, X-Sub-Days-Left",
                },
            )
        response.headers["X-Sub-Warning"] = "SUBSCRIPTION_EXPIRED"
        return current_user

    # 2. Warning states
    if 0 < days_left <= 7:
        response.headers["X-Sub-Warning"] = "7_DAYS_BLINKING"
    elif 7 < days_left <= 14:
        response.headers["X-Sub-Warning"] = "14_DAYS"

    return current_user


# ---------------------------------------------------------------------------
# 4. Global Subscription Middleware (FastAPI / Starlette)
# ---------------------------------------------------------------------------
class SubscriptionMiddleware(BaseHTTPMiddleware):
    """
    Global middleware executing on EVERY incoming HTTP request.
    Intercepts requests from SUPPORT users:
    1. Calculates days_left between today (Jalali/Date) and subscription_end_date.
    2. If days_left <= 14 and > 7: Injects X-Sub-Warning: 14_DAYS header into response.
    3. If days_left <= 7 and > 0:  Injects X-Sub-Warning: 7_DAYS_BLINKING header.
    4. Auto-Block Logic: If days_left <= 0 AND is_payment_approved == False:
       Blocks the request entirely with HTTP 403 Forbidden and detail: "SUBSCRIPTION_EXPIRED".
       Allows exceptions ONLY for /login and /billing endpoints.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Always permit CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Extract authorization token
        auth_header = request.headers.get("Authorization")
        token: Optional[str] = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        warning_header: Optional[str] = None
        days_left_header: Optional[str] = None

        if token:
            payload = decode_access_token(token)
            if payload and payload.role == UserRole.SUPPORT.value:
                db = SessionLocal()
                try:
                    user_uuid = uuid.UUID(payload.sub)
                    user = db.get(User, user_uuid)
                    if user and user.subscription_end_date:
                        today = date.today()
                        sub_end = user.subscription_end_date
                        if isinstance(sub_end, datetime):
                            sub_end = sub_end.date()

                        days_left = (sub_end - today).days
                        days_left_header = str(days_left)

                        # Auto-block check
                        if days_left <= 0 and not user.is_payment_approved:
                            is_exempt = (
                                "/login" in path
                                or "/billing" in path
                                or any(path.startswith(exempt) for exempt in SUBSCRIPTION_EXEMPT_PATHS)
                            )
                            if not is_exempt:
                                return JSONResponse(
                                    status_code=status.HTTP_403_FORBIDDEN,
                                    content={"detail": "SUBSCRIPTION_EXPIRED"},
                                    headers={
                                        "X-Sub-Warning": "SUBSCRIPTION_EXPIRED",
                                        "X-Sub-Days-Left": str(days_left),
                                        "Access-Control-Expose-Headers": "X-Sub-Warning, X-Sub-Days-Left",
                                    },
                                )
                            warning_header = "SUBSCRIPTION_EXPIRED"
                        elif 0 < days_left <= 7:
                            warning_header = "7_DAYS_BLINKING"
                        elif 7 < days_left <= 14:
                            warning_header = "14_DAYS"
                except Exception:
                    pass
                finally:
                    db.close()

        # Proceed with request execution
        response = await call_next(request)

        # Inject headers if computed
        if days_left_header:
            response.headers["X-Sub-Days-Left"] = days_left_header

        if warning_header:
            response.headers["X-Sub-Warning"] = warning_header

        exposed = response.headers.get("Access-Control-Expose-Headers", "")
        new_exposed_list = [h.strip() for h in exposed.split(",") if h.strip()]
        for h in ["X-Sub-Warning", "X-Sub-Days-Left"]:
            if h not in new_exposed_list:
                new_exposed_list.append(h)
        response.headers["Access-Control-Expose-Headers"] = ", ".join(new_exposed_list)

        return response
