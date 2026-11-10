# ماژول اندروید (Kotlin)

## هدف

`android/` یک کلاینت بومی برای راننده و ناوگان است که مستقیماً با وب‌سرویس‌های سپاد صحبت می‌کند. این ماژول **مستقل از سرور Express** کار می‌کند و برای سناریوهایی طراحی شده که راننده در محل با موبایل خود بارنامه یا سهمیه سوخت را استعلام می‌کند.

---

## پیکربندی

| مورد | مقدار |
|------|-------|
| Namespace | `ir.helibar.sipaad` |
| Application ID | `ir.helibar.sipaad` |
| minSdk | ۲۴ (اندروید ۷) |
| targetSdk / compileSdk | ۳۴ |
| Kotlin JVM Target | ۱۷ |
| UI | Jetpack Compose (compiler 1.5.8) |
| نسخه | `1.0.0` |

### مجوزها

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

مجوز موقعیت برای ثبت نقاط GPS در `WS06_InsertBOLTrack` استفاده می‌شود.

> در `AndroidManifest.xml` هیچ `Activity` ثبت نشده است. برای اجرای واقعی باید `MainActivity` با `intent-filter` مربوط به `LAUNCHER` اضافه شود.

---

## ساختار پکیج

```
ir.helibar.sipaad
├── model/
│   ├── BolModels.kt          → مدل بارنامه
│   ├── FuelQuotaModels.kt    → مدل سهمیه سوخت
│   └── SipaadResult.kt       → پوشش نتیجه/خطا
├── network/
│   ├── NetworkModule.kt      → Retrofit + OkHttp + Gson
│   ├── SipaadApiService.kt   → تعریف endpointهای بارنامه
│   ├── FuelQuotaApiService.kt→ endpointهای سوخت
│   └── AspNetSessionCookieJar.kt → مدیریت کوکی ASP.NET
├── security/
│   └── SipaadSecurity.kt     → تولید امضای SHA-512
├── repository/
│   ├── SipaadRepository.kt       → قرارداد
│   ├── SipaadRepositoryImpl.kt   → پیاده‌سازی
│   └── FuelQuotaRepository.kt    → سهمیه سوخت
├── util/                     → کمک‌تابع‌ها
├── viewmodel/                → ViewModelها
└── ui/screens/
    ├── DriverFleetScreen.kt      → ناوگان راننده
    ├── FuelQuotaModal.kt         → نمایش سهمیه
    ├── ProvincesCitiesPicker.kt  → انتخاب استان/شهر
    └── TripBolScreen.kt          → بارنامه سفر
```

---

## پیکربندی شبکه

```kotlin
object NetworkModule {
    private const val DEFAULT_BASE_URL = "https://utcms.ir/ws/v2/itmb/"

    val gson: Gson = GsonBuilder()
        .serializeNulls()   // حیاتی: ارسال null صریح برای سپاد
        .setLenient()
        .create()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply { level = BODY })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
}
```

### نکته `serializeNulls`

همان قاعده‌ای که در وب وجود دارد: فیلدهای اختیاری باید با `null` صریح ارسال شوند، نه حذف. `serializeNulls()` این را تضمین می‌کند.

> `HttpLoggingInterceptor` در سطح `BODY` تمام بدنه درخواست/پاسخ را لاگ می‌کند. در نسخه release باید به `NONE` تغییر کند، وگرنه رمز و امضا در logcat لو می‌رود.

### کوکی ASP.NET

`AspNetSessionCookieJar` کوکی‌های `.ASPXAUTH` را نگه می‌دارد. سرویس‌های ASMX شهرداری معمولاً پس از اولین احراز هویت، session cookie ست می‌کنند و درخواست‌های بعدی به آن وابسته‌اند.

---

## امضای امنیتی

`SipaadSecurity.getSHA512Hash` دقیقاً بخش ۱۷ راهنمای `UTCM-WS-BOL-GUIDE` را پیاده می‌کند:

```kotlin
fun getSHA512Hash(companyCode: String, password: String, explicitSalt: Long? = null): HashResult {
    val salt = explicitSalt ?: Random.nextLong(10_000_000L, 100_000_000L)

    // ۱. هش داخلی رمز
    val inner = sha512(password)

    // ۲. اتصال
    val raw = "$companyCode$inner$salt"

    // ۳. هش بیرونی
    val hashedValue = sha512(raw)

    return HashResult(companyCode, salt, hashedValue)
}
```

خروجی: `companyCode`، `salt` (۸ رقمی) و `hashedValue` (۱۲۸ کاراکتر hex) — همان مقادیری که در پاکت درخواست سپاد قرار می‌گیرند.

`explicitSalt` برای تست واحد وجود دارد تا خروجی قابل پیش‌بینی باشد.

---

## لایه Repository

```kotlin
interface SipaadRepository {
    suspend fun insertBol(...): SipaadResult<BolResponse>
    suspend fun startBol(...): SipaadResult<...>
    suspend fun endBol(...): SipaadResult<...>
    suspend fun getProvinces(): SipaadResult<List<Province>>
    suspend fun getCities(provinceCode: String): SipaadResult<List<City>>
}
```

الگوی `SipaadResult<T>` خطاها را به‌جای exception به‌صورت مقدار بازمی‌گرداند:

```kotlin
sealed class SipaadResult<out T> {
    data class Success<T>(val data: T) : SipaadResult<T>()
    data class Error(val code: Int, val message: String) : SipaadResult<Nothing>()
}
```

مزیت: در Compose می‌توان با `when` روی نتیجه، حالت‌های UI را بدون try/catch مدیریت کرد.

---

## صفحات Compose

| صفحه | نقش |
|------|-----|
| `DriverFleetScreen` | لیست خودروها و وضعیت هر یک برای راننده |
| `TripBolScreen` | ثبت/مشاهده بارنامه سفر جاری |
| `FuelQuotaModal` | مودال سهمیه سوخت با تفکیک پایه/عملکردی |
| `ProvincesCitiesPicker` | انتخاب‌گر دو مرحله‌ای استان → شهر (پرکردن `WS11`/`WS12`) |

### الگوی انتخاب استان/شهر

```
۱. فراخوانی WS11_GetProvinces در اولین باز شدن
۲. کش نتایج در حافظه
۳. انتخاب استان → فراخوانی WS12_GetCities
۴. انتخاب شهر → مقداردهی فرم
```

---

## ساخت و اجرا

### پیش‌نیاز
- Android Studio (Hedgehog یا جدیدتر)
- JDK ۱۷
- Android SDK 34

### گام‌ها

```bash
# از ریشه پروژه
cd android
./gradlew assembleDebug
```

خروجی: `android/app/build/outputs/apk/debug/app-debug.apk`

### نصب روی دستگاه

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### نکته درباره Gradle

پروژه فقط `android/app/build.gradle.kts` دارد. برای بیلد کامل نیاز به:
- `android/settings.gradle.kts` با تعریف `include(":app")`
- `android/build.gradle.kts` سطح پروژه با pluginهای AGP و Kotlin
- `gradle/wrapper/gradle-wrapper.properties`
- `MainActivity.kt` و ثبت آن در Manifest

اگر این فایل‌ها موجود نیستند، باید پیش از بیلد اضافه شوند.

---

## تفاوت با نسخه وب

| موضوع | وب (Express) | اندروید |
|-------|--------------|---------|
| نقطه اتصال | سرور واسط | مستقیم به سپاد |
| احراز هویت | توکن داخلی | کوکی ASP.NET |
| امضا | Node crypto | MessageDigest |
| ذخیره‌سازی | JSON/DB | حافظه دستگاه |
| خروجی null | `formatSipaadPayloadServer` | `serializeNulls()` |

> **هشدار امنیتی**: اتصال مستقیم اپ موبایل به سپاد یعنی `companyCode` و `password` باید روی دستگاه باشد. استخراج آن از APK ساده است. راه‌حل توصیه‌شده: عبور از یک سرور واسط (همان Express) و نگه‌داشتن رمز فقط سمت سرور.

---

## چک‌لیست تولید

- [ ] افزودن `MainActivity` و ثبت در Manifest
- [ ] خاموش کردن `HttpLoggingInterceptor` در release
- [ ] فعال‌کردن `isMinifyEnabled = true` و قواعد ProGuard
- [ ] انتقال اعتبارنامه‌ها به سرور واسط یا `EncryptedSharedPreferences`
- [ ] افزودن `network_security_config` برای محدودسازی دامنه‌ها
- [ ] مدیریت خطای قطعی شبکه با retry و پیام فارسی
- [ ] پشتیبانی از RTL در همه صفحات (اکنون `supportsRtl="true"` ست است)
