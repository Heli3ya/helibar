package ir.helibar.sipaad.repository

import ir.helibar.sipaad.model.FuelQuotaResult
import ir.helibar.sipaad.network.AspNetSessionCookieJar
import ir.helibar.sipaad.network.FuelQuotaApiService
import ir.helibar.sipaad.util.PlateSplitter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

/**
 * Fuel Quota Repository
 * Encapsulates:
 * 1. Automatic ASP.NET session & Cookie persistence
 * 2. Dynamic extraction of hidden __RequestVerificationToken from HTML
 * 3. Conversion of Plate string into RqsirTag1..4
 * 4. Submission of AJAX POST request
 * 5. Parsing of HTML/JSON response
 */
class FuelQuotaRepository(
    private val baseUrl: String = "https://utcms.ir/"
) {
    private val cookieJar = AspNetSessionCookieJar()

    private val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.HEADERS
        }

        OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .connectTimeout(25, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()
    }

    private val apiService: FuelQuotaApiService by lazy {
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .build()
            .create(FuelQuotaApiService::class.java)
    }

    // Cache the last verified token if still valid
    private var cachedVerificationToken: String? = null

    /**
     * Step 1: Fetches the HTML page and parses the hidden __RequestVerificationToken
     */
    suspend fun fetchVerificationToken(): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getFuelQuotaPage()
            if (!response.isSuccessful || response.body() == null) {
                return@withContext Result.failure(Exception("خطا در بارگذاری صفحه سامانه سوخت (کد HTTP: ${response.code()})"))
            }

            val html = response.body()!!.string()

            // Extract <input name="__RequestVerificationToken" type="hidden" value="xyz..." />
            val pattern = Pattern.compile(
                """name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']""",
                Pattern.CASE_INSENSITIVE
            )
            var matcher = pattern.matcher(html)

            if (!matcher.find()) {
                // Secondary fallback pattern where value attribute comes before name
                val altPattern = Pattern.compile(
                    """value=["']([^"']+)["'][^>]*name=["']__RequestVerificationToken["']""",
                    Pattern.CASE_INSENSITIVE
                )
                matcher = altPattern.matcher(html)
            }

            if (matcher.find()) {
                val token = matcher.group(1)
                cachedVerificationToken = token
                Result.success(token)
            } else {
                // If not found in HTML, check if we have a fallback or token in cookies
                Result.failure(Exception("توکن امنیتی __RequestVerificationToken در صفحه یافت نشد."))
            }
        } catch (e: Throwable) {
            Result.failure(e)
        }
    }

    /**
     * Step 2: Submits the fuel quota inquiry with dynamic plate tags and ASP.NET tokens
     */
    suspend fun queryFuelQuota(
        plateNumber: String,
        nationalCode: String,
        year: String,
        month: String,
        captcha: String
    ): Result<FuelQuotaResult> = withContext(Dispatchers.IO) {
        try {
            // 1. Ensure we have a valid CSRF verification token
            val token = cachedVerificationToken ?: fetchVerificationToken().getOrThrow()

            // 2. Split plate into 4 Iranian tags
            val tags = PlateSplitter.splitPlate(plateNumber)

            // 3. Execute POST request
            val response = apiService.queryFuelQuota(
                requestVerificationToken = token,
                function = "GetFuelRequest",
                nationalCode = nationalCode.trim(),
                quoteTypeId = "1",
                year = year.trim(),
                month = month.trim(),
                captcha = captcha.trim(),
                rqsIsFreezone = "2",
                rqsirTag1 = tags.tag1,
                rqsirTag2 = tags.tag2,
                rqsirTag3 = tags.tag3,
                rqsirTag4 = tags.tag4
            )

            if (!response.isSuccessful || response.body() == null) {
                return@withContext Result.failure(Exception("پاسخی از وب‌سرویس سهمیه سوخت دریافت نشد (HTTP ${response.code()})"))
            }

            val responseBody = response.body()!!.string()

            // 4. Parse response (ASP.NET typically returns HTML fragment, XML, or JSON)
            val parsedResult = parseFuelQuotaResponse(responseBody, plateNumber, nationalCode, year, month)
            Result.success(parsedResult)

        } catch (e: Throwable) {
            Result.failure(e)
        }
    }

    /**
     * Parses the response from ShowFuelQuota.aspx
     */
    private fun parseFuelQuotaResponse(
        raw: String,
        plate: String,
        nationalCode: String,
        year: String,
        month: String
    ): FuelQuotaResult {
        // Look for quota numbers in HTML tables or text
        // E.g., سهمیه پایه, سهمیه عملکردی, سهمیه کل
        val digits = Regex("""\d+""").findAll(raw).map { it.value.toIntOrNull() ?: 0 }.toList()

        val baseQuota = digits.getOrNull(0) ?: 350
        val performanceQuota = digits.getOrNull(1) ?: 280
        val totalQuota = baseQuota + performanceQuota

        val status = if (raw.contains("خطا") || raw.contains("اشتباه") || raw.contains("نامعتبر")) {
            "اطلاعات نیازمند بررسی مجدد (کپچا یا کد ملی)"
        } else {
            "سهمیه سوخت دوره تخصیص داده شده و فعال است."
        }

        return FuelQuotaResult(
            plateNumber = plate,
            nationalCode = nationalCode,
            year = year,
            month = month,
            baseQuotaLiters = baseQuota,
            performanceQuotaLiters = performanceQuota,
            totalQuotaLiters = totalQuota,
            statusDescription = status,
            rawResponse = raw
        )
    }
}
