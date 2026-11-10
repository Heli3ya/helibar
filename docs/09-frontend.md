# ساختار فرانت‌اند

## پشته فناوری

| فناوری | نسخه | نقش |
|--------|------|-----|
| React | ۱۹.۰ | کتابخانه UI |
| Vite | ۶.۲ | باندلر و dev server |
| TypeScript | ۵.۸ | تایپ‌پذیری |
| Tailwind CSS | ۴.۱ | استایل‌دهی (با `@tailwindcss/vite`) |
| lucide-react | ۰.۵۴۶ | آیکون‌ها |
| motion | ۱۲.۲۳ | انیمیشن |
| axios | ۱.۲۰ | HTTP client |
| xlsx | ۰.۱۸ | خواندن/نوشتن اکسل |
| html2canvas + jspdf | — | خروجی PDF |

فونت: **Vazirmatn**، چیدمان کامل RTL، زبان فارسی.

---

## نقطه ورود و چرخه رندر

```
index.html
  └── src/main.tsx
        └── <App />
              ├── ThemeProvider
              ├── AuthProvider
              ├── SubscriptionProvider
              └── AppLayout
                    ├── Sidebar / Navbar / MobileBottomNav
                    └── صفحه فعال بر اساس currentTab
```

`App.tsx` قلب برنامه است: هم state دامنه (ناوگان، بارنامه‌ها، تنظیمات) و هم مسیریابی تب‌ها را نگه می‌دارد.

---

## مدیریت state در `App.tsx`

| state | نوع | توضیح |
|-------|-----|-------|
| `currentUser` | `AuthUser \| null` | از `localStorage` بازیابی می‌شود |
| `currentTab` | `NavTab` | تب فعال |
| `config` | `SipaadCredentials` | تنظیمات اتصال سپاد |
| `fleet` | `{ vehicle, driver }[]` | ناوگان مستأجر (cache در `localStorage`) |
| `waybills` | `WaybillItem[]` | بارنامه‌ها |
| `fuelQuotas` | `FuelQuotaRecord[]` | سهمیه‌های سوخت |
| `maxPlateCapacity` | `number` | سقف پلاک کاربر |
| `autoRegisterEnabled` | `boolean` | وضعیت ثبت خودکار |

### کش محلی ناوگان

```
کلید: helibar_fleet_{username}
کلید قدیمی سازگار: bargooo_fleet_{username}
```

اگر کش موجود باشد از آن استفاده می‌شود؛ در غیر این صورت برای `ADMIN` داده نمونه و برای بقیه آرایه خالی.

### محافظ نشست ادمین

```ts
if (saved.role === 'ADMIN' && saved.username !== 'heliya') {
  localStorage.removeItem('sipaad_issuer_user');
  localStorage.removeItem('helibar_auth_token');
  return null;
}
```

این جلوی نشست‌های جعلی با نقش ادمین را می‌گیرد.

---

## تب‌ها و صفحات

```ts
type NavTab =
  | 'DASHBOARD'       // داشبورد عملیاتی
  | 'ISSUE_SINGLE'    // صدور بارنامه تکی
  | 'BATCH'           // پردازش دسته‌ای
  | 'OTP_MANAGER'     // مدیریت کد دوعاملی
  | 'REPORTS'         // گزارش خطاها
  | 'FLEET'           // مدیریت ناوگان
  | 'FUEL_INQUIRY'    // استعلام سوخت
  | 'ARCHIVE'         // آرشیو بارنامه‌ها
  | 'LAB'             // آزمایشگاه یکپارچه‌سازی سپاد
  | 'SETTINGS'        // تنظیمات (فقط ادمین)
  | 'ADMIN_CREATE_USER' // ساخت کاربر (فقط ادمین)
```

| تب | کامپوننت اصلی | نقش |
|----|----------------|-----|
| DASHBOARD | `OperationalDashboard` | آمار زنده، وضعیت پلاک‌ها، اقدامات سریع |
| ISSUE_SINGLE | `WaybillForm` | فرم کامل صدور |
| BATCH | `BatchProcessingView` | آپلود اکسل، اجرای دسته‌ای، پیشرفت |
| OTP_MANAGER | `OtpManagerView` + `OtpActionQueue` | درخواست و پیگیری کدها |
| REPORTS | `ErrorReportsView` | خطاها با کد و راهنمای اقدام |
| FLEET | `FleetManager` + `PlateTable` | CRUD پلاک و راننده |
| FUEL_INQUIRY | `FuelInquiryView` | سهمیه سوخت دو مرحله‌ای |
| ARCHIVE | `WaybillArchive` / `ArchiveTable` | جستجو و فیلتر بارنامه‌ها |
| LAB | `SipaadIntegrationLab` | تست هش، اتصال و وب‌سرویس‌ها |
| SETTINGS | `SettingsView` | اعتبارنامه، کپچا، ثبت خودکار |
| ADMIN_CREATE_USER | `CreateUserPanel` | ساخت پنل پشتیبان |

---

## نقشه کامپوننت‌ها

### چیدمان و ناوبری
```
AppLayout.tsx        → اسکلت صفحه (سایدبار + هدر + محتوا)
├── Sidebar.tsx      → ناوبری دسکتاپ
├── Navbar.tsx       → نوار بالا با تب‌ها و نشان‌ها
├── AppHeader.tsx    → سربرگ با اطلاعات کاربر
├── Header.tsx       → هدر ساده
├── MobileBottomNav.tsx → ناوبری پایین موبایل
├── MobileDrawer.tsx → منوی کشویی موبایل
└── GlobalBackButton.tsx
```

### احراز هویت و دسترسی
```
LoginPage.tsx        → فرم ورود با کپچا
RouteGuard.tsx       → محافظ مسیر بر اساس نقش
Forbidden403.tsx     → صفحه عدم دسترسی
BlockOverlay.tsx     → پوشش مسدودسازی اشتراک
SubscriptionBanner.tsx → بنر هشدار ۱۴/۷ روز
```

### بارنامه
```
WaybillForm.tsx              → فرم صدور تکی
WaybillList.tsx              → جدول بارنامه‌ها
WaybillArchive.tsx           → آرشیو با فیلتر
ArchiveTable.tsx             → جدول قابل استفاده مجدد
WaybillPrintModal.tsx        → خروجی PDF
RoundTripWaybillModal.tsx    → بارنامه رفت و برگشت
RegisterWithCarriageModal.tsx→ ثبت همراه با شروع حمل
```

### ناوگان و پلاک
```
FleetManager.tsx        → صفحه مدیریت ناوگان
PlateTable.tsx          → جدول پلاک‌ها
PlateCard.tsx           → کارت پلاک
PlateBadge.tsx          → نشان پلاک
PlateInput.tsx          → ورودی چهاربخشی پلاک
PlateDropdown.tsx       → انتخاب پلاک
PlateActionMenu.tsx     → منوی اقدامات هر پلاک
CapacityBadge.tsx       → نشان ظرفیت مصرف‌شده
BiweeklyStageStatsBadge.tsx → آمار دوره ۱۵ روزه
```

### راننده و OTP
```
AddDriver.tsx              → فرم افزودن راننده
AddDriverModal.tsx         → مودال ساده
AddDriverWizardModal.tsx   → ویزارد چندمرحله‌ای
DriverOtpPortal.tsx        → درگاه راننده برای ورود کد
OtpEntryModal.tsx          → ورود کد توسط پشتیبان
OtpActionQueue.tsx         → صف اقدامات در انتظار
OtpManagerView.tsx         → صفحه مدیریت OTP
BulkOtpVerification.tsx    → تأیید گروهی
```

### ورودی داده
```
BulkUploadModal.tsx   → آپلود گروهی
ExcelImportModal.tsx  → ایمپورت اکسل
BatchProcessingView.tsx → اجرای دسته‌ای
```

### ادمین
```
admin/CreateUser.tsx        → فرم ساخت کاربر
admin/CreateUserPanel.tsx   → پنل کامل ساخت
admin/UserList.tsx          → لیست کاربران
admin/EditCapacityModal.tsx → ویرایش ظرفیت
admin/DeleteUserModal.tsx   → تأیید حذف
```

### پایه و مشترک
```
Button.tsx      → دکمه با واریانت‌ها
Dropdown.tsx    → منوی کشویی
Table.tsx       → جدول پایه
ErrorDetailsModal.tsx → جزئیات خطا
MunicipalityPermitErrorModal.tsx → خطای مجوز شهرداری
ThemeSelector.tsx / ThemeToggleMinimal.tsx → انتخاب تم
```

---

## تم‌ها

`ThemeContext` چهار تم دارد که با `data-theme` روی `<html>` اعمال می‌شوند:

| شناسه | نام | کاربرد |
|-------|-----|--------|
| `dark` | تیره متالیک | پیش‌فرض سازمانی |
| `light` | روشن رسمی | نور روز |
| `sepia` | مراقبت چشم | شیفت طولانی |
| `midnight` | شب عمیق OLED | تاریکی مطلق |

متغیرهای CSS در `src/index.css`:

```css
:root {
  --app-bg: #090d16;
  --app-card: #0f172a;
  --app-border: #1e293b;
  --app-text: #f8fafc;
  --app-text-muted: #94a3b8;
}
```

هر تم با selector `[data-theme="light"]` و مشابه آن override می‌شود. حالت `dark` با `@custom-variant dark (&:where(.dark, .dark *))` به Tailwind متصل است.

> **نکته نگهداری**: `index.css` شامل بازنویسی‌های گسترده برای هر تم است. افزودن کلاس جدید Tailwind بدون بررسی هر چهار تم ممکن است در برخی تم‌ها کنتراست را بشکند.

---

## لایه ارتباط با سرور

`src/lib/api.ts`:

```ts
export const apiClient = axios.create({ baseURL: '', timeout: 15000 });
```

- **Request interceptor**: تزریق `Authorization: Bearer <token>` از `localStorage`
- **Response interceptor**: خواندن `X-Sub-Warning` و `X-Sub-Days-Left`، انتشار رویداد
- **Fetch wrapper**: پوشش `window.fetch` برای همان هدرها، با محافظت در برابر محیط‌های غیرقابل‌نوشتن

رویدادها به `SubscriptionContext` می‌رسند و `BlockOverlay` یا `SubscriptionBanner` را فعال می‌کنند.

---

## اعتبارسنجی و کمک‌تابع‌ها

### `src/lib/iranPlate.ts`

- `toPersianDigits` / `toEnglishDigits`
- اعتبارسنجی چهار بخش پلاک
- نرمال‌سازی برای مقایسه

### `src/lib/sipaadCrypto.ts`

- `sha512(input)` با WebCrypto
- `generateRandomSalt()`
- `computeSipaadSecurityHash(companyCode, password, salt)`
- `formatSipaadJsonPayload(payload, optionalKeys)`

---

## الگوهای کدنویسی موجود

| الگو | نمونه |
|------|-------|
| کامپوننت تابعی + FC | `export const Navbar: React.FC<NavbarProps> = ...` |
| Props تایپ‌شده | همه کامپوننت‌ها interface اختصاصی دارند |
| Lazy state initializer | `useState(() => JSON.parse(localStorage...))` |
| Memo برای محاسبات سنگین | `React.useMemo` برای شمارش پلاک یکتا |
| مودال‌های کنترل‌شده | state والد + prop `onClose` |
| بازخورد فوری | `motion` برای ورود/خروج مودال‌ها |

---

## نکات توسعه

1. **بدون router**: برای افزودن deep-link باید react-router اضافه شود یا حداقل `currentTab` با `URLSearchParams` همگام شود.
2. **state تکراری**: چند نسخه از هدر/سایدبار وجود دارد (`Navbar`، `Header`، `AppHeader`). پیش از افزودن نسخه جدید، موجودها را بررسی کنید.
3. **`mockData.ts`**: داده نمونه اولیه است؛ در حالت تولید باید از API خوانده شود.
4. **دسترس‌پذیری**: `user-select: none` روی body اعمال شده و فقط برای عناصر متنی باز شده است. برای فرم‌ها و جداول جدید این استثناها را در نظر بگیرید.
5. **کارایی**: `App.tsx` بیش از ۱۰۰۰ خط است و چندین مسئولیت دارد؛ شکستن آن به hookهای اختصاصی (`useFleet`, `useWaybills`) توصیه می‌شود.
