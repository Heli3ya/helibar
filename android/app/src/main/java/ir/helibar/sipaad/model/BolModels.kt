package ir.helibar.sipaad.model

import com.google.gson.annotations.SerializedName

/**
 * HeliBar (هلی‌بار) - Official Data Models strictly adhering to
 * "UTCM-WS-BOL-GUIDE" (SIPAAD / سامانه باربرگ شهری)
 */

/**
 * Standard Exception Object returned in all UTCMS API responses
 */
data class ExceptionCnt(
    @SerializedName("ErrorCode")
    val errorCode: Int = 0,

    @SerializedName("ErrorDesc")
    val errorDesc: String? = null
) {
    val isSuccess: Boolean get() = errorCode == 0 || errorCode == 200
}

/**
 * Standard Security Envelope Header required for every SIPAAD request
 */
data class AuthEnvelope(
    @SerializedName("CompanyCode")
    val companyCode: String,

    @SerializedName("Salt")
    val salt: Long,

    @SerializedName("HashedValue")
    val hashedValue: String
)

/**
 * BOLCnt: Full Bill of Lading (باربرگ) content structure
 */
data class BOLCnt(
    @SerializedName("WaybillNumber")
    val waybillNumber: String? = null,

    // Sender Information (فرستنده)
    @SerializedName("SenderName")
    val senderName: String,

    @SerializedName("SenderNationalId")
    val senderNationalId: String,

    @SerializedName("SenderPostalCode")
    val senderPostalCode: String? = null,

    @SerializedName("SenderAddress")
    val senderAddress: String,

    @SerializedName("SenderCityCode")
    val senderCityCode: Int,

    // Receiver Information (گیرنده)
    @SerializedName("ReceiverName")
    val receiverName: String,

    @SerializedName("ReceiverNationalId")
    val receiverNationalId: String,

    @SerializedName("ReceiverPostalCode")
    val receiverPostalCode: String? = null,

    @SerializedName("ReceiverAddress")
    val receiverAddress: String,

    @SerializedName("ReceiverCityCode")
    val receiverCityCode: Int,

    // Cargo Information (محموله)
    @SerializedName("CargoDescription")
    val cargoDescription: String,

    @SerializedName("CargoWeightKg")
    val cargoWeightKg: Int,

    @SerializedName("PackagingType")
    val packagingType: String = "بسته‌بندی استاندارد",

    @SerializedName("CargoValueRials")
    val cargoValueRials: Long = 0L,

    // Vehicle & Driver Details (ناوگان و راننده)
    @SerializedName("PlatePart1")
    val platePart1: String,

    @SerializedName("PlateLetter")
    val plateLetter: String,

    @SerializedName("PlatePart2")
    val platePart2: String,

    @SerializedName("PlateProvince")
    val plateProvince: String,

    @SerializedName("FleetSmartCard")
    val fleetSmartCard: String? = null,

    @SerializedName("DriverNationalCode")
    val driverNationalCode: String,

    @SerializedName("DriverMobile")
    val driverMobile: String,

    // Financial Values (هزینه‌ها)
    @SerializedName("FreightCostRials")
    val freightCostRials: Long = 0L,

    @SerializedName("CommissionRials")
    val commissionRials: Long = 0L,

    @SerializedName("InsuranceCostRials")
    val insuranceCostRials: Long = 0L,

    @SerializedName("MunicipalTollRials")
    val municipalTollRials: Long = 0L,

    // Optional Fields (Critical: Must serialize as explicit null if empty)
    @SerializedName("TransitPermitCode")
    val transitPermitCode: String? = null,

    @SerializedName("SecondaryReceiverCode")
    val secondaryReceiverCode: String? = null,

    @SerializedName("MunicipalExemptionCode")
    val municipalExemptionCode: String? = null,

    @SerializedName("TrackingRemarks")
    val trackingRemarks: String? = null
)

/**
 * GPS Tracking Coordinate point for WS06_InsertBOLTrack
 */
data class GPSCnt(
    @SerializedName("Latitude")
    val latitude: Double,

    @SerializedName("Longitude")
    val longitude: Double,

    @SerializedName("SpeedKmh")
    val speedKmh: Float = 0f,

    @SerializedName("AltitudeMeters")
    val altitudeMeters: Double? = null,

    @SerializedName("BearingDegrees")
    val bearingDegrees: Float? = null,

    @SerializedName("Timestamp")
    val timestamp: String // ISO 8601 or YYYY-MM-DD HH:mm:ss
)

/**
 * Base Info Models (استان و شهر)
 */
data class ProvinceCnt(
    @SerializedName("ProvinceCode")
    val provinceCode: Int,

    @SerializedName("ProvinceName")
    val provinceName: String
)

data class CityCnt(
    @SerializedName("CityCode")
    val cityCode: Int,

    @SerializedName("ProvinceCode")
    val provinceCode: Int,

    @SerializedName("CityName")
    val cityName: String
)

/**
 * Driver Information Model (WS41 / WS21)
 */
data class DriverInfoCnt(
    @SerializedName("NationalCode")
    val nationalCode: String,

    @SerializedName("FirstName")
    val firstName: String,

    @SerializedName("LastName")
    val lastName: String,

    @SerializedName("MobileNumber")
    val mobileNumber: String,

    @SerializedName("SmartCardNumber")
    val smartCardNumber: String? = null,

    @SerializedName("LicenseNumber")
    val licenseNumber: String? = null,

    @SerializedName("LicenseValidityDate")
    val licenseValidityDate: String? = null,

    @SerializedName("IsActive")
    val isActive: Boolean = true
) {
    val fullName: String get() = "$firstName $lastName".trim()
}

/**
 * Fleet / Vehicle Information Model (WS42)
 */
data class FleetInfoCnt(
    @SerializedName("PlatePart1")
    val platePart1: String,

    @SerializedName("PlateLetter")
    val plateLetter: String,

    @SerializedName("PlatePart2")
    val platePart2: String,

    @SerializedName("PlateProvince")
    val plateProvince: String,

    @SerializedName("VehicleType")
    val vehicleType: String,

    @SerializedName("SmartCardNumber")
    val smartCardNumber: String? = null,

    @SerializedName("TonnageKg")
    val tonnageKg: Int = 0,

    @SerializedName("FuelQuotaLiters")
    val fuelQuotaLiters: Int = 0,

    @SerializedName("TechnicalInspectionValid")
    val technicalInspectionValid: Boolean = true
) {
    val formattedPlate: String
        get() = "$platePart1 $plateLetter $platePart2 ایران $plateProvince"
}

// ==========================================
// Request & Response Wrappers
// ==========================================

// WS01_InsertBOL
data class InsertBOLRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String,
    @SerializedName("BOL") val bol: BOLCnt
)

data class InsertBOLResponse(
    @SerializedName("TrackingCode") val trackingCode: String? = null,
    @SerializedName("WaybillNumber") val waybillNumber: String? = null,
    @SerializedName("IssueDate") val issueDate: String? = null,
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)

// WS03_StartBOL
data class StartBOLRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String,
    @SerializedName("TrackingCode") val trackingCode: String,
    @SerializedName("StartDateTime") val startDateTime: String
)

data class StartBOLResponse(
    @SerializedName("ResultCode") val resultCode: Int = 0,
    @SerializedName("TrackingCode") val trackingCode: String? = null,
    @SerializedName("Status") val status: String? = null,
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)

// WS06_InsertBOLTrack
data class InsertBOLTrackRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String,
    @SerializedName("TrackingCode") val trackingCode: String,
    @SerializedName("GPSList") val gpsList: List<GPSCnt>
)

data class InsertBOLTrackResponse(
    @SerializedName("ResultCode") val resultCode: Int = 0,
    @SerializedName("TrackingCode") val trackingCode: String? = null,
    @SerializedName("RecordedPoints") val recordedPoints: Int = 0,
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)

// WS04_EndBOL
data class EndBOLRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String,
    @SerializedName("TrackingCode") val trackingCode: String,
    @SerializedName("EndDateTime") val endDateTime: String,
    @SerializedName("UnloadWeightKg") val unloadWeightKg: Int? = null
)

data class EndBOLResponse(
    @SerializedName("ResultCode") val resultCode: Int = 0,
    @SerializedName("TrackingCode") val trackingCode: String? = null,
    @SerializedName("DeliveredDate") val deliveredDate: String? = null,
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)

// WS11_GetProvinces
data class GetProvincesRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String
)

data class GetProvincesResponse(
    @SerializedName("Provinces") val provinces: List<ProvinceCnt> = emptyList(),
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)

// WS12_GetCities
data class GetCitiesRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String,
    @SerializedName("ProvinceCode") val provinceCode: Int
)

data class GetCitiesResponse(
    @SerializedName("Cities") val cities: List<CityCnt> = emptyList(),
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)

// WS41_GetDriverInfo
data class GetDriverInfoRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String,
    @SerializedName("NationalCode") val nationalCode: String
)

data class GetDriverInfoResponse(
    @SerializedName("DriverInfo") val driverInfo: DriverInfoCnt? = null,
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)

// WS42_GetFleetInfo
data class GetFleetInfoRequest(
    @SerializedName("CompanyCode") val companyCode: String,
    @SerializedName("Salt") val salt: Long,
    @SerializedName("HashedValue") val hashedValue: String,
    @SerializedName("NationalCode") val nationalCode: String? = null,
    @SerializedName("PlateNumber") val plateNumber: String? = null
)

data class GetFleetInfoResponse(
    @SerializedName("FleetInfo") val fleetInfo: FleetInfoCnt? = null,
    @SerializedName("ExceptionCnt") val exceptionCnt: ExceptionCnt? = null
)
