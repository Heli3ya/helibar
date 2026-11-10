# مدل داده و ذخیره‌سازی

## دو لایه ذخیره‌سازی

```
┌──────────────────────────────────────────────────┐
│  لایه ۱: حافظه فرآیند (in-memory arrays)         │
│  سریع، بدون I/O، از دست رفتن با ری‌استارت        │
└───────────────────┬──────────────────────────────┘
                    │ save*ToDisk()
┌───────────────────▼──────────────────────────────┐
│  لایه ۲: فایل JSON در data/                      │
│  پایدار، بدون هم‌زمانی، مناسب تیم کوچک           │
└──────────────────────────────────────────────────┘
```

الگوی کار: خواندن در شروع → تغییر در حافظه → نوشتن کامل فایل پس از هر تغییر.

---

## فایل‌های `data/`

| فایل | محتوا | ذخیره‌ساز |
|------|-------|-----------|
| `system_users.json` | کاربران (پشتیبان، راننده، ادمین) | `saveUsersToDisk()` |
| `plates.json` | پلاک‌های ناوگان | `savePlatesToDisk()` |
| `waybills.json` | بارنامه‌ها | `saveWaybillsToDisk()` |
| `issuer_settings.json` | تنظیمات ثبت خودکار | `saveIssuerSettings()` |

### `system_users.json`

```json
[
  {
    "id": "usr-admin-heliya",
    "username": "heliya",
    "passwordHash": "heliya84",
    "role": "ADMIN",
    "fullName": "هلیا غفور (مدیر ارشد سامانه هلی‌بار)",
    "mobile": "09120000001",
    "isActive": true
  },
  {
    "id": "usr-drv-main",
    "username": "09124451092",
    "passwordHash": "Driver@1404",
    "role": "DRIVER",
    "fullName": "محمدجواد اصغری (راننده نیسان)",
    "mobile": "09124451092",
    "isActive": true
  }
]
```

> **هشدار جدی**: `passwordHash` در عمل **رمز خام** است. پیش از هر انتشار واقعی باید با bcrypt/argon2 جایگزین شود.

### `plates.json`

```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "owner_id": "usr-sup-test",
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
    "max_load_capacity_kg": 2200,
    "is_active": false,
    "is_auto_register_enabled": true,
    "created_at": "2026-09-26T13:29:05.180Z"
  }
]
```

### `issuer_settings.json`

```json
[
  {
    "issuerId": "usr-sup-3873",
    "isAutoRegisterActive": false,
    "autoRegisterIntervalMinutes": 15,
    "updatedAt": "2026-09-29T09:16:11.050Z",
    "lastDisabledReason": "CODED_PLATE_OTP_REQUIRED",
    "lastDisabledPlate": "81 ع 641 - 22",
    "lastDisabledAt": "2026-09-29T09:16:11.050Z"
  }
]
```

### `waybills.json`

ساختار همان `StoredWaybill` است: اطلاعات طرفین، محموله، بار مالی، خودرو، راننده و پاسخ سپاد.

---

## ساختارهای حافظه

| نام | نوع | پایدار؟ |
|-----|-----|---------|
| `systemUsersStore` | `SystemUser[]` | ✅ `system_users.json` |
| `platesStore` | `ServerPlate[]` | ✅ `plates.json` |
| `waybillsStore` | `StoredWaybill[]` | ✅ `waybills.json` |
| `idempotencyStore` | `Map<string, StoredWaybill>` | ❌ (از waybills بازسازی می‌شود) |
| `otpRequestsStore` | `ServerOtpRequest[]` | ❌ |
| `supportAssignmentsStore` | `SupportDriverMapping[]` | ❌ |
| `sipaadLiveSettings` | آبجکت تنظیمات | ❌ (از env مقدار اولیه می‌گیرد) |

### `idempotencyStore`

پس از بارگذاری بارنامه‌ها، map دوباره پر می‌شود:

```ts
waybillsStore.forEach(wb => idempotencyStore.set(wb.idempotencyKey, wb));
```

---

## مدل‌های دامنه (فرانت‌اند)

`src/types.ts` مرجع تایپ‌هاست. ارتباط‌ها:

```
WaybillItem
├── driver: DriverInfo
│   ├── fullName, nationalCode, mobile
│   ├── smartCardNumber, licenseNumber
│   └── assignedSupportId, assignedSupportName
└── vehicle: VehicleInfo
    ├── plate: IranPlate
    │   ├── part1, letter, part2, provinceCode, type
    ├── vehicleType, smartCardNumber
    ├── technicalInspectionExpiry, insurancePolicyNumber
    ├── maxLoadCapacityKg, vinNumber, fuelType
    ├── permitStatus / permitErrorCode / permitErrorMessage
    ├── isActive, isAutoRegisterEnabled, carriageStatus
    ├── otpStatus, pendingOtpCode, otpExpiresAt
    ├── lastTraceCode, lastErrorCode, lastErrorMessage
    ├── biweeklyWaybillCount, stage1WaybillCount, stage2WaybillCount
    └── biweeklyQuotaLimit, fuelQuotaLiters

FuelQuotaRecord
├── plate: IranPlate
└── history: FuelPeriodRecord[]

AuthUser
├── id, username, role, roleTitle
├── companyCode, companyName, nationalId
├── permitNumber, plateCapacity
└── days_left, is_active, created_at
```

---

## قواعد یکتایی و ظرفیت

### یکتایی پلاک

```ts
normalizePlateKey(part1, letter, part2, province)
// "43" + "ع" + "789" + "77" → "43ع78977"
```

حذف فاصله، خط تیره و «ایران»؛ سپس lowercase.

قاعده: برای هر `owner_id`، ترکیب پلاک **یا** کد ملی راننده نباید تکراری باشد.

### ظرفیت

| نقش | سقف |
|-----|-----|
| `ADMIN` | بدون سقف |
| `SUPPORT` | مقدار `plateCapacity` (۵۰/۱۵۰/۳۵۰/۵۵۰/۷۰۰) |

شمارش فقط پلاک‌های `is_active = true` را در نظر می‌گیرد.

---

## ایزولاسیون داده

هر رکورد پلاک و بارنامه یک `owner_id` دارد. فیلتر در همه مسیرها اعمال می‌شود:

```ts
platesStore.filter(p => p.owner_id === tenant.id)
```

خطر: اگر یک مسیر جدید اضافه شود و فیلتر فراموش شود، نشت داده رخ می‌دهد. راه‌حل بلندمدت: encapsulate در یک repository با فیلتر اجباری.

---

## هم‌زمانی و یکپارچگی

| ریسک | وضعیت فعلی | توصیه |
|------|------------|-------|
| نوشتن هم‌زمان فایل | `writeFileSync` بدون قفل | افزودن قفل یا نوشتن اتمیک (tmp + rename) |
| چند نمونه سرور | هر نمونه حافظه مستقل | مهاجرت به Postgres |
| از دست رفتن داده در ری‌استارت | OTP و تخصیص‌ها ذخیره نمی‌شوند | persist یا Redis |
| Idempotency در چند نمونه | فقط در حافظه | قفل توزیع‌شده یا unique index در DB |

### نوشتن اتمیک پیشنهادی

```ts
const tmp = `${file}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
fs.renameSync(tmp, file);
```

---

## مهاجرت به پایگاه داده

مسیر پیشنهادی:

```
۱. ساخت schema در Postgres مطابق backend/models.py
۲. نوشتن اسکریپت مهاجرت از JSON به جدول‌ها
۳. جایگزینی آرایه‌ها با repository
۴. افزودن Alembic برای نسخه‌بندی schema
۵. افزودن index روی owner_id و idempotency_key
```

### نگاشت پیشنهادی

| JSON | جدول |
|------|------|
| `system_users.json` | `users` |
| `plates.json` | `plates` |
| `waybills.json` | `waybills` |
| `issuer_settings.json` | `issuer_settings` (جدید) |
| `otpRequestsStore` | `driver_otp_requests` |
| `supportAssignmentsStore` | `support_driver_assignments` |

---

## پشتیبان‌گیری

```bash
# پشتیبان ساده
cp -r data data-backup-$(date +%Y%m%d)

# بازگردانی
cp -r data-backup-20261102/* data/
```

برای محیط عملیاتی، پشتیبان روزانه + نگهداری ۳۰ روزه توصیه می‌شود.

---

## نکات بازبینی داده

1. `data/` را در git نگه ندارید اگر شامل داده واقعی است؛ فقط نمونه بگذارید.
2. قبل از هر تغییر schema، پشتیبان بگیرید.
3. رکوردهای `is_active: false` را حذف نکنید؛ فقط غیرفعال کنید (برای سابقه).
4. `created_at` مبنای محاسبه اشتراک است؛ آن را دستکاری نکنید.
