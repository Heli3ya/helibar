# Proxy import to backend.otp_automation
from backend.otp_automation import (
    redis_proxy,
    celery_app,
    celery_resume_waybill_task,
    execute_waybill_resumption,
    dispatch_auto_otp_task,
    InMemoryRedis,
    RedisClientProxy,
)

__all__ = [
    "redis_proxy",
    "celery_app",
    "celery_resume_waybill_task",
    "execute_waybill_resumption",
    "dispatch_auto_otp_task",
    "InMemoryRedis",
    "RedisClientProxy",
]
