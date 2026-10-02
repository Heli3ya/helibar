package ir.helibar.sipaad.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ir.helibar.sipaad.model.CityCnt
import ir.helibar.sipaad.model.ProvinceCnt
import ir.helibar.sipaad.model.SipaadResult
import ir.helibar.sipaad.repository.SipaadRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BaseInfoUiState(
    val isLoadingProvinces: Boolean = false,
    val isLoadingCities: Boolean = false,
    val provinces: List<ProvinceCnt> = emptyList(),
    val filteredProvinces: List<ProvinceCnt> = emptyList(),
    val cities: List<CityCnt> = emptyList(),
    val filteredCities: List<CityCnt> = emptyList(),
    val selectedProvince: ProvinceCnt? = null,
    val selectedCity: CityCnt? = null,
    val errorMessage: String? = null
)

class BaseInfoViewModel(
    private val repository: SipaadRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BaseInfoUiState())
    val uiState: StateFlow<BaseInfoUiState> = _uiState.asStateFlow()

    init {
        loadProvinces()
    }

    fun loadProvinces(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingProvinces = true, errorMessage = null)
            when (val result = repository.getProvinces(forceRefresh)) {
                is SipaadResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingProvinces = false,
                        provinces = result.data,
                        filteredProvinces = result.data
                    )
                }
                is SipaadResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingProvinces = false,
                        errorMessage = result.persianMessage
                    )
                }
                is SipaadResult.NetworkFailure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingProvinces = false,
                        errorMessage = result.persianMessage
                    )
                }
                else -> Unit
            }
        }
    }

    fun selectProvince(province: ProvinceCnt) {
        _uiState.value = _uiState.value.copy(
            selectedProvince = province,
            selectedCity = null,
            cities = emptyList(),
            filteredCities = emptyList()
        )
        loadCitiesForProvince(province.provinceCode)
    }

    fun loadCitiesForProvince(provinceCode: Int, forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingCities = true, errorMessage = null)
            when (val result = repository.getCities(provinceCode, forceRefresh)) {
                is SipaadResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingCities = false,
                        cities = result.data,
                        filteredCities = result.data
                    )
                }
                is SipaadResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingCities = false,
                        errorMessage = result.persianMessage
                    )
                }
                is SipaadResult.NetworkFailure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingCities = false,
                        errorMessage = result.persianMessage
                    )
                }
                else -> Unit
            }
        }
    }

    fun selectCity(city: CityCnt) {
        _uiState.value = _uiState.value.copy(selectedCity = city)
    }

    fun filterProvinces(query: String) {
        val q = query.trim()
        val filtered = if (q.isBlank()) {
            _uiState.value.provinces
        } else {
            _uiState.value.provinces.filter { it.provinceName.contains(q, ignoreCase = true) }
        }
        _uiState.value = _uiState.value.copy(filteredProvinces = filtered)
    }

    fun filterCities(query: String) {
        val q = query.trim()
        val filtered = if (q.isBlank()) {
            _uiState.value.cities
        } else {
            _uiState.value.cities.filter { it.cityName.contains(q, ignoreCase = true) }
        }
        _uiState.value = _uiState.value.copy(filteredCities = filtered)
    }
}
