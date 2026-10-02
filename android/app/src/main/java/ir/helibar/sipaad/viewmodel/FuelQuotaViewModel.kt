package ir.helibar.sipaad.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ir.helibar.sipaad.model.FuelQuotaResult
import ir.helibar.sipaad.model.FuelQuotaState
import ir.helibar.sipaad.repository.FuelQuotaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Fuel Quota ViewModel for HeliBar Operational Dashboard
 */
class FuelQuotaViewModel(
    private val repository: FuelQuotaRepository = FuelQuotaRepository()
) : ViewModel() {

    private val _quotaState = MutableStateFlow<FuelQuotaState>(FuelQuotaState.Idle)
    val quotaState: StateFlow<FuelQuotaState> = _quotaState.asStateFlow()

    // Current Jalali date defaults (e.g. 1403/1404/1405 Month 7)
    var selectedYear: String = "1405"
    var selectedMonth: String = "7"
    var lastEnteredCaptcha: String = "49766"

    /**
     * Triggered when a dispatcher clicks on a plate in the Operational Dashboard
     * 1. Fetches CSRF session token & cookies
     * 2. Splits license plate
     * 3. Sends POST request to ShowFuelQuota.aspx
     * 4. Updates StateFlow for Compose UI
     */
    fun getFuelQuotaForPlate(
        plateNumber: String,
        nationalCode: String,
        year: String = selectedYear,
        month: String = selectedMonth,
        captcha: String = lastEnteredCaptcha
    ) {
        val cleanPlate = plateNumber.trim()
        val cleanNationalCode = nationalCode.trim()

        if (cleanPlate.isBlank()) {
            _quotaState.value = FuelQuotaState.Error("شماره پلاک ناوگان نامعتبر است.")
            return
        }

        if (cleanNationalCode.length != 10) {
            _quotaState.value = FuelQuotaState.Error("کد ملی راننده یا مالک باید ۱۰ رقمی باشد.")
            return
        }

        viewModelScope.launch {
            // Stage 1: Session Initiation
            _quotaState.value = FuelQuotaState.FetchingSession()

            // Stage 2: Submit Inquiry
            _quotaState.value = FuelQuotaState.SubmittingInquiry()

            repository.queryFuelQuota(
                plateNumber = cleanPlate,
                nationalCode = cleanNationalCode,
                year = year,
                month = month,
                captcha = captcha
            ).fold(
                onSuccess = { result ->
                    _quotaState.value = FuelQuotaState.Success(result)
                },
                onFailure = { error ->
                    _quotaState.value = FuelQuotaState.Error(
                        message = error.localizedMessage ?: "خطا در دریافت سهمیه سوخت از سامانه UTCMS",
                        details = error.stackTraceToString()
                    )
                }
            )
        }
    }

    fun resetState() {
        _quotaState.value = FuelQuotaState.Idle
    }
}
