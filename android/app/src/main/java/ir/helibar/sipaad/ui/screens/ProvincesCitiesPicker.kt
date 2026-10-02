package ir.helibar.sipaad.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.helibar.sipaad.model.CityCnt
import ir.helibar.sipaad.model.ProvinceCnt
import ir.helibar.sipaad.viewmodel.BaseInfoViewModel

/**
 * Jetpack Compose UI for Provinces and Cities Base Info (WS11 & WS12)
 * Features:
 * - Extraction & in-memory caching
 * - Instant search query filtering
 * - Cascading Province -> City selection
 */
@Composable
fun ProvincesCitiesPicker(
    viewModel: BaseInfoViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var provinceSearchQuery by remember { mutableStateOf("") }
    var citySearchQuery by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = "هلی‌بار | استعلام و کشینگ اطلاعات پایه (استان و شهر)",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A)
        )
        Text(
            text = "بر اساس وب‌سرویس‌های WS11_GetProvinces و WS12_GetCities",
            fontSize = 13.sp,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
        )

        // Selected Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "استان انتخاب شده: ${uiState.selectedProvince?.provinceName ?: "هیچ‌کدام"}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF1E3A8A)
                    )
                    Text(
                        text = "شهر مقصد: ${uiState.selectedCity?.cityName ?: "هیچ‌کدام"}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF1E3A8A)
                    )
                }

                Button(
                    onClick = { viewModel.loadProvinces(forceRefresh = true) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                ) {
                    Text("بروزرسانی کش", fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Split view or tabs for Province vs Cities
        Row(modifier = Modifier.fillMaxSize()) {
            // Left Column: Provinces
            Card(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "لیست استان‌ها (${uiState.filteredProvinces.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = provinceSearchQuery,
                        onValueChange = {
                            provinceSearchQuery = it
                            viewModel.filterProvinces(it)
                        },
                        placeholder = { Text("جستجوی استان...") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (uiState.isLoadingProvinces) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        }
                    } else {
                        LazyColumn(modifier = Modifier.fillMaxSize()) {
                            items(uiState.filteredProvinces) { province ->
                                ProvinceItemRow(
                                    province = province,
                                    isSelected = uiState.selectedProvince?.provinceCode == province.provinceCode,
                                    onClick = { viewModel.selectProvince(province) }
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Right Column: Cities
            Card(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = if (uiState.selectedProvince != null)
                            "شهرهای ${uiState.selectedProvince?.provinceName} (${uiState.filteredCities.size})"
                        else "شهرهای استان",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = citySearchQuery,
                        onValueChange = {
                            citySearchQuery = it
                            viewModel.filterCities(it)
                        },
                        placeholder = { Text("جستجوی شهر...") },
                        singleLine = true,
                        enabled = uiState.selectedProvince != null,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (uiState.isLoadingCities) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        }
                    } else if (uiState.selectedProvince == null) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                text = "لطفاً ابتدا یک استان را انتخاب کنید",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp
                            )
                        }
                    } else {
                        LazyColumn(modifier = Modifier.fillMaxSize()) {
                            items(uiState.filteredCities) { city ->
                                CityItemRow(
                                    city = city,
                                    isSelected = uiState.selectedCity?.cityCode == city.cityCode,
                                    onClick = { viewModel.selectCity(city) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProvinceItemRow(
    province: ProvinceCnt,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(6.dp),
        color = if (isSelected) Color(0xFFDBEAFE) else Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = province.provinceName,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) Color(0xFF1D4ED8) else Color(0xFF334155)
            )
            Text(
                text = "کد: ${province.provinceCode}",
                fontSize = 11.sp,
                color = Color(0xFF94A3B8)
            )
        }
    }
}

@Composable
fun CityItemRow(
    city: CityCnt,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(6.dp),
        color = if (isSelected) Color(0xFFDCFCE7) else Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = city.cityName,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) Color(0xFF15803D) else Color(0xFF334155)
            )
            Text(
                text = "کد: ${city.cityCode}",
                fontSize = 11.sp,
                color = Color(0xFF94A3B8)
            )
        }
    }
}
