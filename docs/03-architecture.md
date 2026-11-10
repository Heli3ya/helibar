# معماری پروژه

## نمای کلی

```
┌─────────────────────────────────────────────────────────────┐
│                        مرورگر کاربر                          │
│  React 19 + Vite 6 + Tailwind 4 + lucide-react + motion     │
│  ┌────────────┬────────────┬────────────┬────────────────┐  │
│  │ AuthContext│ThemeContext│Subscript.  │ lib/api.ts     │  │
│  └────────────┴────────────┴────────────┴────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / JSON  (پورت ۳۰۰۰)
┌───────────────────────────▼─────────────────────────────────┐
│                    سرور Express (server.ts)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Middleware: JSON parser → Subscription guard → routes│   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌────────────┬────────────┬────────────┬───────────────┐   │
│  │ Auth & OTP │ Waybill    │ Fleet      │ Sipaad proxy  │   │
│  │            │ Batch      │ Fuel       │ Admin         │   │
│  └────────────┴────────────┴────────────┴───────────────┘   │
│  ┌──────────────────────┬───────────────────────────────┐   │
│  │ In-Memory Stores     │ JSON persistence (data/*.json)│   │
│  └──────────────────────┴───────────────────────────────┘   │
└───────────┬──────────────────────────────┬──────────────────┘
            │ SOAP/HTTPS                   │ SMS Webhook
┌───────────▼──────────────┐   ┌───────────▼──────────────────┐
│  سپاد / UTCMS            │   │  پنل پیامک (SMS Panel)       │
│  ITMBOL.asmx             │   │  POST /api/webhook/sms-panel │
│  ITMFreighter.asmx       │   └──────────────────────────────┘
└──────────────────────────┘
```

## دو بک‌اند موازی

| ویژگی | Express (`server.ts`) | FastAPI (`backend/`) |
|-------|----------------------|---------------------|
| پورت | ۳۰۰۰ | ۸۰۰۰ |
| زبان | TypeScript | Python |
| ذخیره‌سازی | آرایه‌های in-memory + JSON | SQLAlchemy (SQLite/Postgres) |
| احراز هویت | توکن شبه‌JWT | JWT واقعی + OAuth2 |
| مستندات | ندارد | Swagger `/docs` |
| وضعیت | **بک‌اند فعال فرانت** | توسعه موازی |

**نکته کلیدی**: فرانت‌اند `src/` فقط با Express صحبت می‌کند. FastAPI در حال حاضر از سمت UI مصرف نمی‌شود و state مشترکی با Express ندارد. اگر قصد یکپارچه‌سازی دارید، باید یکی را به‌عنوان منبع حقیقت انتخاب کنید.

## لایه‌بندی فرانت‌اند

```
src/
├── main.tsx           → mount ریشه
├── App.tsx            → state مرکزی + مسیریابی تب‌ها
├── types.ts           → تمام تایپ‌های دامنه (۲۶۰ خط)
├── context/
│   ├── AuthContext.tsx        → توکن، کاربر، login/logout
│   ├── ThemeContext.tsx       → تم روشن/تیره
│   └── SubscriptionContext.tsx→ روزهای باقی‌مانده اشتراک
├── lib/
│   ├── api.ts                 → axios instance + interceptor اشتراک
│   ├── sipaadCrypto.ts        → SHA-512 و فرمول هش
│   ├── iranPlate.ts           → اعتبارسنجی پلاک و اعداد فارسی
│   └── mockData.ts            → داده نمونه برای توسعه
└── components/        → ۶۰+ کامپوننت، بدون router
```

### مسیریابی

پروژه از **react-router استفاده نمی‌کند**. ناوبری با یک state به نام `currentTab` از نوع `NavTab` انجام می‌شود:

```ts
type NavTab =
  | 'DASHBOARD' | 'ISSUE_SINGLE' | 'BATCH' | 'OTP_MANAGER'
  | 'REPORTS' | 'FLEET' | 'FUEL_INQUIRY' | 'ARCHIVE'
  | 'LAB' | 'SETTINGS' | 'ADMIN_CREATE_USER';
```

مزیت: سادگی و عدم وابستگی. هزینه: بدون deep-link، بدون back مرورگر، بدون کد اشتراک‌گذاری صفحه.

## جریان یک درخواست نمونه (صدور بارنامه)

```
۱. کاربر فرم WaybillForm را پر می‌کند
۲. اعتبارسنجی سمت کلاینت (iranPlate + فیلدهای اجباری)
۳. POST /api/waybills  با هدر Authorization: Bearer ...
   ├─ middleware اشتراک: بررسی days_left
   ├─ getTenantUser: استخراج مالک از توکن
   ├─ بررسی idempotencyKey در idempotencyStore
   ├─ computeSipaadSecurityHashServer(companyCode, password, salt)
   ├─ ارسال پاکت SOAP به ITMBOL.asmx (یا شبیه‌سازی)
   └─ ذخیره در waybillsStore + saveWaybillsToDisk()
۴. پاسخ شامل trackingCode و sipaadResponse
۵. UI به تب ARCHIVE هدایت و مودال چاپ باز می‌شود
```

## جریان OTP

```
پشتیبان                     سرور                      راننده/پیامک
   │  POST /api/otp/trigger    │                            │
   ├──────────────────────────>│  ساخت OTPRecord (PENDING)  │
   │                           │  ارسال درخواست به سپاد     │
   │                           ├───────────────────────────>│
   │                           │<─── SMS حاوی کد ۵ رقمی ────┤
   │                           │  POST /api/webhook/sms-panel│
   │                           │  استخراج کد + تطبیق موبایل │
   │                           │  به‌روزرسانی رکورد به VERIFIED
   │  GET /api/otp/pending     │                            │
   │<──────────────────────────┤                            │
```

## لایه‌بندی بک‌اند FastAPI

```
backend/
├── main.py            → اپ FastAPI، middleware، ثبت روترها
├── database.py        → engine، SessionLocal، init_db
├── models.py          → ۸ مدل SQLAlchemy
├── schemas.py         → Pydantic DTOها
├── security.py        → هش رمز، ساخت/بررسی JWT
├── dependencies.py    → get_current_user، require_admin، ایزولاسیون
├── auth.py            → /token، /captcha، /login، /signup، اشتراک
├── api/auth.py        → /api/auth/me، تغییر رمز
├── api/otp.py         → مسیرهای OTP چندمستأجری
├── driver_router.py   → مدیریت رانندگان + اتوماسیون UTCMS
├── services.py        → OtpRoutingService و منطق دامنه
├── jalali_periods.py  → تبدیل و محاسبه دوره‌های جلالی
├── utcms_client.py    → کلاینت SOAP سپاد
└── otp_automation.py  → Redis + Celery برای ازسرگیری خودکار
```

## الگوهای معماری به‌کاررفته

| الگو | کجا | چرا |
|------|-----|-----|
| Multi-tenancy با فیلتر مالکیت | `getTenantUser`، `get_isolated_tenant` | جلوگیری از IDOR |
| Idempotency Key | `idempotencyStore` | جلوگیری از بارنامه تکراری |
| Fault isolation در Batch | `/api/batch` | یک خطا کل دسته را متوقف نکند |
| Circuit-ish retry | `retry-waybill` | تلاش مجدد برای پلاک خطادار |
| Proxy pattern | `/api/sipaad/*` | پنهان‌کردن رمز و SOAP از مرورگر |
| Fallback in-memory | `InMemoryRedis` | اجرا بدون Redis |
| Pessimistic guard | middleware اشتراک | مسدودسازی نوشتن پس از انقضا |

## محدودیت‌های شناخته‌شده

1. **State در حافظه**: با ری‌استارت سرور، داده‌های غیرذخیره‌شده از دست می‌روند (فقط users/plates/waybills/settings روی دیسک می‌روند).
2. **بدون قفل توزیع‌شده**: در اجرای چند-نمونه‌ای، idempotency تضمینی نیست.
3. **هش رمز ضعیف**: متن ساده در JSON.
4. **بدون تست خودکار**: هیچ فایل تستی در پروژه نیست.
5. **تکرار منطق**: قواعد اشتراک و RBAC در Express و FastAPI جداگانه پیاده شده‌اند و ممکن است واگرا شوند.

## پیشنهاد مسیر تکامل

```
کوتاه‌مدت   → یکسان‌سازی احراز هویت، هش bcrypt، JWT واقعی
میان‌مدت   → مهاجرت state به Postgres + Redis، حذف JSON
بلندمدت   → حذف یکی از دو بک‌اند، افزودن تست یکپارچه و CI
```
