# استعلام سهمیه سوخت

## منطق کلی

سهمیه سوخت هر خودرو در دو دوره **۱۵ روزه جلالی** محاسبه می‌شود. مبنای محاسبه، تعداد باربرگ صادرشده در همان بازه است.

```
سهمیه کل = سهمیه پایه + (تعداد باربرگ × نرخ هر باربرگ)
```

---

## مرزهای دوره جلالی

| مرحله | شروع | پایان | برچسب نمونه |
|-------|------|-------|-------------|
| **مرحله اول** | روز ۸ ماه جاری، ساعت ۰۰:۰۰ | روز ۲۳ ماه جاری، ساعت ۰۰:۰۰ | «مرحله اول (۸ تا ۲۳ مهر ۱۴۰۵)» |
| **مرحله دوم** | روز ۲۳ ماه جاری، ساعت ۰۰:۰۰ | روز ۸ ماه بعد، ساعت ۰۰:۰۰ | «مرحله دوم (۲۳ مهر تا ۸ آبان ۱۴۰۵)» |

> توجه: در پیاده‌سازی فعلی Express، تاریخ‌ها برای سال ۱۴۰۵ به‌صورت ثابت (hardcoded) محاسبه شده‌اند. نسخه پایتون (`backend/jalali_periods.py`) این محاسبه را به‌صورت داینامیک و مبتنی بر تقویم انجام می‌دهد.

### محاسبه در پایتون

`backend/jalali_periods.py` دو مسیر دارد:

1. اگر `jdatetime` نصب باشد → تبدیل دقیق با کتابخانه
2. در غیر این صورت → الگوریتم نجومی داخلی (`_gregorian_to_jalali` / `_jalali_to_gregorian`)

توابع عمومی:

```python
from backend.jalali_periods import calculate_fuel_stage_timestamps, add_jalali_month, format_jalali_date

boundaries = calculate_fuel_stage_timestamps(stage=1)
# {
#   "start_datetime": datetime(...),
#   "end_datetime": datetime(...),
#   "start_timestamp": 1790294400,
#   "end_timestamp": 1791590400,
#   "period_label": "مرحله اول (۸ تا ۲۳ مهر ۱۴۰۵)"
# }
```

---

## فرمول سهمیه

### ضرایب

| نوع سوخت | سهمیه پایه | نرخ هر باربرگ |
|----------|------------|----------------|
| گازوئیل | ۴۵۰ لیتر | ۴۰ لیتر |
| بنزین | ۲۰۰ لیتر | ۲۵ لیتر |

### تشخیص نوع سوخت

```
اگر پلاک شامل «بنزین» باشد یا شناسه پلاک به «12» ختم شود → بنزین
در غیر این صورت → گازوئیل
```

### نمونه محاسبه

```
پلاک: 43 ع 789 - 77 (گازوئیل)
تعداد باربرگ در دوره: 14

performance_quota = 14 × 40 = 560
fuel_amount       = 450 + 560 = 1010 لیتر
```

---

## شمارش باربرگ

```ts
const matchingWaybills = waybillsStore.filter(w => {
  const wbPlate = `${w.plate.part1}${w.plate.letter}${w.plate.part2}`.replace(/\s+/g, '');
  return cleanPlate.includes(wbPlate) || wbPlate.includes(cleanPlate);
});
```

پلاک‌ها قبل از مقایسه از فاصله و خط تیره پاک می‌شوند.

### حالت جایگزین (Fallback)

اگر هیچ باربرگی یافت نشود، برای نمایش دمو یک عدد **قطعی** از هش پلاک تولید می‌شود:

```ts
const hash = cleanPlate.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
stageWaybillCount = stage === 1 ? 5 + (hash % 6) : 4 + (hash % 5);
```

این تضمین می‌کند که برای یک پلاک مشخص، همیشه همان عدد نمایش داده شود (بدون پرش تصادفی در رفرش).

---

## ساختار پاسخ API

```
GET /api/fuel-inquiry/:plate_id?stage=1
```

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

## مدل داده سمت کلاینت

### `FuelQuotaRecord`

```ts
interface FuelQuotaRecord {
  id: string;
  plate: IranPlate;
  vin: string;
  vehicleType: string;
  fuelType: 'گازوئیل' | 'بنزین';
  smartCardNumber: string;
  fuelCardPan: string;          // شماره کارت سوخت
  driverName: string;
  currentPeriodName: string;    // "نیمه اول مهر ۱۴۰۵"
  biweeklyWaybillCount: number;
  baseQuotaLiters: number;
  performanceQuotaLiters: number;
  totalCurrentQuotaLiters: number;
  lastDepositDate: string;
  depositStatus: 'DEPOSITED' | 'PENDING' | 'CALCULATING' | 'REJECTED';
  history: FuelPeriodRecord[];
}
```

### `FuelPeriodRecord`

```ts
interface FuelPeriodRecord {
  periodId: string;
  periodName: string;              // "نیمه اول شهریور ۱۴۰۴"
  barbargCount: number;            // تعداد باربرگ
  tonnageTransportedKg: number;    // تناژ حمل‌شده
  distanceKm: number;              // مسافت
  baseQuotaLiters: number;
  performanceQuotaLiters: number;
  totalAllocatedLiters: number;
  depositStatus: 'DEPOSITED' | 'PENDING' | 'REJECTED';
  trackingNumber?: string;
  depositDate?: string;
}
```

---

## وضعیت واریز

| وضعیت | معنا | رنگ در UI |
|-------|------|-----------|
| `DEPOSITED` | واریز شده | سبز |
| `PENDING` | در انتظار واریز | زرد |
| `CALCULATING` | در حال محاسبه | آبی |
| `REJECTED` | رد شده | قرمز |

---

## نمایش در رابط کاربری

| کامپوننت | نقش |
|----------|-----|
| `FuelInquiryView.tsx` | صفحه اصلی استعلام با انتخاب پلاک و مرحله |
| `FuelInquiry.tsx` | نمایش جزئیات سهمیه و تاریخچه |

جریان UI:

```
انتخاب پلاک از PlateDropdown
  ↓
انتخاب مرحله (مرحله اول / مرحله دوم)
  ↓
GET /api/fuel-inquiry/{plate}?stage={1|2}
  ↓
کارت سهمیه: پایه + عملکردی = کل
  ↓
جدول تاریخچه دوره‌ها با وضعیت واریز
```

---

## ارتباط با سقف صدور

سهمیه باربرگ و سهمیه سوخت به هم گره خورده‌اند. اگر تعداد باربرگ در دوره از `biweeklyQuotaLimit` بیشتر شود:

- صدور بارنامه جدید با `ERR_QUOTA_EXCEEDED` رد می‌شود
- سهمیه سوخت هم متوقف می‌شود

فیلدهای مرتبط در `VehicleInfo`:

```ts
biweeklyWaybillCount?: number;  // مجموع در دوره ۱۵ روزه
stage1WaybillCount?: number;    // ۸ تا ۲۳
stage2WaybillCount?: number;    // ۲۳ تا ۸
biweeklyQuotaLimit?: number;    // سقف مجاز
fuelQuotaLiters?: number;       // سهمیه سوخت دوره
```

---

## نکات پیاده‌سازی

1. **تفاوت Express و FastAPI**: Express از تاریخ‌های ثابت ۱۴۰۵ استفاده می‌کند؛ FastAPI داینامیک است. برای تولید، نسخه داینامیک را مبنا بگیرید.
2. **باربرگ‌های ابطال‌شده** نباید شمرده شوند؛ در پیاده‌سازی فعلی فیلتر وضعیت وجود ندارد و باید اضافه شود.
3. **منطقه زمانی**: محاسبه در Express با `Date.UTC` انجام می‌شود؛ اگر سرور در منطقه زمانی دیگر باشد، مرزهای دوره ممکن است یک روز جابه‌جا شوند.
4. **کش**: پاسخ‌ها کش نمی‌شوند. برای بار زیاد، کش کوتاه‌مدت (مثلاً ۵ دقیقه) روی `plate_id + stage` توصیه می‌شود.
