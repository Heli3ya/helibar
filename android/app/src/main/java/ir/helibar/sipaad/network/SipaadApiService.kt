package ir.helibar.sipaad.network

import ir.helibar.sipaad.model.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Headers
import retrofit2.http.POST

/**
 * HeliBar (هلی‌بار) - Official Retrofit Interface for SIPAAD / UTCMS Web Services
 * Strictly based on "UTCM-WS-BOL-GUIDE (03.24) (1).pdf"
 * All methods use HTTP POST with JSON body.
 */
interface SipaadApiService {

    // 1. صدور باربرگ جدید (Issue BOL)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS01_InsertBOL")
    suspend fun insertBOL(
        @Body request: InsertBOLRequest
    ): Response<InsertBOLResponse>

    // 2. شروع باربرگ و آغاز سفر (Start BOL)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS03_StartBOL")
    suspend fun startBOL(
        @Body request: StartBOLRequest
    ): Response<StartBOLResponse>

    // 3. ثبت موقعیت مکانی و رهگیری با GPS (Track BOL)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS06_InsertBOLTrack")
    suspend fun insertBOLTrack(
        @Body request: InsertBOLTrackRequest
    ): Response<InsertBOLTrackResponse>

    // 4. اتمام باربرگ و تحویل محموله (End BOL)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS04_EndBOL")
    suspend fun endBOL(
        @Body request: EndBOLRequest
    ): Response<EndBOLResponse>

    // 5. استعلام لیست استان‌ها (Get Provinces)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS11_GetProvinces")
    suspend fun getProvinces(
        @Body request: GetProvincesRequest
    ): Response<GetProvincesResponse>

    // 6. استعلام لیست شهرهای استان (Get Cities)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS12_GetCities")
    suspend fun getCities(
        @Body request: GetCitiesRequest
    ): Response<GetCitiesResponse>

    // 7. استعلام اطلاعات و کارت هوشمند راننده (Driver Info by National ID)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS41_GetDriverInfo")
    suspend fun getDriverInfo(
        @Body request: GetDriverInfoRequest
    ): Response<GetDriverInfoResponse>

    // 8. استعلام اطلاعات ناوگان و مشخصات پلاک (Fleet Info)
    @Headers("Content-Type: application/json; charset=utf-8")
    @POST("WS42_GetFleetInfo")
    suspend fun getFleetInfo(
        @Body request: GetFleetInfoRequest
    ): Response<GetFleetInfoResponse>
}
