package ir.helibar.sipaad.model

/**
 * Fuel Quota Parsed Response Model
 */
data class FuelQuotaResult(
    val plateNumber: String,
    val nationalCode: String,
    val year: String,
    val month: String,
    val baseQuotaLiters: Int,
    val performanceQuotaLiters: Int,
    val totalQuotaLiters: Int,
    val statusDescription: String,
    val rawResponse: String
)

sealed class FuelQuotaState {
    object Idle : FuelQuotaState()
    data class FetchingSession(val message: String = "در حال ایجاد نشست امن و استخراج توکن‌های ASP.NET...") : FuelQuotaState()
    data class SubmittingInquiry(val message: String = "در حال استعلام سهمیه سوخت ناوگان...") : FuelQuotaState()
    data class Success(val data: FuelQuotaResult) : FuelQuotaState()
    data class Error(val message: String, val details: String? = null) : FuelQuotaState()
}
