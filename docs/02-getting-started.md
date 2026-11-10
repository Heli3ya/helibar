# راه‌اندازی و اجرا

## پیش‌نیازها

| ابزار | نسخه پیشنهادی | کاربرد |
|-------|----------------|--------|
| Node.js | ۲۰ یا بالاتر | اجرای سرور Express و Vite |
| npm | همراه Node | مدیریت وابستگی‌ها |
| Python | ۳.۱۰ یا بالاتر | اجرای بک‌اند FastAPI |
| Git | هر نسخه | کنترل نسخه |

پروژه از `bun.lock` هم پشتیبانی می‌کند؛ اگر Bun نصب دارید می‌توانید از `bun install` استفاده کنید، اما مسیر رسمی `npm` است.

---

## ۱. نصب

```bash
cd helibar
npm install
```

## ۲. تنظیم متغیرهای محیطی

فایل نمونه را کپی کنید:

```bash
cp .env.example .env
```

سپس مقادیر را پر کنید:

```env
# --- Gemini (اختیاری، برای قابلیت‌های هوش مصنوعی) ---
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"

# --- اتصال سپاد / UTCMS ---
SIPAAD_MODE="live"                  # live | simulation
SIPAAD_COMPANY_CODE="24981"         # کد اختصاصی شرکت حمل‌ونقل
SIPAAD_COMPANY_PASSWORD="••••••"    # رمز سازمانی شرکت در سامانه باربرگ
SIPAAD_FREIGHTER_WS_URL="https://services2.sipaad.ir/ITMFreighter.asmx"
SIPAAD_BOL_WS_URL="https://services2.sipaad.ir/ITMBOL.asmx"
SIPAAD_PROTOCOL="SOAP"              # SOAP | REST
SIPAAD_TIMEOUT_MS="15000"
```

### توضیح متغیرها

| متغیر | الزامی | توضیح |
|-------|--------|-------|
| `SIPAAD_MODE` | بله | `simulation` برای تست محلی بدون اتصال به شهرداری، `live` برای اتصال واقعی |
| `SIPAAD_COMPANY_CODE` | بله | کد شرکت در سامانه سپاد؛ در فرمول هش استفاده می‌شود |
| `SIPAAD_COMPANY_PASSWORD` | بله | رمز سازمانی؛ **هرگز کامیت نشود** |
| `SIPAAD_FREIGHTER_WS_URL` | خیر | وب‌سرویس استعلام ناوگان و راننده |
| `SIPAAD_BOL_WS_URL` | خیر | وب‌سرویس ثبت بارنامه |
| `SIPAAD_PROTOCOL` | خیر | پیش‌فرض `SOAP` (پاکت ASMX استاندارد) |
| `SIPAAD_TIMEOUT_MS` | خیر | تایم‌اوت درخواست‌ها (پیش‌فرض ۱۵ ثانیه) |
| `GEMINI_API_KEY` | خیر | فقط اگر از قابلیت‌های AI استفاده می‌کنید |

> فایل `.env` در `.gitignore` قرار دارد. فایل `.env.example` تنها فایلی است که کامیت می‌شود.

## ۳. اجرای محیط توسعه

```bash
npm run dev
```

این دستور `tsx server.ts` را اجرا می‌کند که هم APIها را روی پورت **۳۰۰۰** سرو می‌کند و هم Vite را به‌صورت middleware بالا می‌آورد. سپس باز کنید:

```
http://localhost:3000
```

مستندات Swagger بک‌اند پایتون (در صورت اجرا):

```
http://localhost:8000/docs
```

## ۴. اسکریپت‌های موجود

| اسکریپت | فرمان | توضیح |
|---------|-------|-------|
| `dev` | `tsx server.ts` | اجرای توسعه با HMR |
| `build` | `vite build && esbuild server.ts ...` | ساخت خروجی تولید در `dist/` |
| `start` | `node dist/server.cjs` | اجرای نسخه ساخته‌شده |
| `preview` | `vite preview` | پیش‌نمایش بیلد فرانت |
| `lint` | `tsc --noEmit` | بررسی نوع‌ها بدون تولید فایل |
| `clean` | `rm -rf dist server.js` | پاک‌سازی خروجی‌ها |

## ۵. بیلد و اجرای تولید

```bash
npm run build
npm run start
```

در حالت تولید، سرور فایل‌های `dist/` را با `express.static` سرو می‌کند و هر مسیر ناشناخته را به `index.html` هدایت می‌کند (SPA fallback).

## ۶. اجرای بک‌اند FastAPI (اختیاری)

بک‌اند پایتون مستقل از Express اجرا می‌شود:

```bash
pip install fastapi uvicorn sqlalchemy python-jose passlib python-multipart jdatetime
uvicorn backend.main:app --reload --port 8000
```

پایگاه داده پیش‌فرض SQLite است (`tarabar.db`). برای تغییر:

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/helibar"
```

در اولین اجرا جدول‌ها ساخته و کاربران اولیه seed می‌شوند.

## ۷. کاربران پیش‌فرض

| نقش | نام کاربری | رمز عبور | توضیح |
|-----|-----------|----------|-------|
| ADMIN | `heliya` | `heliya84` | مدیر ارشد؛ در کد به‌صورت hardcoded |
| SUPPORT | `Test Support` | `09120000000` | پشتیبان آزمایشی با اشتراک ۱ ماهه |
| DRIVER | `09124451092` | `Driver@1404` | راننده نمونه |

> نام کاربری `admin` عمداً در کد رد می‌شود و همیشه خطای ۴۰۱ می‌دهد.

## ۸. داده‌های اولیه

پوشه `data/` شامل داده‌های JSON است که در اولین اجرا بارگذاری می‌شوند:

| فایل | محتوا |
|------|-------|
| `system_users.json` | کاربران سامانه (پشتیبان، راننده، ادمین) |
| `plates.json` | پلاک‌های ناوگان با مالکیت |
| `waybills.json` | بارنامه‌های صادرشده |
| `issuer_settings.json` | تنظیمات ثبت خودکار هر صادرکننده |

برای شروع از صفر، کافی است این فایل‌ها را حذف کنید؛ سرور ساختار پیش‌فرض را بازسازی می‌کند.

## ۹. عیب‌یابی سریع نصب

| نشانه | علت احتمالی | راه‌حل |
|-------|-------------|--------|
| `EADDRINUSE :3000` | پورت اشغال است | `npx kill-port 3000` یا تغییر `PORT` در `server.ts` |
| `Cannot find module 'tsx'` | نصب ناقص | `rm -rf node_modules && npm install` |
| صفحه سفید بعد از بیلد | خطای مسیر base | `vite.config.ts` را بررسی کنید |
| خطای CORS در فراخوانی API | اجرا روی پورت متفاوت | از پورت ۳۰۰۰ استفاده کنید یا `vite` proxy اضافه کنید |
