# چرخه عمر بارنامه، پردازش دسته‌ای و OTP

## وضعیت‌های بارنامه

```ts
type WaybillStatus = 'PENDING' | 'PROCESSING' | 'ISSUED' | 'REJECTED' | 'FAILED' | 'REVOKED';
```

```
   ┌─────────┐   شروع    ┌────────────┐   تایید سپاد   ┌────────┐
   │ PENDING ├──────────>│ PROCESSING ├───────────────>│ ISSUED │
   └────┬────┘           └─────┬──────┘                └───┬────┘
        │                      │                           │
        │ رد شدن               │ خطای شبکه/اعتبارسنجی      │ ابطال
        ▼                      ▼                           ▼
   ┌──────────┐          ┌──────────┐                ┌─────────┐
   │ REJECTED │          │  FAILED  │                │ REVOKED │
   └──────────┘          └──────────┘                └─────────┘
```

| وضعیت | معنا | قابل تلاش مجدد |
|-------|------|----------------|
| `PENDING` | در صف | بله |
| `PROCESSING` | در حال ارسال به سپاد | خیر (منتظر بمانید) |
| `ISSUED` | صادر شده با کد رهگیری | — |
| `REJECTED` | سپاد رد کرد (خطای دامنه) | پس از رفع علت |
| `FAILED` | خطای فنی/شبکه | بله |
| `REVOKED` | باطل‌شده | خیر |

---

## صدور تکی — گام به گام

```
۱. تکمیل فرم WaybillForm
   ├─ انتخاب پلاک از ناوگان
   ├─ اطلاعات راننده (کد ملی، موبایل، کارت هوشمند)
   ├─ طرفین (فرستنده/گیرنده) و شهرها
   └─ محموله، تناژ، ارزش، کرایه، کمیسیون، بیمه، عوارض

۲. اعتبارسنجی کلاینت
   ├─ پلاک معتبر (iranPlate)
   ├─ کد ملی ۱۰ رقمی
   ├─ موبایل 09XXXXXXXXX
   └─ اعداد فارسی → لاتین

۳. POST /api/waybills

۴. سرور:
   ├─ استخراج مستأجر از توکن
   ├─ بررسی idempotencyKey
   ├─ محاسبه هش امنیتی
   ├─ قالب‌بندی nullهای صریح
   ├─ ارسال به ITMBOL (یا شبیه‌سازی)
   └─ ذخیره در waybillsStore + دیسک

۵. پاسخ → UI مودال چاپ باز می‌کند
```

---

## کلید Idempotency

هر بارنامه یک `idempotencyKey` دارد:

```
IDEMP-{companyCode}-{plateKey}-{date}-{sequence}
// مثال: IDEMP-24981-43ع78977-14030701-A
```

منطق:

```ts
const existing = idempotencyStore.get(payload.idempotencyKey);
if (existing) {
  return res.status(200).json({ waybill: existing, idempotentHit: true, message: '...قبلاً صادر شده است' });
}
```

**چرا مهم است**: اگر کاربر دکمه ثبت را دو بار بزند یا شبکه قطع و وصل شود، بارنامه دوم صادر نمی‌شود. این برای اسناد مالی/رسمی حیاتی است.

---

## پردازش دسته‌ای

### ورودی

فایل اکسل با ستون‌های: پلاک، کد ملی راننده، شرح کالا، وزن، کلید یکتا.

### الگوریتم

```ts
const concurrency = workerConcurrency || 12;

for (let i = 0; i < jobs.length; i += concurrency) {
  const chunk = jobs.slice(i, i + concurrency);
  await Promise.all(chunk.map(async (job) => {
    // پردازش مستقل هر job
  }));
}
```

### ویژگی‌ها

| ویژگی | توضیح |
|-------|-------|
| هم‌زمانی کنترل‌شده | پیش‌فرض ۱۲ کارگر موازی |
| ایزولاسیون خطا | خطای یک job بقیه را متوقف نمی‌کند |
| ثبت نتیجه هر job | `SUCCESS` / `ERROR` + `durationMs` |
| ایجاد بارنامه واقعی | برای هر job موفق یک رکورد در `waybillsStore` |
| شماره سریال پیوسته | `1403/{10900 + waybillsStore.length}` |

### ساختار `BatchProcess`

```ts
interface BatchProcess {
  id: string;
  title: string;
  createdAt: string;
  totalJobs: number;
  completedJobs: number;
  successCount: number;
  errorCount: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  workerConcurrency: number;
  jobs: BatchJobItem[];
}
```

### خطای شبیه‌سازی‌شده

در پیاده‌سازی فعلی، هر آیتم پانزدهم عمداً خطا می‌گیرد:

```ts
const isError = (itemIndex + 1) % 15 === 0;
job.errorCode = 'ERR_SIPAAD_403_INSPECTION_EXPIRED';
```

این برای تست رفتار UI در مواجهه با خطاهای جزئی است. در محیط عملیاتی باید حذف شود.

---

## ثبت خودکار (Auto-Register)

### منطق

```
هر N دقیقه (پیش‌فرض ۱۵):
  برای هر پلاک فعال با isAutoRegisterEnabled = true:
    ├─ اگر در دوره ۱۵ روزه سهمیه باقی است → صدور
    └─ اگر سپاد OTP خواست → توقف برای آن پلاک + ثبت دلیل
```

### تنظیمات هر صادرکننده

```json
{
  "issuerId": "usr-sup-3873",
  "isAutoRegisterActive": true,
  "autoRegisterIntervalMinutes": 15,
  "updatedAt": "2026-09-29T09:16:11.050Z"
}
```

### کلیدهای API

| متد | مسیر |
|-----|------|
| `GET` | `/api/issuer/auto-register-status` |
| `POST` | `/api/issuer/auto-register-toggle` |
| `PATCH` | `/api/plates/:plate_id/toggle-auto-register` |

---

## احراز هویت دوعاملی (OTP)

### مدل داده

```ts
interface OTPRecord {
  id: string;
  mobile: string;
  purpose: 'ISSUER_AUTH' | 'DRIVER_VERIFICATION' | 'WAYBILL_REVOCATION';
  otpCode: string;
  expiresAt: string;
  isUsed: boolean;
  referenceId: string;
}
```

### چرخه کامل

```
۱. پشتیبان: POST /api/otp/trigger { driverId, serviceName }
   └─ ایجاد رکورد PENDING با انقضای ۲ دقیقه
   └─ درخواست کد از سپاد (شماره راننده)

۲. سپاد: ارسال پیامک به راننده

۳. پنل پیامک: POST /api/webhook/sms-panel
   └─ استخراج کد از متن
   └─ تطبیق با شماره راننده (۱۰ رقم آخر)
   └─ به‌روزرسانی رکورد → VERIFIED

۴. پشتیبان: GET /api/otp/pending
   └─ مشاهده کد و شمارش معکوس

۵. پشتیبان: POST /api/otp/verify { otpId, code }
   └─ ثبت در سپاد و ازسرگیری صدور
```

### تطبیق شماره موبایل

برای مقاومت در برابر تفاوت‌های قالب (`+98`, `0098`, `98`):

```ts
cleanPlateMobile.endsWith(cleanSearchMobile.slice(-10)) ||
cleanSearchMobile.endsWith(cleanPlateMobile.slice(-10))
```

یعنی فقط ۱۰ رقم آخر مقایسه می‌شود.

### استخراج کد از پیامک

الگوهای پشتیبانی‌شده:

```
"کد تایید شما 48213 می باشد"
"کد تایید: 48213"
"رمز پویا 4821"
"Code: 48213"
```

قواعد: کد **۴ تا ۶ رقم**، اولین تطابق معتبر، ارقام فارسی ابتدا به لاتین تبدیل می‌شوند.

### فیلدهای وضعیت OTP در پلاک

```ts
otpStatus?: 'VERIFIED' | 'PENDING_OTP' | 'NOT_REQUIRED';
pendingOtpCode?: string;
otpExpiresAt?: string;
otpRemainingSeconds?: number;
lastOtpRequestedAt?: string;
```

---

## اتوماسیون پس‌زمینه (FastAPI + Celery)

`backend/otp_automation.py` یک مسیر پیشرفته‌تر ارائه می‌دهد:

```
۱. پشتیبان درخواست صدور می‌دهد که OTP می‌خواهد
   └─ کلید Redis: otp_pending:<driver_id> با TTL

۲. راننده کد را در پنل خود وارد می‌کند
   └─ POST /api/drivers/submit-otp

۳. حذف کلید Redis و ارسال تسک Celery:
   └─ resume_waybill_issuance_task

۴. کارگر Celery:
   ├─ RegUserAuthenticateOTP_40WS
   └─ InsertBOL_01WS

۵. صدور بدون دخالت پشتیبان تکمیل می‌شود
```

اگر Redis یا Celery نصب نباشد، `InMemoryRedis` و اجرای در thread جایگزین می‌شوند تا توسعه محلی بدون زیرساخت ممکن باشد.

---

## رفت و برگشت (Round Trip)

بارنامه رفت و برگشت دو رکورد مرتبط می‌سازد:

```ts
isRoundTrip: true
roundTripLeg: 'OUTBOUND' | 'RETURN'
pairedWaybillId: 'wb-1234'
```

UI از `RoundTripWaybillModal` استفاده می‌کند و هر دو رکورد را با یک عملیات ایجاد می‌کند.

---

## تلاش مجدد

### `POST /api/plates/:plate_id/retry-waybill`

```
۱. یافتن پلاک
۲. بررسی خطای قبلی (lastErrorCode)
۳. پاک کردن وضعیت خطا
۴. ارسال مجدد به سپاد
۵. به‌روزرسانی lastIssuanceStatus
```

در FastAPI، این مسیر `202 Accepted` برمی‌گرداند و تسک را به صف Celery می‌سپارد.

### راهنمای اقدام به تفکیک خطا

| کد خطا | راهنمای اقدام |
|--------|----------------|
| `ERR_PERMIT_EXPIRED` | تمدید مجوز فعالیت |
| `ERR_INSPECTION_LAPSED` | تمدید معاینه فنی |
| `ERR_INSURANCE_MISMATCH` | تطبیق بیمه‌نامه با پلاک |
| `ERR_QUOTA_EXCEEDED` | صبر تا دوره بعد یا افزایش سهمیه |
| `ERR_SMARTCARD_REVOKED` | پیگیری کارت هوشمند |

---

## محدودیت دوره ۱۵ روزه

سهمیه صدور بارنامه در دوره‌های ۱۵ روزه جلالی محاسبه می‌شود:

```
مرحله اول: ۸ تا ۲۳ ماه جاری
مرحله دوم: ۲۳ ماه جاری تا ۷ ماه بعد
```

اگر `biweeklyWaybillCount >= biweeklyQuotaLimit` باشد، صدور برای آن پلاک متوقف و خطای `ERR_QUOTA_EXCEEDED` ثبت می‌شود. جزئیات در `08-fuel-quota.md`.

---

## فیلدهای کلیدی رکورد بارنامه

```ts
{
  id, trackingCode, waybillNumber, idempotencyKey, issueDateTime, status,
  companyCode, companyName, issuerUserName,
  senderName, senderNationalId, senderAddress, senderCity,
  receiverName, receiverNationalId, receiverAddress, receiverCity,
  cargoDescription, weightKg, packingType, cargoValueRials,
  freightCostRials, commissionRials, insuranceCostRials, municipalTollRials, totalCostRials,
  driver, vehicle,
  sipaadResponse: { sipaadCode, saltUsed, hashedSignature, serverTimestamp, statusText },
  errorMessage, errorCode, retryCount,
  isRoundTrip, roundTripLeg, pairedWaybillId
}
```

---

## چاپ بارنامه

`WaybillPrintModal` با `html2canvas` + `jspdf` رکورد را به PDF تبدیل می‌کند:

```
۱. رندر HTML قالب رسمی بارنامه
۲. html2canvas → تصویر با کیفیت بالا
۳. jspdf → صفحه A4
۴. دانلود با نام waybill-{number}.pdf
```

نمونه قالب شامل: سربرگ شرکت، شماره بارنامه، کد رهگیری، طرفین، محموله، بار مالی و محل امضا.
