# احراز هویت، نقش‌ها و اشتراک

## سه نقش سامانه

```ts
type UserRole = 'ADMIN' | 'SUPPORT' | 'DRIVER' | 'SUPER_ADMIN' | 'ISSUER_OPERATOR' | 'FLEET_MANAGER';
```

در عمل فقط سه نقش اول استفاده می‌شوند؛ سه نقش آخر در `types.ts` تعریف شده‌اند اما مسیر اجرایی ندارند.

| نقش | فارسی | دسترسی |
|-----|-------|--------|
| `ADMIN` | مدیر ارشد | همه چیز: ساخت/حذف کاربر، تنظیمات، همه پلاک‌ها، تأیید پرداخت |
| `SUPPORT` | پشتیبان / صادرکننده | پلاک‌ها و رانندگان تخصیص‌یافته، صدور بارنامه، OTP، استعلام سوخت |
| `DRIVER` | راننده | فقط ورود کد دوعاملی |

---

## ورود (Express)

### قاعده سخت‌کدشده ادمین

```ts
if (cleanUsername === 'heliya' && cleanPassword === 'heliya84') {
  // دسترسی ADMIN بدون هیچ کوئری به دیتابیس
}
```

- نام کاربری `admin` **همیشه** با خطای `401 {"detail":"نامعتبر"}` رد می‌شود.
- اگر `heliya` با رمز اشتباه وارد شود، باز هم ۴۰۱ می‌گیرد.
- هیچ کاربر دیگری نمی‌تواند نقش `ADMIN` بگیرد؛ حتی اگر در JSON نقشش ADMIN باشد، در ورود رد می‌شود.

در فرانت‌اند نیز یک محافظ محلی وجود دارد: اگر نشست ذخیره‌شده نقش `ADMIN` داشته باشد ولی `username !== 'heliya'` باشد، `localStorage` پاک می‌شود.

### ورود کاربران عادی

```
POST /api/auth/login
{ "username": "...", "password": "..." }
```

مراحل:
1. تبدیل ارقام فارسی/عربی به لاتین (`toEnglishDigitsServer`)
2. رد کردن `admin`
3. بررسی هشدار ادمین
4. جستجو در `systemUsersStore` با تطبیق `username` و `passwordHash`
5. بررسی `isActive` — اگر `false` باشد: `403 عدم دسترسی صادرکننده`
6. محاسبه `days_left` و بازگشت توکن

پاسخ موفق:

```json
{
  "access_token": "jwt_token_usr-sup-1_1730000000000",
  "token_type": "bearer",
  "user": {
    "id": "usr-sup-1",
    "username": "test-support",
    "role": "SUPPORT",
    "full_name": "پشتیبان آزمایشی",
    "mobile": "09120000000",
    "plate_capacity": 150,
    "is_active": true,
    "created_at": "2026-10-01T00:00:00.000Z",
    "days_left": 22,
    "subscription_days_left": 22
  }
}
```

> **هشدار**: توکن در Express یک JWT واقعی نیست. فرمت آن `jwt_token_<userId>_<timestamp>` است و **امضا یا تاریخ انقضا ندارد**. هر کسی می‌تواند آن را جعل کند. شناسه کاربر در `server.ts` با `token.split('_')[2]` استخراج می‌شود.

### ثبت‌نام

```
POST /api/auth/signup
{ "username": "...", "password": "...", "fullName": "...", "mobile": "..." }
```

- نقش اختصاص‌یافته همیشه `SUPPORT` است.
- بررسی یکتا بودن نام کاربری (حساس به حروف بزرگ/کوچک).
- اشتراک ۳۰ روزه از لحظه ساخت.
- پاسخ `201` با توکن و اطلاعات کاربر.

### دریافت پروفایل جاری

```
GET /api/users/me
Authorization: Bearer jwt_token_...
```

`days_left = max(0, 30 - floor((now - created_at) / 86400000))`

برای `ADMIN` همیشه `30` برگردانده می‌شود.

---

## احراز هویت در FastAPI (پیاده‌سازی کامل‌تر)

| مورد | مقدار |
|------|-------|
| الگوریتم | HS256 |
| کتابخانه | `python-jose` |
| عمر توکن | ۷ روز (`ACCESS_TOKEN_EXPIRE_MINUTES = 10080`) |
| کلید | `JWT_SECRET` (پیش‌فرض ناامن داخل کد) |
| هش رمز | `passlib` (bcrypt) |

مسیرها:

| متد | مسیر | توضیح |
|-----|------|-------|
| `POST` | `/token` | OAuth2 Password Flow برای دکمه Authorize در Swagger |
| `POST` | `/api/auth/login` | ورود JSON برای کلاینت وب |
| `POST` | `/api/auth/signup` | ثبت‌نام پشتیبان |
| `GET` | `/api/auth/captcha` | تولید کپچای ۴ رقمی |
| `GET` | `/api/users/me` | پروفایل و روزهای اشتراک |
| `POST` | `/api/auth/change-password` | تغییر رمز |

مثال استفاده با curl:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/token \
  -d "username=heliya&password=heliya84" | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/users/me
```

---

## کپچا

ساختار تنظیمات در `types.ts`:

```ts
interface CaptchaSettings {
  enabledForLogin: boolean;
  enabledForHighTonnage: boolean;      // تناژ بالا
  enabledForBatchIssuance: boolean;    // صدور دسته‌ای
  difficulty: 'NUMERIC_4' | 'ALPHANUMERIC_5' | 'MATH_SUM';
  expirySeconds: number;
  caseSensitive: boolean;
}
```

در FastAPI، `CaptchaManager` کد ۴ رقمی با اعتبار ۱۸۰ ثانیه تولید می‌کند و در حافظه نگه می‌دارد.

---

## مدیریت اشتراک

### چرخه

- هر کاربر `SUPPORT` از لحظه `createdAt` یک چرخه **۳۰ روزه** دارد.
- محاسبه: `30 - floor(elapsed_days)`
- `ADMIN` از این قاعده مستثنی است.

### هدرهای هشدار

Middleware روی هر پاسخ API این هدرها را ست می‌کند:

```
Access-Control-Expose-Headers: X-Sub-Warning, X-Sub-Days-Left
X-Sub-Days-Left: 12
X-Sub-Warning: 14_DAYS
```

| مقدار `X-Sub-Warning` | شرط | رفتار UI |
|------------------------|-----|----------|
| `14_DAYS` | `7 < days_left <= 14` | بنر هشدار معمولی |
| `7_DAYS_BLINKING` | `0 < days_left <= 7` | بنر چشمک‌زن قرمز |
| `SUBSCRIPTION_EXPIRED` | `days_left <= 0` | مسدودسازی |

### مسدودسازی خودکار

اگر `days_left <= 0` **و** `isPaymentApproved === false`:

```json
HTTP 403
{
  "detail": "SUBSCRIPTION_EXPIRED",
  "message": "مدت زمان اشتراک شما به پایان رسیده است. لطفاً جهت تمدید و بازگشایی دسترسی، اقدام به پرداخت نموده و منتظر تایید ادمین بمانید."
}
```

مسیرهای معاف از مسدودسازی (همیشه باز):

- `/api/health`
- `/api/auth/login`
- `/api/auth/signup`
- هر مسیری شامل `/billing`
- `/api/admin/*`
- `/api/subscription/*`

### سمت کلاینت

`src/lib/api.ts` دو interceptor دارد:

1. **Request**: افزودن `Authorization: Bearer <access_token>` از `localStorage`
2. **Response**: خواندن هدرها و انتشار رویداد به `SubscriptionContext`

همچنین `window.fetch` به‌صورت ایمن wrap می‌شود تا پاسخ‌های `fetch` خام هم هشدارها را فعال کنند. اگر `window.fetch` غیرقابل‌نوشتن باشد، خطا بی‌صدا نادیده گرفته می‌شود.

---

## ایزولاسیون چندمستأجری (Multi-Tenancy)

### در Express

```ts
function getTenantUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const userId = token.split('_')[2];
  return systemUsersStore.find(u => u.id === userId) || systemUsersStore[0];
}
```

سپس هر پلاک با `owner_id` فیلتر می‌شود.

### در FastAPI

`get_isolated_tenant` یک `IsolatedTenantContext` می‌سازد که:

- برای `ADMIN`: بدون فیلتر، همه رکوردها
- برای `SUPPORT`: همیشه `.filter(Model.owner_id == current_user.id)`
- تلاش برای دسترسی به رکورد دیگران → `404` (نه `403`، تا وجود رکورد لو نرود)

این الگو در برابر **IDOR** (Insecure Direct Object Reference) محافظت می‌کند.

---

## چک‌لیست امنیتی برای انتشار

- [ ] جایگزینی توکن ساختگی Express با JWT امضاشده
- [ ] هش رمزها با bcrypt/argon2 (در حال حاضر متن ساده در JSON)
- [ ] انتقال `heliya84` از کد به متغیر محیطی
- [ ] تعیین `JWT_SECRET` واقعی در محیط تولید
- [ ] افزودن rate limiting روی `/api/auth/login` و `/api/otp/trigger`
- [ ] اعتبارسنجی امضای Webhook پیامک
- [ ] HTTPS اجباری و کوکی امن
- [ ] حذف رمزهای پیش‌فرض نمونه از مستندات عمومی
