# مستندات پروژه هلی‌بار (helibar)

سامانه مدیریت بارنامه شهری، ناوگان و استعلام سوخت، متصل به وب‌سرویس‌های سپاد (UTCMS).

این پوشه مرجع فنی پروژه است. هر فایل روی یک حوزه مشخص تمرکز دارد و مستقل قابل مطالعه است.

---

## فهرست مستندات

| # | فایل | موضوع |
|---|------|-------|
| ۱ | [01-overview.md](./01-overview.md) | معرفی محصول، قابلیت‌ها و اصطلاحات دامنه |
| ۲ | [02-getting-started.md](./02-getting-started.md) | نصب، اجرا، متغیرهای محیطی و اسکریپت‌ها |
| ۳ | [03-architecture.md](./03-architecture.md) | معماری کلی، لایه‌ها و جریان داده |
| ۴ | [04-authentication-rbac.md](./04-authentication-rbac.md) | احراز هویت، نقش‌ها، اشتراک و کپچا |
| ۵ | [05-api-reference.md](./05-api-reference.md) | مرجع کامل API سرور Express |
| ۶ | [06-sipaad-integration.md](./06-sipaad-integration.md) | اتصال به سپاد، الگوریتم هش و وب‌سرویس‌ها |
| ۷ | [07-waybill-lifecycle.md](./07-waybill-lifecycle.md) | چرخه صدور بارنامه، پردازش دسته‌ای و OTP |
| ۸ | [08-fuel-quota.md](./08-fuel-quota.md) | استعلام سوخت و دوره‌های ۱۵ روزه جلالی |
| ۹ | [09-frontend.md](./09-frontend.md) | ساختار فرانت‌اند، تب‌ها و کامپوننت‌ها |
| ۱۰ | [10-backend-python.md](./10-backend-python.md) | بک‌اند FastAPI، مدل‌ها و مسیرها |
| ۱۱ | [11-data-model.md](./11-data-model.md) | مدل داده، فایل‌های JSON و ذخیره‌سازی |
| ۱۲ | [12-android.md](./12-android.md) | ماژول اندروید (Kotlin) |
| ۱۳ | [13-troubleshooting.md](./13-troubleshooting.md) | خطاهای رایج و راه‌حل آن‌ها |

---

## نقشه سریع پروژه

```
helibar/
├── server.ts              # سرور Express + تمام APIهای اصلی (۳۴۷۱ خط)
├── src/                   # فرانت‌اند React 19 + Vite + Tailwind 4
│   ├── App.tsx            # ریشه اپ و مدیریت تب‌ها
│   ├── components/        # ۶۰+ کامپوننت UI
│   ├── context/           # Auth, Theme, Subscription
│   └── lib/               # api, sipaadCrypto, iranPlate, mockData
├── backend/               # بک‌اند FastAPI (موازی، برای Swagger و RBAC)
├── routers/               # روترهای FastAPI (پلاک، سوخت، راننده)
├── data/                  # ذخیره‌سازی JSON (کاربران، پلاک‌ها، بارنامه‌ها)
├── android/               # کلاینت اندروید Kotlin + Retrofit
└── docs/                  # همین مستندات
```

## مخاطبان

- **توسعه‌دهنده جدید**: از `01-overview` شروع کنید، بعد `02-getting-started` و `03-architecture`.
- **کار روی API**: `05-api-reference` و `06-sipaad-integration`.
- **کار روی رابط کاربری**: `09-frontend` و `04-authentication-rbac`.
- **کار روی بک‌اند پایتون**: `10-backend-python` و `11-data-model`.

## نکته مهم درباره دو بک‌اند

پروژه **دو بک‌اند موازی** دارد:

1. **Express (`server.ts`)** — بک‌اند اصلی و فعال که فرانت‌اند با آن کار می‌کند (`npm run dev`).
2. **FastAPI (`backend/`)** — بک‌اند دوم با Swagger UI، RBAC دقیق‌تر و SQLAlchemy؛ برای مستندسازی و توسعه سمت پایتون.

این دو در حال حاضر **state مشترک ندارند**. جزئیات در `03-architecture.md`.
