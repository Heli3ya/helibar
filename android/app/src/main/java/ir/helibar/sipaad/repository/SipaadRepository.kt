package ir.helibar.sipaad.repository

import ir.helibar.sipaad.model.*

/**
 * HeliBar (هلی‌بار) - Sipaad Repository Interface
 */
interface SipaadRepository {
    // 1. Trip / BOL Flow
    suspend fun insertBOL(bol: BOLCnt): SipaadResult<InsertBOLResponse>
    suspend fun startBOL(trackingCode: String, startDateTime: String): SipaadResult<StartBOLResponse>
    suspend fun trackBOL(trackingCode: String, points: List<GPSCnt>): SipaadResult<InsertBOLTrackResponse>
    suspend fun endBOL(trackingCode: String, endDateTime: String, unloadWeightKg: Int? = null): SipaadResult<EndBOLResponse>

    // 2. Base Info (Provinces & Cities with caching)
    suspend fun getProvinces(forceRefresh: Boolean = false): SipaadResult<List<ProvinceCnt>>
    suspend fun getCities(provinceCode: Int, forceRefresh: Boolean = false): SipaadResult<List<CityCnt>>

    // 3. Driver & Fleet Info
    suspend fun getDriverInfo(nationalCode: String): SipaadResult<DriverInfoCnt>
    suspend fun getFleetInfo(nationalCode: String?, plateNumber: String?): SipaadResult<FleetInfoCnt>
}
