package ir.helibar.sipaad.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ir.helibar.sipaad.model.*
import ir.helibar.sipaad.repository.SipaadRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DriverFleetUiState(
    val isLoading: Boolean = false,
    val driverInfo: DriverInfoCnt? = null,
    val fleetInfo: FleetInfoCnt? = null,
    val errorCode: Int? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class DriverFleetViewModel(
    private val repository: SipaadRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DriverFleetUiState())
    val uiState: StateFlow<DriverFleetUiState> = _uiState.asStateFlow()

    /**
     * Inquires both driver and linked fleet by National ID (کد ملی)
     */
    fun fetchDriverAndFleetByNationalId(nationalId: String) {
        val cleanNationalId = nationalId.trim()
        if (cleanNationalId.length != 10) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "کد ملی راننده باید ۱۰ رقمی باشد."
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = DriverFleetUiState(isLoading = true)

            // Step 1: Query Driver Info (WS41)
            when (val driverResult = repository.getDriverInfo(cleanNationalId)) {
                is SipaadResult.Success -> {
                    val driver = driverResult.data

                    // Step 2: Query Fleet Info (WS42)
                    when (val fleetResult = repository.getFleetInfo(cleanNationalId, null)) {
                        is SipaadResult.Success -> {
                            _uiState.value = DriverFleetUiState(
                                isLoading = false,
                                driverInfo = driver,
                                fleetInfo = fleetResult.data,
                                successMessage = "اطلاعات راننده و ناوگان با موفقیت از سامانه سپاد واکشی شد."
                            )
                        }
                        is SipaadResult.Error -> {
                            // Driver found, but fleet has error
                            _uiState.value = DriverFleetUiState(
                                isLoading = false,
                                driverInfo = driver,
                                fleetInfo = null,
                                errorCode = fleetResult.errorCode,
                                errorMessage = "اطلاعات راننده تایید شد، اما در استعلام ناوگان: ${fleetResult.persianMessage}"
                            )
                        }
                        is SipaadResult.NetworkFailure -> {
                            _uiState.value = DriverFleetUiState(
                                isLoading = false,
                                driverInfo = driver,
                                errorMessage = "اطلاعات راننده دریافت شد، اما ارتباط برای ناوگان قطع شد."
                            )
                        }
                        else -> Unit
                    }
                }
                is SipaadResult.Error -> {
                    _uiState.value = DriverFleetUiState(
                        isLoading = false,
                        errorCode = driverResult.errorCode,
                        errorMessage = driverResult.persianMessage
                    )
                }
                is SipaadResult.NetworkFailure -> {
                    _uiState.value = DriverFleetUiState(
                        isLoading = false,
                        errorMessage = driverResult.persianMessage
                    )
                }
                else -> Unit
            }
        }
    }

    fun clearState() {
        _uiState.value = DriverFleetUiState()
    }
}
