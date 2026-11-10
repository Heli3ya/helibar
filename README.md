# هلی‌بار | سامانه مدیریت بارنامه و ناوگان

پلتفرم جامع صدور هوشمند بارنامه شهری، مدیریت ناوگان و استعلام سوخت، متصل به وب‌سرویس‌های **سپاد (UTCMS)** شهرداری.

---

## قابلیت‌ها

- **صدور بارنامه** به‌صورت تکی، دسته‌ای (از اکسل) و خودکار در بازه‌های زمانی
- **مدیریت ناوگان** با ساختار دقیق پلاک ایران و وضعیت مجوزها
- **احراز هویت دوعاملی (OTP)** با دریافت خودکار کد از پنل پیامک
- **استعلام سهمیه سوخت** بر پایه دوره‌های ۱۵ روزه تقویم جلالی
- **پنل ادمین** برای مدیریت کاربران، ظرفیت پلاک و اشتراک
- **چندمستأجری** با ایزولاسیون کامل داده هر صادرکننده
- **آرشیو، گزارش خطا و خروجی PDF/Excel**

## پشته فناوری

| لایه | فناوری |
|------|--------|
| فرانت‌اند | React 19 · Vite 6 · TypeScript · Tailwind 4 |
| بک‌اند اصلی | Node.js · Express · tsx |
| بک‌اند دوم | Python · FastAPI · SQLAlchemy |
| کلاینت موبایل | Kotlin · Jetpack Compose · Retrofit |
| داده | JSON (Express) · SQLite/Postgres (FastAPI) |

---

## اجرای سریع

```bash
# ۱. نصب
npm install

# ۲. تنظیم محیط
cp .env.example .env
# مقادیر SIPAAD_* را پر کنید

# ۳. اجرا
npm run dev
```

سپس باز کنید: **http://localhost:3000**

---

## مستندات

مستندات کامل در پوشه [`docs/`](./docs/README.md) قرار دارد.

| سند | موضوع |
|-----|-------|
| [معرفی](./docs/01-overview.md) | محصول، قابلیت‌ها و اصطلاحات |
| [راه‌اندازی](./docs/02-getting-started.md) | نصب، اجرا و متغیرهای محیطی |
| [معماری](./docs/03-architecture.md) | لایه‌ها و جریان داده |
| [احراز هویت](./docs/04-authentication-rbac.md) | نقش‌ها، اشتراک و امنیت |
| [مرجع API](./docs/05-api-reference.md) | تمام endpointها |
| [یکپارچه‌سازی سپاد](./docs/06-sipaad-integration.md) | هش SHA-512 و وب‌سرویس‌ها |
| [چرخه بارنامه](./docs/07-waybill-lifecycle.md) | صدور، Batch و OTP |
| [سهمیه سوخت](./docs/08-fuel-quota.md) | دوره‌های جلالی و محاسبه |
| [فرانت‌اند](./docs/09-frontend.md) | کامپوننت‌ها و تم‌ها |
| [بک‌اند پایتون](./docs/10-backend-python.md) | FastAPI و مدل‌ها |
| [مدل داده](./docs/11-data-model.md) | JSON و ذخیره‌سازی |
| [اندروید](./docs/12-android.md) | کلاینت Kotlin |
| [عیب‌یابی](./docs/13-troubleshooting.md) | خطاهای رایج |

---

## ساختار پروژه

```
helibar/
├── server.ts          # سرور Express + APIها
├── src/               # فرانت‌اند React
│   ├── components/    # ۶۰+ کامپوننت
│   ├── context/       # Auth, Theme, Subscription
│   └── lib/           # api, sipaadCrypto, iranPlate
├── backend/           # FastAPI + SQLAlchemy
├── routers/           # روترهای پایتون
├── data/              # داده JSON
├── android/           # کلاینت Kotlin
└── docs/              # مستندات
```

## اسکریپت‌ها

| فرمان | کار |
|-------|-----|
| `npm run dev` | اجرای توسعه |
| `npm run build` | بیلد تولید |
| `npm run start` | اجرای نسخه تولید |
| `npm run lint` | بررسی تایپ‌ها |

---

## هشدار امنیتی

این نسخه برای توسعه و دمو آماده است، نه انتشار عمومی. پیش از تولید:

- رمزها باید با bcrypt هش شوند (اکنون متن ساده در `data/system_users.json`)
- توکن Express باید JWT امضاشده واقعی شود
- اعتبارنامه ادمین باید از کد خارج و به متغیر محیطی منتقل شود
- اعتبارسنجی امضای Webhook پیامک اضافه شود

جزئیات در [مستند احراز هویت](./docs/04-authentication-rbac.md).
