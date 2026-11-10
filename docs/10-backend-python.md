# بک‌اند FastAPI

## چرا دو بک‌اند؟

`backend/` یک پیاده‌سازی کامل با FastAPI است که هم‌زمان با Express وجود دارد. هدف آن:

- مستندات تعاملی Swagger در `/docs`
- RBAC دقیق‌تر با dependency injection
- پایگاه داده رابطه‌ای با SQLAlchemy
- الگوی ایزولاسیون چندمستأجری (Anti-IDOR) به‌صورت متمرکز

در حال حاضر فرانت‌اند React از این بک‌اند استفاده نمی‌کند، اما APIهای آن آماده و قابل استفاده‌اند.

---

## ساختار فایل‌ها

| فایل | مسئولیت |
|------|---------|
| `main.py` | اپ FastAPI، middleware، ثبت روترها، lifespan |
| `database.py` | engine، `SessionLocal`، `init_db` |
| `models.py` | ۸ مدل SQLAlchemy |
| `schemas.py` | DTOهای Pydantic و اعتبارسنجی |
| `security.py` | هش رمز، ساخت/بررسی JWT |
| `dependencies.py` | وابستگی‌های احراز هویت و ایزولاسیون |
| `auth.py` | توکن، کپچا، ورود، ثبت‌نام، اشتراک |
| `api/auth.py` | `/api/auth/me`، لیست رانندگان، تغییر رمز |
| `api/otp.py` | مسیرهای OTP چندمستأجری |
| `driver_router.py` | مدیریت رانندگان + اتوماسیون UTCMS |
| `services.py` | `OtpRoutingService` و منطق دامنه |
| `jalali_periods.py` | تبدیل و مرزهای دوره جلالی |
| `utcms_client.py` | کلاینت SOAP سپاد |
| `otp_automation.py` | Redis + Celery برای ازسرگیری خودکار |

---

## راه‌اندازی اپ

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_initial_users(db)
    finally:
        db.close()
    yield
```

در شروع:
1. ساخت جدول‌ها (`Base.metadata.create_all`)
2. Seed کاربران اولیه: `heliya` (ADMIN)، `Test Support` (SUPPORT)، `09124451092` (DRIVER)

### Middleware

| Middleware | نقش |
|-----------|-----|
| `SubscriptionMiddleware` | افزودن `X-Sub-Warning` و مسدودسازی نوشتن پس از انقضا |
| `CORSMiddleware` | `allow_origins=["*"]` + expose هدرهای هشدار |

> `allow_origins=["*"]` همراه با `allow_credentials=True` توسط مرورگرها رد می‌شود. برای تولید باید origin دقیق تنظیم شود.

---

## مدل‌های داده

### `User`

| ستون | نوع | توضیح |
|------|-----|-------|
| `id` | UUID | کلید اصلی |
| `username` | String(64) | یکتا، ایندکس‌دار |
| `password_hash` | String(255) | bcrypt |
| `role` | Enum | ADMIN / SUPPORT / DRIVER |
| `full_name` | String(128) | — |
| `mobile` | String(15) | ایندکس‌دار |
| `is_active` | Boolean | مسدودسازی دسترسی |
| `national_id` | String(10) | کد ملی |
| `address` | String(500) | آدرس |
| `province_city` | String(128) | استان/شهر |
| `subscription_start_date` | Date | شروع دوره |
| `subscription_end_date` | Date | پایان دوره (ایندکس‌دار) |
| `is_payment_approved` | Boolean | تأیید پرداخت |
| `plate_capacity` | Integer | سقف پلاک (پیش‌فرض ۵۰) |
| `created_at` / `updated_at` | DateTime | — |

### سایر مدل‌ها

| مدل | جدول | نقش |
|-----|------|-----|
| `DriverProfile` | `driver_profiles` | اطلاعات تکمیلی راننده و خودرو |
| `SupportDriverAssignment` | `support_driver_assignments` | نگاشت پشتیبان ↔ راننده |
| `DriverOtpRequest` | `driver_otp_requests` | درخواست‌های OTP |
| `Waybill` | `waybills` | بارنامه‌ها |
| `Plate` | `plates` | پلاک‌ها |
| `Driver` | `drivers` | رانندگان |
| `ExcelUpload` | `excel_uploads` | تاریخچه آپلود اکسل |

### Enumها

```python
class UserRole: ADMIN | SUPPORT | DRIVER
class OtpStatus: PENDING | VERIFIED | EXPIRED | FAILED
class SubscriptionStatusEnum: ACTIVE | 14_DAYS | 7_DAYS_BLINKING | SUBSCRIPTION_EXPIRED
class WaybillStatus: ...
```

---

## وابستگی‌های کلیدی

### `get_current_user`

توکن را از هدر `Authorization: Bearer` می‌خواند، رمزگشایی JWT می‌کند و کاربر را از دیتابیس برمی‌گرداند. خطاهای ممکن:

| وضعیت | پیام |
|-------|------|
| `401` | توکن نامعتبر یا منقضی |
| `403` | کاربر غیرفعال |

### `require_roles(*allowed)`

یک factory برای ساخت dependency نقش‌محور:

```python
@router.get("/api/settings/system")
def get_settings(user: User = Depends(require_settings_access)):
    ...
```

### `IsolatedTenantContext`

```python
class IsolatedTenantContext:
    user: User
    is_admin: bool
    def query(self, model): ...   # اعمال فیلتر owner_id برای غیر ادمین
```

استفاده:

```python
tenant = Depends(get_isolated_tenant)
plates = tenant.query(Plate).filter(Plate.is_active == True).all()
```

اگر `SUPPORT` بخواهد به رکورد کاربر دیگر دسترسی پیدا کند → `404` (نه `403`).

### `check_subscription_status`

روی عملیات نوشتن (POST/PUT/PATCH/DELETE) اعمال می‌شود:

```python
if days_left <= 0:
    raise HTTPException(403, "SUBSCRIPTION_EXPIRED")
```

مسیرهای معاف: احراز هویت، صورت‌حساب، ادمین، اشتراک.

---

## مسیرهای API

### احراز هویت (`backend/auth.py`)

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/captcha` و `/api/auth/captcha` | کپچای ۴ رقمی، اعتبار ۱۸۰ ثانیه |
| `POST` | `/token` | OAuth2 Password Flow (Swagger) |
| `POST` | `/api/auth/token` | همان، بدون نمایش در schema |
| `POST` | `/api/auth/login` | ورود JSON |
| `POST` | `/api/auth/signup` | ثبت‌نام پشتیبان با اشتراک ۱ ماهه |
| `POST` | `/api/otp/driver-input` | ورود کد توسط راننده |
| `POST` | `/api/subscription/renew` | تمدید اشتراک |
| `GET` | `/api/users/me` | پروفایل + `days_left` |

### پروفایل (`backend/api/auth.py`)

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/api/auth/me` | اطلاعات کاربر جاری |
| `GET` | `/api/auth/drivers` | رانندگان قابل دسترس |
| `GET` | `/api/auth/my-drivers` | رانندگان تخصیص‌یافته به پشتیبان |

### OTP (`backend/api/otp.py`)

| متد | مسیر | توضیح |
|-----|------|-------|
| `POST` | `/api/otp/trigger` | درخواست کد برای راننده |
| `GET` | `/api/otp/pending` | لیست در انتظار |
| `POST` | `/api/otp/verify` | تأیید کد |
| `GET` | `/api/otp/driver/dashboard` | داشبورد راننده |

### رانندگان (`backend/driver_router.py`)

| متد | مسیر | توضیح |
|-----|------|-------|
| `POST` | `/api/drivers/validate` | اعتبارسنجی |
| `POST` | `/api/drivers/confirm` | تأیید و ثبت |
| `POST` | `/api/drivers/add` | افزودن |
| `POST` | `/api/drivers/trigger-waybill-otp` | شروع فرآیند OTP صدور |
| `POST` | `/api/drivers/submit-otp` | ثبت کد و ازسرگیری |
| `POST` | `/api/drivers/import` | ایمپورت |
| `GET` | `/api/drivers/excel-template` | قالب اکسل |
| `POST` | `/api/drivers/bulk-upload` | آپلود گروهی |

### پلاک (`routers/plates.py`)

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/api/plates` | لیست با ایزولاسیون |
| `POST` | `/api/plates` | افزودن |
| `GET` | `/api/plates/{plate_id}` | جزئیات |
| `PUT` | `/api/plates/{plate_id}` | ویرایش |
| `DELETE` | `/api/plates/{plate_id}` | حذف با بررسی مالکیت |
| `POST` | `/api/plates/{plate_id}/retry-waybill` | `202` + تسک Celery |

### سوخت (`routers/fuel.py`)

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/api/fuel-inquiry/{plate_id}` | سهمیه با فیلتر مرحله جلالی |

### ادمین (`backend/main.py`)

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/api/admin/users/supports` | لیست کاربران |
| `POST` | `/api/admin/users/create-support` | ساخت پشتیبان |
| `PATCH` | `/api/admin/users/{id}/capacity` | تغییر ظرفیت |
| `POST` | `/api/admin/users/{id}/approve-payment` | تأیید پرداخت + تمدید ۱ ماه جلالی |
| `DELETE` | `/api/admin/users/{id}` | حذف (محافظت از heliya) |
| `GET` | `/api/settings/system` | تنظیمات (فقط ادمین) |
| `POST` | `/api/billing/renew` | تمدید |

---

## `OtpRoutingService`

منطق دامنه OTP در `services.py` متمرکز است:

```python
class OtpRoutingService:
    @staticmethod
    def verify_driver_assignment(db, support_user, driver_id) -> User:
        # 1. راننده وجود دارد، نقش DRIVER، فعال است
        # 2. ADMIN از بررسی تخصیص معاف است
        # 3. برای SUPPORT: بررسی SupportDriverAssignment فعال
```

قواعد:

- پشتیبان «الف» فقط می‌تواند OTP رانندگان تخصیص‌یافته به خودش را ببیند/تأیید کند.
- راننده نیازی به ورود کد ندارد؛ پشتیبان مدیریت می‌کند.
- انقضای پیش‌فرض کد: ۲ دقیقه.

---

## اتوماسیون با Redis و Celery

`otp_automation.py` سه سطح دارد:

```
۱. Redis واقعی (اگر نصب باشد)
۲. InMemoryRedis (fallback thread-safe با TTL)
۳. اجرای مستقیم در thread (اگر Celery نباشد)
```

کلیدها:

```
otp_pending:<driver_id>   → JSON وضعیت در انتظار
```

تسک‌ها:

```python
@celery_app.task
def celery_resume_waybill_task(driver_id: str, otp_code: str): ...

def execute_waybill_resumption(...): ...
```

---

## اجرای تست دستی

```bash
# ۱. اجرا
uvicorn backend.main:app --reload --port 8000

# ۲. گرفتن توکن
curl -X POST http://localhost:8000/token -d "username=heliya&password=heliya84"

# ۳. فراخوانی
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/dashboard-stats

# ۴. مستندات
start http://localhost:8000/docs
```

---

## تفاوت‌های مهم با Express

| موضوع | Express | FastAPI |
|-------|---------|---------|
| توکن | رشته ساختگی | JWT امضاشده HS256 |
| رمز | متن ساده در JSON | bcrypt |
| داده | آرایه + فایل JSON | SQLAlchemy |
| اشتراک | `created_at + 30 روز` | `subscription_end_date` (ماه جلالی) |
| ایزولاسیون | فیلتر دستی در هر مسیر | `IsolatedTenantContext` |
| خطای دسترسی | `403` | `404` برای پنهان‌کردن وجود رکورد |
| OTP | Webhook پیامک | Redis + Celery |

---

## کارهای باقی‌مانده

1. **یکسان‌سازی منبع حقیقت**: یا Express به FastAPI متصل شود یا برعکس.
2. **مایگریشن‌ها**: پروژه از Alembic استفاده نمی‌کند؛ تغییر schema نیازمند حذف و بازسازی جدول است.
3. **تست‌ها**: هیچ تست واحدی برای سرویس‌ها وجود ندارد.
4. **محدودسازی CORS**: حذف `*` در تولید.
5. **مدیریت نشست Redis**: استفاده از connection pool به‌جای کلاینت تکی.
