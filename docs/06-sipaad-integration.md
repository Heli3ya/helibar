# اتصال به سپاد (UTCMS)

## سپاد چیست؟

**سپاد** (سامانه پایش اطلاعات حمل‌ونقل بار) یا **UTCMS** سامانه رسمی شهرداری برای ثبت و رهگیری بارنامه شهری است. دسترسی از طریق وب‌سرویس‌های **SOAP/ASMX** انجام می‌شود:

| سرویس | آدرس | کاربرد |
|-------|------|--------|
| `ITMFreighter.asmx` | `https://services2.sipaad.ir/ITMFreighter.asmx` | استعلام راننده، ناوگان، استان و شهر |
| `ITMBOL.asmx` | `https://services2.sipaad.ir/ITMBOL.asmx` | ثبت، شروع، رهگیری و خاتمه بارنامه |

---

## الگوریتم هش امنیتی

سپاد برای احراز هویت هر درخواست، یک امضای SHA-512 می‌خواهد. فرمول دقیق:

```
passwordSha512 = SHA512(password)
hashedValue    = SHA512(companyCode + passwordSha512 + salt)
```

که در آن `salt` یک عدد صحیح تصادفی ۸ رقمی است.

### پیاده‌سازی سرور (`server.ts`)

```ts
function computeSipaadSecurityHashServer(companyCode: string, plainPassword: string, salt?: number) {
  const chosenSalt = salt ?? Math.floor(10000000 + Math.random() * 89999999);
  const passwordSha512 = crypto.createHash('sha512').update(plainPassword, 'utf8').digest('hex');
  const concatenated = `${companyCode}${passwordSha512}${chosenSalt}`;
  const hashedValue = crypto.createHash('sha512').update(concatenated, 'utf8').digest('hex');
  return { companyCode, passwordSha512, salt: chosenSalt, hashedValue, calculatedAt: ..., rawStringBeforeFinalHash: concatenated };
}
```

### پیاده‌سازی کلاینت (`src/lib/sipaadCrypto.ts`)

از `crypto.subtle.digest('SHA-512', ...)` در مرورگر استفاده می‌کند و در نبود آن به `node:crypto` برمی‌گردد.

### پیاده‌سازی پایتون

در `backend/security.py` و `backend/utcms_client.py` همین فرمول با `hashlib.sha512` پیاده شده است.

### نمونه محاسبه

```
companyCode = "24981"
password    = "MyPass"
salt        = 87192843

passwordSha512 = a3f5c9... (128 hex char)
rawString      = "24981a3f5c9...87192843"
hashedValue    = b4a8e9... (128 hex char)
```

### نکات مهم

1. **`salt` هر بار باید تصادفی باشد**؛ استفاده مجدد از salt امنیت را کاهش می‌دهد.
2. **رمز خام هرگز به مرورگر ارسال نمی‌شود** در مسیرهای عادی؛ هش در سرور محاسبه می‌شود.
3. طول خروجی SHA-512 همیشه **۱۲۸ کاراکتر hex** است.

---

## قاعده `null` در JSON

سپاد در برخی فیلدهای اختیاری، **حذف کلید** را نمی‌پذیرد و انتظار `null` صریح دارد. تابع `formatSipaadPayloadServer` این کار را انجام می‌دهد:

```ts
function formatSipaadPayloadServer(payload, optionalFields: string[]) {
  const sanitized = { ...payload };
  for (const field of optionalFields) {
    if (sanitized[field] === undefined || sanitized[field] === null || sanitized[field] === '') {
      sanitized[field] = null;
    }
  }
  return sanitized;
}
```

نمونه:

```json
{
  "CompanyCode": "24981",
  "WaybillNumber": "1403/10894",
  "TransitPermitCode": null,
  "SpecialPermit": null,
  "TrackingRemarks": null
}
```

نسخه فرانت‌اند این تابع: `formatSipaadJsonPayload` در `src/lib/sipaadCrypto.ts`.

---

## وب‌سرویس‌های پیاده‌شده

| کد | نام | ورودی | خروجی |
|----|-----|-------|-------|
| `WS01` | `InsertBOL` | `CompanyCode`, `Salt`, `HashedValue`, `BOL` | `TrackingCode`, `WaybillNumber`, `ExceptionCnt` |
| `WS03` | `StartBOL` | `TrackingCode`, `StartDateTime` | `ResultCode`, `Status: STARTED` |
| `WS04` | `EndBOL` | `TrackingCode`, `EndDateTime`, `UnloadWeightKg` | `ResultCode` |
| `WS06` | `InsertBOLTrack` | `TrackingCode`, `GPSList` | `RecordedPoints` |
| `WS11` | `GetProvinces` | — | فهرست استان‌ها |
| `WS12` | `GetCities` | `ProvinceCode` | فهرست شهرها |
| `WS41` | `GetDriverInfo` | `NationalCode` | اطلاعات راننده |
| `WS42` | `GetFleetInfo` | `PlateNumber` | اطلاعات ناوگان |

### نمونه `WS01_InsertBOL`

```json
// Request
{
  "CompanyCode": "24981",
  "Salt": 87192843,
  "HashedValue": "b4a8e9...",
  "BOL": {
    "SenderName": "کارخانه آرد",
    "ReceiverName": "نانوایی زرین",
    "DriverNationalCode": "0078192341",
    "CargoWeightKg": 2000
  }
}

// Response موفق
{
  "TrackingCode": "UTCMS-BOL-889104-4821",
  "WaybillNumber": "1403/48213",
  "IssueDate": "2026-11-02T08:00:00.000Z",
  "ExceptionCnt": { "ErrorCode": 0, "ErrorDesc": "باربرگ با موفقیت در سامانه سپاد صادر شد." }
}
```

---

## کدهای خطای سپاد

| کد | معنا | اقدام |
|----|------|------|
| `0` | موفق | — |
| `445001` | امضای امنیتی یا کد شرکت نامعتبر | salt و رمز را بررسی کنید |
| `445010` | کد رهگیری یافت نشد | `TrackingCode` را بررسی کنید |
| `445030` | اطلاعات اجباری ناقص | فیلدهای اجباری BOL را کامل کنید |
| `ERR_SIPAAD_403_INSPECTION_EXPIRED` | معاینه فنی منقضی | تمدید معاینه فنی خودرو |

نگاشت خطا به پیام فارسی در UI از طریق `ErrorReportsView` و `suggestedAction` در `VehicleInfo` انجام می‌شود.

---

## دو حالت اتصال

### `SIPAAD_MODE=simulation`

- هیچ درخواست شبکه‌ای به سپاد ارسال نمی‌شود.
- کد رهگیری و شماره بارنامه تصادفی تولید می‌شوند.
- تأخیر مصنوعی ۴۵ تا ۸۵ میلی‌ثانیه برای شبیه‌سازی شبکه.
- مناسب توسعه، تست و دمو.

### `SIPAAD_MODE=live`

- پاکت SOAP واقعی به آدرس‌های `.asmx` ارسال می‌شود.
- تایم‌اوت پیش‌فرض ۱۵ ثانیه (`SIPAAD_TIMEOUT_MS`).
- در تست اتصال، IP عمومی سرور از `https://api.ipify.org` خوانده می‌شود؛ این IP باید در سامانه سپاد whitelist شده باشد.

---

## تشخیص اتصال

`POST /api/sipaad/test-connection` این مراحل را انجام می‌دهد:

```
۱. خواندن URLهای فعال از sipaadLiveSettings
۲. دریافت IP عمومی سرور (timeout 2.5s، در صورت خطا: "غیرقابل دریافت")
۳. اگر isSandboxMode → پاسخ موفق ساختگی
۴. Probe با GET به freighterUrl (timeout 6s)
   - وضعیت 200 یا 405 → OK  (405 یعنی endpoint زنده است ولی GET نمی‌پذیرد)
   - غیر آن → FAIL
۵. بازگشت latencyMs، freighterStatus، bolStatus، serverIp
```

### تفسیر نتایج

| freighterStatus | معنا | راه‌حل |
|-----------------|------|--------|
| `OK` | سرور سپاد در دسترس | ادامه دهید |
| `FAIL` + `serverIp: نامشخص` | سرور به اینترنت بین‌الملل دسترسی ندارد | پروکسی یا DNS را بررسی کنید |
| `FAIL` + `serverIp` موجود | IP در whitelist سپاد نیست | درخواست افزودن IP |
| تایم‌اوت | فایروال یا مسیر شبکه | پورت ۴۴۳ خروجی را بررسی کنید |

---

## پلاک کددار

برخی پلاک‌ها در سپاد نیازمند **کد دوعاملی** هستند. چرخه:

```
۱. ثبت خودکار برای پلاک اجرا می‌شود
۲. سپاد پاسخ می‌دهد: «نیازمند OTP»
۳. وضعیت پلاک به CODED_PLATE_OTP_REQUIRED تغییر می‌کند
۴. ثبت خودکار برای آن صادرکننده غیرفعال می‌شود
   (در data/issuer_settings.json ثبت می‌شود)
۵. حلقه ثبت سراسری ادامه می‌یابد و بقیه پلاک‌ها پردازش می‌شوند
```

نمونه رکورد در `issuer_settings.json`:

```json
{
  "issuerId": "usr-sup-3873",
  "isAutoRegisterActive": false,
  "autoRegisterIntervalMinutes": 15,
  "lastDisabledReason": "CODED_PLATE_OTP_REQUIRED",
  "lastDisabledPlate": "81 ع 641 - 22",
  "lastDisabledAt": "2026-09-29T09:16:11.050Z"
}
```

---

## ساختار پلاک ایران

```ts
interface IranPlate {
  part1: string;        // دو رقم: "43"
  letter: string;       // حرف: "ع" (حمل‌ونقل عمومی)
  part2: string;        // سه رقم: "789"
  provinceCode: string; // کد استان: "77"
  type: 'public' | 'commercial' | 'private' | 'governmental';
}
```

حروف مجاز: `الف ب پ ت ث ج د ر ز س ش ص ط ع ف ق ک گ ل م ن و ه ی معلول`

اعتبارسنجی و تبدیل ارقام فارسی در `src/lib/iranPlate.ts`.

### کلید یکتاسازی پلاک

```ts
normalizePlateKey = `${part1}${letter}${part2}${province}`.toLowerCase()
// حذف فاصله، خط تیره و کلمه «ایران»
```

این کلید برای جلوگیری از ثبت تکراری پلاک استفاده می‌شود.

---

## چک‌لیست اتصال به محیط عملیاتی

- [ ] `SIPAAD_MODE=live` تنظیم شده
- [ ] `SIPAAD_COMPANY_CODE` و `SIPAAD_COMPANY_PASSWORD` صحیح
- [ ] IP سرور در whitelist سپاد ثبت شده
- [ ] دسترسی خروجی HTTPS به `services2.sipaad.ir` برقرار
- [ ] `POST /api/sipaad/test-connection` پاسخ `success: true` می‌دهد
- [ ] `POST /api/sipaad/hash` خروجی ۱۲۸ کاراکتری می‌دهد
- [ ] یک بارنامه آزمایشی با موفقیت ثبت و سپس ابطال شده
