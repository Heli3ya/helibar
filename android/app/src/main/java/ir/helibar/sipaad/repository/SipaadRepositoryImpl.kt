package ir.helibar.sipaad.repository

import ir.helibar.sipaad.model.*
import ir.helibar.sipaad.network.SipaadApiService
import ir.helibar.sipaad.security.SipaadSecurity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap

/**
 * HeliBar (هلی‌بار) - Sipaad Repository Implementation
 * Handles:
 * 1. Automatic SHA-512 signing (Section 17)
 * 2. In-Memory caching of Provinces and Cities (avoids redundant queries)
 * 3. Strict error mapping to Sealed Class (SipaadResult)
 */
class SipaadRepositoryImpl(
    private val apiService: SipaadApiService,
    private val companyCode: String = "24981",
    private val companyPassword: String = "helibar@1404"
) : SipaadRepository {

    // In-memory cache for Provinces & Cities
    private var cachedProvinces: List<ProvinceCnt>? = null
    private val cachedCitiesByProvince = ConcurrentHashMap<Int, List<CityCnt>>()

    private fun getAuthEnvelope(): SipaadSecurity.HashResult {
        return SipaadSecurity.getSHA512Hash(companyCode, companyPassword)
    }

    // ==========================================
    // 1. Trip / BOL Flow (Issue, Start, Track, End)
    // ==========================================

    override suspend fun insertBOL(bol: BOLCnt): SipaadResult<InsertBOLResponse> =
        withContext(Dispatchers.IO) {
            try {
                val auth = getAuthEnvelope()
                val request = InsertBOLRequest(
                    companyCode = auth.companyCode,
                    salt = auth.salt,
                    hashedValue = auth.hashedValue,
                    bol = bol
                )
                val response = apiService.insertBOL(request)
                if (response.isSuccessful) {
                    val body = response.body()
                    val exc = body?.exceptionCnt
                    if (exc == null || exc.isSuccess) {
                        if (body != null) SipaadResult.Success(body)
                        else SipaadResult.Error(500, null, "پاسخ دریافتی از سامانه سپاد خالی است.")
                    } else {
                        SipaadErrorMapper.fromExceptionCnt(exc)
                    }
                } else {
                    SipaadResult.Error(
                        response.code(),
                        response.message(),
                        "خطای سرور سپاد با کد وضعیت HTTP: ${response.code()}"
                    )
                }
            } catch (t: Throwable) {
                SipaadResult.NetworkFailure(t)
            }
        }

    override suspend fun startBOL(
        trackingCode: String,
        startDateTime: String
    ): SipaadResult<StartBOLResponse> = withContext(Dispatchers.IO) {
        try {
            val auth = getAuthEnvelope()
            val request = StartBOLRequest(
                companyCode = auth.companyCode,
                salt = auth.salt,
                hashedValue = auth.hashedValue,
                trackingCode = trackingCode,
                startDateTime = startDateTime
            )
            val response = apiService.startBOL(request)
            if (response.isSuccessful) {
                val body = response.body()
                val exc = body?.exceptionCnt
                if (exc == null || exc.isSuccess) {
                    if (body != null) SipaadResult.Success(body)
                    else SipaadResult.Error(500, null, "پاسخ شروع سفر خالی است.")
                } else {
                    SipaadErrorMapper.fromExceptionCnt(exc)
                }
            } else {
                SipaadResult.Error(response.code(), response.message(), "خطا در شروع باربرگ.")
            }
        } catch (t: Throwable) {
            SipaadResult.NetworkFailure(t)
        }
    }

    override suspend fun trackBOL(
        trackingCode: String,
        points: List<GPSCnt>
    ): SipaadResult<InsertBOLTrackResponse> = withContext(Dispatchers.IO) {
        try {
            val auth = getAuthEnvelope()
            val request = InsertBOLTrackRequest(
                companyCode = auth.companyCode,
                salt = auth.salt,
                hashedValue = auth.hashedValue,
                trackingCode = trackingCode,
                gpsList = points
            )
            val response = apiService.insertBOLTrack(request)
            if (response.isSuccessful) {
                val body = response.body()
                val exc = body?.exceptionCnt
                if (exc == null || exc.isSuccess) {
                    if (body != null) SipaadResult.Success(body)
                    else SipaadResult.Error(500, null, "پاسخ ارسال موقعیت GPS خالی است.")
                } else {
                    SipaadErrorMapper.fromExceptionCnt(exc)
                }
            } else {
                SipaadResult.Error(response.code(), response.message(), "خطا در ثبت مختصات موقعیت باربرگ.")
            }
        } catch (t: Throwable) {
            SipaadResult.NetworkFailure(t)
        }
    }

    override suspend fun endBOL(
        trackingCode: String,
        endDateTime: String,
        unloadWeightKg: Int?
    ): SipaadResult<EndBOLResponse> = withContext(Dispatchers.IO) {
        try {
            val auth = getAuthEnvelope()
            val request = EndBOLRequest(
                companyCode = auth.companyCode,
                salt = auth.salt,
                hashedValue = auth.hashedValue,
                trackingCode = trackingCode,
                endDateTime = endDateTime,
                unloadWeightKg = unloadWeightKg
            )
            val response = apiService.endBOL(request)
            if (response.isSuccessful) {
                val body = response.body()
                val exc = body?.exceptionCnt
                if (exc == null || exc.isSuccess) {
                    if (body != null) SipaadResult.Success(body)
                    else SipaadResult.Error(500, null, "پاسخ خاتمه باربرگ خالی است.")
                } else {
                    SipaadErrorMapper.fromExceptionCnt(exc)
                }
            } else {
                SipaadResult.Error(response.code(), response.message(), "خطا در خاتمه باربرگ.")
            }
        } catch (t: Throwable) {
            SipaadResult.NetworkFailure(t)
        }
    }

    // ==========================================
    // 2. Base Info (Provinces & Cities with Caching)
    // ==========================================

    override suspend fun getProvinces(forceRefresh: Boolean): SipaadResult<List<ProvinceCnt>> =
        withContext(Dispatchers.IO) {
            if (!forceRefresh && cachedProvinces != null) {
                return@withContext SipaadResult.Success(cachedProvinces!!)
            }

            try {
                val auth = getAuthEnvelope()
                val request = GetProvincesRequest(
                    companyCode = auth.companyCode,
                    salt = auth.salt,
                    hashedValue = auth.hashedValue
                )
                val response = apiService.getProvinces(request)
                if (response.isSuccessful) {
                    val body = response.body()
                    val exc = body?.exceptionCnt
                    if (exc == null || exc.isSuccess) {
                        val list = body?.provinces ?: emptyList()
                        cachedProvinces = list
                        SipaadResult.Success(list)
                    } else {
                        SipaadErrorMapper.fromExceptionCnt(exc)
                    }
                } else {
                    SipaadResult.Error(response.code(), response.message(), "خطا در دریافت لیست استان‌ها.")
                }
            } catch (t: Throwable) {
                SipaadResult.NetworkFailure(t)
            }
        }

    override suspend fun getCities(
        provinceCode: Int,
        forceRefresh: Boolean
    ): SipaadResult<List<CityCnt>> = withContext(Dispatchers.IO) {
        if (!forceRefresh && cachedCitiesByProvince.containsKey(provinceCode)) {
            return@withContext SipaadResult.Success(cachedCitiesByProvince[provinceCode]!!)
        }

        try {
            val auth = getAuthEnvelope()
            val request = GetCitiesRequest(
                companyCode = auth.companyCode,
                salt = auth.salt,
                hashedValue = auth.hashedValue,
                provinceCode = provinceCode
            )
            val response = apiService.getCities(request)
            if (response.isSuccessful) {
                val body = response.body()
                val exc = body?.exceptionCnt
                if (exc == null || exc.isSuccess) {
                    val list = body?.cities ?: emptyList()
                    cachedCitiesByProvince[provinceCode] = list
                    SipaadResult.Success(list)
                } else {
                    SipaadErrorMapper.fromExceptionCnt(exc)
                }
            } else {
                SipaadResult.Error(response.code(), response.message(), "خطا در دریافت لیست شهرهای استان.")
            }
        } catch (t: Throwable) {
            SipaadResult.NetworkFailure(t)
        }
    }

    // ==========================================
    // 3. Driver & Fleet Info
    // ==========================================

    override suspend fun getDriverInfo(nationalCode: String): SipaadResult<DriverInfoCnt> =
        withContext(Dispatchers.IO) {
            try {
                val auth = getAuthEnvelope()
                val request = GetDriverInfoRequest(
                    companyCode = auth.companyCode,
                    salt = auth.salt,
                    hashedValue = auth.hashedValue,
                    nationalCode = nationalCode.trim()
                )
                val response = apiService.getDriverInfo(request)
                if (response.isSuccessful) {
                    val body = response.body()
                    val exc = body?.exceptionCnt
                    if (exc == null || exc.isSuccess) {
                        val driver = body?.driverInfo
                        if (driver != null) SipaadResult.Success(driver)
                        else SipaadResult.Error(445041, null, "اطلاعات راننده با این کد ملی در سپاد یافت نشد.")
                    } else {
                        SipaadErrorMapper.fromExceptionCnt(exc)
                    }
                } else {
                    SipaadResult.Error(response.code(), response.message(), "خطا در استعلام اطلاعات راننده.")
                }
            } catch (t: Throwable) {
                SipaadResult.NetworkFailure(t)
            }
        }

    override suspend fun getFleetInfo(
        nationalCode: String?,
        plateNumber: String?
    ): SipaadResult<FleetInfoCnt> = withContext(Dispatchers.IO) {
        try {
            val auth = getAuthEnvelope()
            val request = GetFleetInfoRequest(
                companyCode = auth.companyCode,
                salt = auth.salt,
                hashedValue = auth.hashedValue,
                nationalCode = nationalCode?.trim(),
                plateNumber = plateNumber?.trim()
            )
            val response = apiService.getFleetInfo(request)
            if (response.isSuccessful) {
                val body = response.body()
                val exc = body?.exceptionCnt
                if (exc == null || exc.isSuccess) {
                    val fleet = body?.fleetInfo
                    if (fleet != null) SipaadResult.Success(fleet)
                    else SipaadResult.Error(445042, null, "مشخصات ناوگان در سامانه سپاد یافت نشد.")
                } else {
                    SipaadErrorMapper.fromExceptionCnt(exc)
                }
            } else {
                SipaadResult.Error(response.code(), response.message(), "خطا در استعلام اطلاعات ناوگان.")
            }
        } catch (t: Throwable) {
            SipaadResult.NetworkFailure(t)
        }
    }
}
