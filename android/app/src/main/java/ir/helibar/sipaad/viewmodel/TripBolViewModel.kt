package ir.helibar.sipaad.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ir.helibar.sipaad.model.*
import ir.helibar.sipaad.repository.SipaadRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

enum class TripStage {
    IDLE,
    ISSUED,
    STARTED,
    TRACKING,
    ENDED
}

data class TripUiState(
    val stage: TripStage = TripStage.IDLE,
    val isLoading: Boolean = false,
    val trackingCode: String? = null,
    val waybillNumber: String? = null,
    val issueDate: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val trackedPointsCount: Int = 0,
    val errorMessage: String? = null,
    val errorCode: Int? = null,
    val successMessage: String? = null
)

class TripBolViewModel(
    private val repository: SipaadRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TripUiState())
    val uiState: StateFlow<TripUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    /**
     * Step 1: Issue BOL (WS01_InsertBOL)
     */
    fun issueBOL(bol: BOLCnt) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null,
                successMessage = null
            )

            when (val result = repository.insertBOL(bol)) {
                is SipaadResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        stage = TripStage.ISSUED,
                        trackingCode = result.data.trackingCode,
                        waybillNumber = result.data.waybillNumber,
                        issueDate = result.data.issueDate ?: dateFormat.format(Date()),
                        successMessage = "باربرگ با موفقیت در سامانه سپاد صادر شد. کد رهگیری: ${result.data.trackingCode}"
                    )
                }
                is SipaadResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorCode = result.errorCode,
                        errorMessage = result.persianMessage
                    )
                }
                is SipaadResult.NetworkFailure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.persianMessage
                    )
                }
                else -> Unit
            }
        }
    }

    /**
     * Step 2: Start BOL (WS03_StartBOL)
     */
    fun startBOL(customTrackingCode: String? = null) {
        val tracking = customTrackingCode ?: _uiState.value.trackingCode
        if (tracking.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "کد رهگیری باربرگ نامعتبر است.")
            return
        }

        val startTimestamp = dateFormat.format(Date())

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            when (val result = repository.startBOL(tracking, startTimestamp)) {
                is SipaadResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        stage = TripStage.STARTED,
                        startDate = startTimestamp,
                        successMessage = "سفر باربرگ با موفقیت آغاز شد."
                    )
                }
                is SipaadResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorCode = result.errorCode,
                        errorMessage = result.persianMessage
                    )
                }
                is SipaadResult.NetworkFailure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.persianMessage
                    )
                }
                else -> Unit
            }
        }
    }

    /**
     * Step 3: Track GPS Coordinates (WS06_InsertBOLTrack)
     */
    fun trackBOL(points: List<GPSCnt>, customTrackingCode: String? = null) {
        val tracking = customTrackingCode ?: _uiState.value.trackingCode
        if (tracking.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "کد رهگیری باربرگ یافت نشد.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            when (val result = repository.trackBOL(tracking, points)) {
                is SipaadResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        stage = TripStage.TRACKING,
                        trackedPointsCount = _uiState.value.trackedPointsCount + points.size,
                        successMessage = "${points.size} نقطه مکانی با موفقیت در سپاد ثبت شد."
                    )
                }
                is SipaadResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorCode = result.errorCode,
                        errorMessage = result.persianMessage
                    )
                }
                is SipaadResult.NetworkFailure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.persianMessage
                    )
                }
                else -> Unit
            }
        }
    }

    /**
     * Step 4: End BOL (WS04_EndBOL)
     */
    fun endBOL(unloadWeightKg: Int? = null, customTrackingCode: String? = null) {
        val tracking = customTrackingCode ?: _uiState.value.trackingCode
        if (tracking.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "کد رهگیری برای خاتمه یافت نشد.")
            return
        }

        val endTimestamp = dateFormat.format(Date())

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            when (val result = repository.endBOL(tracking, endTimestamp, unloadWeightKg)) {
                is SipaadResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        stage = TripStage.ENDED,
                        endDate = endTimestamp,
                        successMessage = "باربرگ با موفقیت در سامانه سپاد خاتمه یافت و تحویل داده شد."
                    )
                }
                is SipaadResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorCode = result.errorCode,
                        errorMessage = result.persianMessage
                    )
                }
                is SipaadResult.NetworkFailure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.persianMessage
                    )
                }
                else -> Unit
            }
        }
    }

    fun resetState() {
        _uiState.value = TripUiState()
    }
}
