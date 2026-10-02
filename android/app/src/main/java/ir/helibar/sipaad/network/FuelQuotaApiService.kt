package ir.helibar.sipaad.network

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit Interface for ASP.NET UTCMS ShowFuelQuota.aspx
 */
interface FuelQuotaApiService {

    /**
     * 1. Initial GET request to obtain session cookies and CSRF tokens:
     *    - __AntiXsrfToken (Cookie)
     *    - cookiesession1 (Cookie)
     *    - UTCMS session cookie
     *    - __RequestVerificationToken (hidden input value in HTML)
     */
    @GET("ShowFuelQuota.aspx")
    @Headers(
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36"
    )
    suspend fun getFuelQuotaPage(): Response<ResponseBody>

    /**
     * 2. Captcha Image endpoint (if needed to display to dispatcher)
     */
    @GET("CaptchaImage.axd")
    suspend fun getCaptchaImage(): Response<ResponseBody>

    /**
     * 3. Form-urlencoded POST to query the fuel quota
     * Strictly matching the ASP.NET AJAX request:
     */
    @FormUrlEncoded
    @POST("ShowFuelQuota.aspx")
    @Headers(
        "Accept: */*",
        "Accept-Language: en-US,en;q=0.9",
        "Connection: keep-alive",
        "Origin: https://utcms.ir",
        "Referer: https://utcms.ir/ShowFuelQuota.aspx",
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
        "X-Requested-With: XMLHttpRequest"
    )
    suspend fun queryFuelQuota(
        @Field("__RequestVerificationToken") requestVerificationToken: String,
        @Field("function") function: String = "GetFuelRequest",
        @Field("NationalCode") nationalCode: String,
        @Field("QouetTypeId") quoteTypeId: String = "1",
        @Field("Year") year: String,
        @Field("Month") month: String,
        @Field("captcha") captcha: String,
        @Field("rqsIsFreezone") rqsIsFreezone: String = "2",
        @Field("RqsirTag1") rqsirTag1: String,
        @Field("RqsirTag2") rqsirTag2: String,
        @Field("RqsirTag3") rqsirTag3: String,
        @Field("RqsirTag4") rqsirTag4: String
    ): Response<ResponseBody>
}
