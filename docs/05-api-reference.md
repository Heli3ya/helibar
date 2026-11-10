# مرجع API — سرور Express

آدرس پایه: `http://localhost:3000`

تمام بدنه‌ها `application/json` هستند مگر خلاف آن ذکر شود. احراز هویت با هدر زیر انجام می‌شود:

```
Authorization: Bearer <access_token>
```

---

## ۱. سلامت سرویس

### `GET /api/health`

بدون احراز هویت.

```json
{
  "status": "ok",
  "service": "Urban Freight Waybill System (UTCMS / Sipaad Gateway)",
  "version": "2.4.0",
  "timestamp": "2026-11-02T08:00:00.000Z"
}
```

---

## ۲. احراز هویت

| متد | مسیر | بدنه | پاسخ |
|-----|------|------|------|
| `POST` | `/api/auth/login` | `{ username, password }` | توکن + کاربر |
| `POST` | `/api/auth/signup` | `{ username, password, fullName, mobile }` | `201` + توکن |
| `GET` | `/api/users/me` | — | پروفایل + `days_left` |
| `GET` | `/api/auth/my-drivers` | — | رانندگان تخصیص‌یافته |

نمونه خطا:

```json
// 401
{ "detail": "نامعتبر" }

// 403 — حساب مسدود
{ "detail": "عدم دسترسی صادرکننده: حساب کاربری شما توسط مدیر ارشد مسدود گردیده است." }
```

---

## ۳. سپاد / UTCMS

| متد | مسیر | توضیح |
|-----|------|-------|
| `POST` | `/api/sipaad/hash` | محاسبه هش امنیتی SHA-512 |
| `POST` | `/api/sipaad/test-connection` | تست اتصال + تشخیص شبکه + IP سرور |
| `POST` | `/api/sipaad/WS01_InsertBOL` | ثبت بارنامه |
| `POST` | `/api/sipaad/WS03_StartBOL` | شروع سفر |
| `POST` | `/api/sipaad/WS06_InsertBOLTrack` | ثبت رهگیری |
| `POST` | `/api/sipaad/WS04_EndBOL` | پایان سفر |
| `POST` | `/api/sipaad/WS11_GetProvinces` | فهرست استان‌ها |
| `POST` | `/api/sipaad/WS12_GetCities` | شهرهای یک استان |
| `POST` | `/api/sipaad/WS41_GetDriverInfo` | استعلام راننده |
| `POST` | `/api/sipaad/WS42_GetFleetInfo` | استعلام ناوگان |
| `GET` | `/api/sipaad/live-config` | خواندن تنظیمات اتصال |
| `POST` | `/api/sipaad/live-config` | ذخیره تنظیمات اتصال |
| `POST` | `/api/sipaad/test-driver-inquiry` | استعلام آزمایشی راننده |

### نمونه `POST /api/sipaad/hash`

```json
// Request
{ "companyCode": "24981", "password": "MyPass", "salt": 87192843 }

// Response
{
  "companyCode": "24981",
  "passwordSha512": "a3f5...",
  "salt": 87192843,
  "hashedValue": "b4a8...",
  "calculatedAt": "2026-11-02T08:00:00.000Z",
  "rawStringBeforeFinalHash": "24981a3f5...87192843"
}
```

### نمونه `POST /api/sipaad/test-connection`

```json
// Request
{ "companyCode": "24981", "password": "•••", "isSandboxMode": false }

// Response (موفق)
{
  "success": true,
  "latencyMs": 312,
  "endpointBol": "https://services2.sipaad.ir/ITMBOL.asmx",
  "endpointFreighter": "https://services2.sipaad.ir/ITMFreighter.asmx",
  "freighterStatus": "OK",
  "bolStatus": "OK",
  "serverIp": "5.23.xx.xx",
  "currentMode": "live"
}
```

---

## ۴. بارنامه

### `GET /api/waybills`

لیست بارنامه‌های مستأجر جاری.

```json
{ "waybills": [ { "id": "wb-1001", "waybillNumber": "1403/10892", "...": "..." } ] }
```

### `POST /api/waybills`

صدور بارنامه تکی. اگر `idempotencyKey` تکراری باشد، رکورد قبلی با `idempotentHit: true` برگردانده می‌شود.

```json
{
  "idempotencyKey": "IDEMP-24981-43ع78977-14030701-A",
  "companyCode": "24981",
  "senderName": "کارخانه آرد سپید البرز",
  "senderCity": "تهران",
  "receiverName": "نانوایی زرین خوشه",
  "receiverCity": "تهران",
  "cargoDescription": "کیسه آرد",
  "weightKg": 2000,
  "packingType": "کیسه پالت‌بندی",
  "cargoValueRials": 180000000,
  "freightCostRials": 12500000,
  "commissionRials": 1250000,
  "insuranceCostRials": 450000,
  "municipalTollRials": 625000,
  "vehicle": { "plate": { "part1": "43", "letter": "ع", "part2": "789", "provinceCode": "77" } },
  "driver": { "fullName": "محمدجواد اصغری", "nationalCode": "0078192341" }
}
```

پاسخ:

```json
{
  "waybill": {
    "id": "wb-1234",
    "trackingCode": "UTCMS-140307-889104",
    "waybillNumber": "1403/10894",
    "status": "ISSUED",
    "sipaadResponse": {
      "sipaadCode": "SIPAAD-ACK-992109",
      "saltUsed": 87192843,
      "hashedSignature": "b4a8...",
      "statusText": "ثبت قطعی در وب‌سرویس ITMBOL سپاد"
    }
  },
  "idempotentHit": false
}
```

### `POST /api/waybills/register-transport`

ثبت بارنامه همراه با شروع حمل.

### `POST /api/batch`

پردازش دسته‌ای با کنترل هم‌زمانی و ایزولاسیون خطا.

```json
{
  "batchId": "batch-2026-11-02",
  "workerConcurrency": 12,
  "companyCode": "24981",
  "jobs": [
    {
      "jobId": "job-1",
      "plate": { "part1": "43", "letter": "ع", "part2": "789", "provinceCode": "77" },
      "driverNationalCode": "0078192341",
      "driverName": "محمدجواد اصغری",
      "cargoDescription": "کیسه آرد",
      "weightKg": 2000,
      "idempotencyKey": "IDEMP-BATCH-1"
    }
  ]
}
```

پاسخ شامل `successCount`، `errorCount` و آرایه `jobs` با `status` هر آیتم (`SUCCESS` / `ERROR`) است.

> در پیاده‌سازی فعلی، هر آیتم پانزدهم به‌صورت عمدی خطای `ERR_SIPAAD_403_INSPECTION_EXPIRED` می‌گیرد تا رفتار خطا در محیط تست شبیه‌سازی شود.

---

## ۵. مدیریت رانندگان

| متد | مسیر | توضیح |
|-----|------|-------|
| `POST` | `/api/drivers/validate` | اعتبارسنجی اطلاعات راننده |
| `POST` | `/api/drivers/confirm` | تأیید و ثبت راننده |
| `GET` | `/api/drivers/excel-template` | دانلود قالب اکسل |
| `POST` | `/api/drivers/bulk-upload` | آپلود اکسل (multipart، فیلد `file`، حداکثر ۲۵MB) |
| `GET` | `/api/drivers/waybill-stats` | آمار باربرگ راننده |
| `POST` | `/api/drivers/add` | افزودن راننده |
| `POST` | `/api/drivers/change-password` | تغییر رمز راننده |
| `POST` | `/api/drivers/submit-otp` | ثبت کد دوعاملی توسط راننده |
| `POST` | `/api/drivers/import` | ایمپورت گروهی |

---

## ۶. کد دوعاملی (OTP)

| متد | مسیر | توضیح |
|-----|------|-------|
| `POST` | `/api/otp/trigger` | درخواست کد برای راننده توسط پشتیبان |
| `GET` | `/api/otp/pending` | لیست OTPهای در انتظار |
| `POST` | `/api/otp/verify` | تأیید دستی کد |
| `GET` | `/api/otp/driver/dashboard` | داشبورد راننده |
| `POST` | `/api/webhook/sms-panel` | دریافت پیامک از پنل SMS |

### `POST /api/otp/trigger`

```json
{ "driverId": "usr-drv-main", "serviceName": "SIPAAD_2FA" }
```

### `POST /api/webhook/sms-panel`

این مسیر **بدون احراز هویت** است و باید از سمت پنل پیامک فراخوانی شود.

فرمت‌های پذیرفته‌شده:

```
DRIVER:09123333333-SMS:کد تایید شما 48213 می باشد
```

یا:

```json
{ "driver_phone": "09123333333", "message": "کد تایید: 48213" }
```

منطق پردازش:
1. استخراج شماره موبایل معتبر (`09XXXXXXXXX`)
2. استخراج کد ۴ تا ۶ رقمی از متن
3. تطبیق با `platesStore` و `otpRequestsStore` (مقایسه ۱۰ رقم آخر)
4. تعیین صاحب (Issuer) از OTP در انتظار یا پلاک یا کاربر
5. به‌روزرسانی رکورد به `VERIFIED`

خطا:

```json
// 400
{
  "success": false,
  "error": "INVALID_WEBHOOK_PAYLOAD",
  "detail": "فرمت پیامک دریافتی نامعتبر است..."
}
```

---

## ۷. پلاک‌ها و ناوگان

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/api/plates` | لیست پلاک‌های مستأجر |
| `POST` | `/api/plates` | افزودن پلاک (با dedup و کنترل ظرفیت) |
| `GET` | `/api/plates/:plate_id` | جزئیات پلاک |
| `PUT` | `/api/plates/:plate_id` | ویرایش پلاک |
| `DELETE` | `/api/plates/:plate_id` | حذف پلاک |
| `PATCH` | `/api/plates/:plate_id/toggle-auto-register` | روشن/خاموش کردن ثبت خودکار |
| `POST` | `/api/plates/:plate_id/retry-waybill` | تلاش مجدد صدور |

### `POST /api/plates`

```json
{
  "plate_number": "43 ع 789 - 77",
  "plate_part1": "43",
  "plate_letter": "ع",
  "plate_part2": "789",
  "plate_province": "77",
  "vehicle_type": "وانت نیسان",
  "smart_card_number": "DRV-881923",
  "driver_name": "اصغر قربانی",
  "driver_national_id": "0078192341",
  "driver_mobile": "09123333333",
  "max_load_capacity_kg": 2200
}
```

رفتار ویژه:
- **Dedup**: اگر پلاک یا کد ملی راننده برای همان مستأجر موجود باشد، رکورد قبلی به‌روزرسانی و `200` برگردانده می‌شود (بدون رکورد جدید).
- **ظرفیت**: برای غیر ادمین، اگر تعداد پلاک‌های فعال به سقف برسد:

```json
// 400
{
  "detail": "تکمیل ظرفیت پلاک",
  "message": "تکمیل ظرفیت پلاک: سقف مجاز ثبت پلاک (150) برای حساب شما به اتمام رسیده است."
}
```

---

## ۸. استعلام سوخت

### `GET /api/fuel-inquiry/:plate_id?stage=1|2`

`stage=1`: ۸ تا ۲۳ ماه جلالی جاری
`stage=2`: ۲۳ ماه جاری تا ۸ ماه بعد

```json
{
  "status": "success",
  "plate_id": "43ع78977",
  "stage": 1,
  "period_label": "مرحله اول (۸ تا ۲۳ مهر ۱۴۰۵)",
  "fuel_amount": 1010,
  "base_quota": 450,
  "performance_quota": 560,
  "waybill_count": 14,
  "fuel_type": "گازوئیل",
  "start_timestamp": 1790294400,
  "end_timestamp": 1791590400,
  "start_date": "1405/07/08 00:00:00",
  "end_date": "1405/07/23 00:00:00",
  "unit": "لیتر"
}
```

---

## ۹. داشبورد و آرشیو

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/api/dashboard-stats` | آمار کلی مستأجر |
| `GET` | `/api/issuer/auto-register-status` | وضعیت ثبت خودکار |
| `POST` | `/api/issuer/auto-register-toggle` | تغییر وضعیت ثبت خودکار |
| `POST` | `/api/webhook/test-simulate-coded-plate` | شبیه‌سازی پلاک کددار |

---

## ۱۰. اشتراک

| متد | مسیر | بدنه | توضیح |
|-----|------|------|-------|
| `GET` | `/api/subscription/status` | — | روزهای باقی‌مانده |
| `POST` | `/api/subscription/set-demo` | `{ days }` | تنظیم دستی برای دمو |

```json
// GET /api/subscription/status
{
  "days_left": 22,
  "is_payment_approved": true,
  "status": "ACTIVE",
  "warning": null
}
```

---

## ۱۱. پنل ادمین

همه مسیرهای `/api/admin/*` فقط برای نقش `ADMIN` مجاز هستند و از مسدودسازی اشتراک معاف‌اند.

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/api/admin/users/supports` | لیست کاربران (به‌جز heliya) |
| `POST` | `/api/admin/users/create-support` | ساخت پنل پشتیبان |
| `PATCH` | `/api/admin/users/:user_id/capacity` | تغییر ظرفیت پلاک |
| `PATCH` | `/api/admin/users/:user_id/toggle-access` | مسدود/آزاد کردن |
| `POST` | `/api/admin/users/:user_id/approve-payment` | تأیید پرداخت و تمدید |
| `DELETE` | `/api/admin/users/:user_id` | حذف کامل کاربر |

### `POST /api/admin/users/create-support`

```json
{
  "full_name": "شرکت حمل بار آفتاب",
  "phone_number": "09121234567",
  "username": "aftab",
  "password": "SecurePass123",
  "national_id": "10101234567",
  "address": "تهران، خیابان آزادی",
  "province_city": "تهران",
  "plate_capacity": 350
}
```

مقادیر مجاز `plate_capacity`: `50`, `150`, `350`, `550`, `700`

خطاها:

```json
// 400
{ "detail": "ظرفیت پلاک نامعتبر است. تنها مقادیر [50, 150, 350, 550, 700] مجاز هستند." }

// 400
{ "detail": "کاربری با نام کاربری «aftab» یا شماره تلفن «09121234567» قبلاً در سامانه ثبت شده است." }

// 403 — تلاش برای حذف ادمین
{ "detail": "امکان حذف حساب کاربری مدیر کل سیستم (heliya) وجود ندارد." }
```

---

## کدهای خطای رایج

| کد HTTP | معنا | نمونه پیام |
|---------|------|------------|
| `400` | ورودی نامعتبر | `شماره پلاک الزامی است.` |
| `401` | احراز هویت ناموفق | `نامعتبر` |
| `403` | اشتراک منقضی یا دسترسی ممنوع | `SUBSCRIPTION_EXPIRED` |
| `404` | منبع یافت نشد | `پلاک مورد نظر یافت نشد` |
| `500` | خطای سرور | `Internal Server Error` |

---

## قالب هدرهای اشتراک

هر پاسخ API (به‌جز مسیرهای معاف) این هدرها را دارد:

```
X-Sub-Days-Left: 12
X-Sub-Warning: 14_DAYS | 7_DAYS_BLINKING | SUBSCRIPTION_EXPIRED
Access-Control-Expose-Headers: X-Sub-Warning, X-Sub-Days-Left
```
