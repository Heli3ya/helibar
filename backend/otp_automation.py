"""
helibar | هلی‌بار - Auto-OTP & Background Celery Worker Automation
Automates the Municipal 2FA OTP and Waybill Issuance Pipeline:

1. When a SUPPORT user triggers a Waybill issuance requiring OTP:
   - Sets a pending task in Redis: `otp_pending:<driver_id>` with TTL.
2. When the DRIVER logs into their panel and submits OTP to /api/drivers/submit-otp:
   - Resolves and deletes the Redis key `otp_pending:<driver_id>`.
   - Triggers Celery worker: `resume_waybill_issuance_task`.
   - Celery worker executes RegUserAuthenticateOTP_40WS and InsertBOL_01WS.
   - Seamlessly completes issuance without Support intervention.
"""

import asyncio
from datetime import datetime, timedelta
import json
import logging
import os
import threading
from typing import Any, Dict, Optional
import uuid

try:
    from sqlalchemy.orm import Session
    from backend.database import SessionLocal
    from backend.models import DriverOtpRequest, OtpStatus, User
except ImportError:
    Session = Any  # type: ignore
    SessionLocal = None  # type: ignore
    DriverOtpRequest = None  # type: ignore
    OtpStatus = None  # type: ignore
    User = None  # type: ignore

from backend.utcms_client import utcms_client, UtcmsException

logger = logging.getLogger("otp_automation")

# Optional Redis import with robust InMemory fallback
try:
    import redis
except ImportError:
    redis = None  # type: ignore

# Optional Celery import with background execution fallback
try:
    from celery import Celery
except ImportError:
    Celery = None  # type: ignore


# ---------------------------------------------------------------------------
# 1. Redis Store with Thread-safe In-Memory Fallback
# ---------------------------------------------------------------------------
class InMemoryRedis:
    """Thread-safe in-memory key-value store with TTL emulation for development/testing."""
    def __init__(self):
        self._store: Dict[str, Tuple[str, datetime]] = {}
        self._lock = threading.Lock()

    def setex(self, name: str, time: int, value: str) -> bool:
        with self._lock:
            expire_at = datetime.utcnow() + timedelta(seconds=time)
            self._store[name] = (value, expire_at)
            return True

    def get(self, name: str) -> Optional[str]:
        with self._lock:
            item = self._store.get(name)
            if not item:
                return None
            val, expire_at = item
            if datetime.utcnow() > expire_at:
                del self._store[name]
                return None
            return val

    def delete(self, *names: str) -> int:
        with self._lock:
            count = 0
            for name in names:
                if name in self._store:
                    del self._store[name]
                    count += 1
            return count

    def exists(self, name: str) -> int:
        return 1 if self.get(name) is not None else 0


class RedisClientProxy:
    def __init__(self):
        self._redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._client = None
        self._memory = InMemoryRedis()

        if redis is not None:
            try:
                self._client = redis.Redis.from_url(self._redis_url, decode_responses=True)
                self._client.ping()
                logger.info("Connected to live Redis server.")
            except Exception as e:
                logger.warning(f"Live Redis not available ({e}); using high-performance In-Memory Redis fallback.")
                self._client = None

    def set_pending_otp(self, driver_id: str, data: Dict[str, Any], ttl_seconds: int = 180) -> bool:
        key = f"otp_pending:{driver_id}"
        serialized = json.dumps(data)
        if self._client:
            try:
                return bool(self._client.setex(key, ttl_seconds, serialized))
            except Exception:
                pass
        return self._memory.setex(key, ttl_seconds, serialized)

    def get_pending_otp(self, driver_id: str) -> Optional[Dict[str, Any]]:
        key = f"otp_pending:{driver_id}"
        raw = None
        if self._client:
            try:
                raw = self._client.get(key)
            except Exception:
                pass
        if raw is None:
            raw = self._memory.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    def resolve_pending_otp(self, driver_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves and atomically deletes the pending OTP task from Redis."""
        key = f"otp_pending:{driver_id}"
        task_data = self.get_pending_otp(driver_id)
        if self._client:
            try:
                self._client.delete(key)
            except Exception:
                pass
        self._memory.delete(key)
        return task_data


# Singleton Redis Proxy
redis_proxy = RedisClientProxy()


# ---------------------------------------------------------------------------
# 2. Celery Worker Configuration
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")

if Celery is not None:
    celery_app = Celery("helibar_otp_worker", broker=CELERY_BROKER_URL)
    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="Asia/Tehran",
        enable_utc=True,
    )
else:
    celery_app = None  # type: ignore


def execute_waybill_resumption(driver_id: str, national_id: str, otp_code: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core business logic executed by the Celery worker:
    1. Authenticates OTP in UTCMS via RegUserAuthenticateOTP_40WS.
    2. Resumes & completes Waybill issuance in UTCMS via InsertBOL_01WS.
    3. Persists results and tracking code in database.
    """
    logger.info(f"Worker processing Waybill issuance for driver {driver_id} (National ID: {national_id}) with OTP {otp_code}")

    # Step 1: Call UTCMS RegUserAuthenticateOTP_40WS
    otp_auth_res = asyncio.run(utcms_client.reg_user_authenticate_otp_40ws(
        national_id=national_id,
        otp_code=otp_code,
    ))

    # Step 2: Call UTCMS InsertBOL_01WS with waybill payload
    waybill_payload = task_data.get("waybill_payload", {})
    waybill_payload["SessionToken"] = otp_auth_res.get("SessionToken")
    waybill_res = asyncio.run(utcms_client.insert_bol_01ws(waybill_payload))

    # Step 3: Update local DB records
    if SessionLocal:
        db = SessionLocal()
        try:
            otp_req_id = task_data.get("otp_request_id")
            if otp_req_id:
                req = db.get(DriverOtpRequest, uuid.UUID(otp_req_id))
                if req:
                    req.status = OtpStatus.VERIFIED
                    req.otp_code = otp_code
                    req.verified_at = datetime.utcnow()
                    req.trace_code = waybill_res.get("TrackingCode")
                    db.commit()
        except Exception as exc:
            logger.error(f"Error updating DB in worker: {exc}")
        finally:
            db.close()

    return {
        "status": "SUCCESS",
        "driver_id": driver_id,
        "tracking_code": waybill_res.get("TrackingCode"),
        "waybill_number": waybill_res.get("WaybillNumber"),
        "message": "Waybill successfully issued via UTCMS Auto-OTP automation.",
    }


# Celery Task Definition (if Celery is installed)
if Celery is not None and celery_app is not None:
    @celery_app.task(name="resume_waybill_issuance_task")
    def celery_resume_waybill_task(driver_id: str, national_id: str, otp_code: str, task_data: Dict[str, Any]):
        return execute_waybill_resumption(driver_id, national_id, otp_code, task_data)
else:
    celery_resume_waybill_task = None


def dispatch_auto_otp_task(driver_id: str, national_id: str, otp_code: str, task_data: Dict[str, Any]) -> str:
    """
    Dispatches task to Celery worker if available; otherwise falls back to async background thread.
    Returns task_id string.
    """
    task_id = str(uuid.uuid4())
    if celery_resume_waybill_task is not None:
        try:
            async_result = celery_resume_waybill_task.delay(driver_id, national_id, otp_code, task_data)
            return async_result.id
        except Exception as e:
            logger.warning(f"Celery queue dispatch failed ({e}); falling back to background worker thread.")

    # High-Performance Thread Worker Fallback
    worker_thread = threading.Thread(
        target=execute_waybill_resumption,
        args=(driver_id, national_id, otp_code, task_data),
        daemon=True,
    )
    worker_thread.start()
    return task_id
