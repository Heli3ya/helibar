package ir.helibar.sipaad.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.helibar.sipaad.model.DriverInfoCnt
import ir.helibar.sipaad.model.FleetInfoCnt
import ir.helibar.sipaad.viewmodel.DriverFleetViewModel

/**
 * Jetpack Compose UI for Driver & Fleet Info Inquiry (WS41 / WS42 / WS21)
 * Inputs: Driver National ID (کد ملی)
 * Outputs: Driver Smart Card & Fleet Specs with reactive Loading, Error, and Success states.
 */
@Composable
fun DriverFleetScreen(
    viewModel: DriverFleetViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var nationalIdInput by remember { mutableStateOf("0078192341") }
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp)
            .verticalScroll(scrollState),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Title
        Text(
            text = "هلی‌بار | استعلام و افزودن راننده و ناوگان (SIPAAD)",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A)
        )
        Text(
            text = "استعلام برخط اصالت کارت هوشمند و مشخصات پلاک (WS41 & WS42)",
            fontSize = 13.sp,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
        )

        // National ID Input Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "کد ملی راننده را جهت استعلام وارد نمایید:",
                    fontSize = 14.sp,
                    color = Color(0xFF334155),
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = nationalIdInput,
                    onValueChange = { if (it.length <= 10) nationalIdInput = it },
                    label = { Text("کد ملی ۱۰ رقمی راننده") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(14.dp))
                Button(
                    onClick = { viewModel.fetchDriverAndFleetByNationalId(nationalIdInput) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                    enabled = !uiState.isLoading && nationalIdInput.length == 10
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("در حال استعلام از سرور مرکزی سپاد...")
                    } else {
                        Text("استعلام مشخصات راننده و ناوگان")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Error Banner with Persian description
        if (uiState.errorMessage != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "خطای استعلام از سامانه سپاد:",
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF991B1B),
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = uiState.errorMessage ?: "",
                        color = Color(0xFFB91C1C),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Right
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Driver Details Card (WS41 Success)
        uiState.driverInfo?.let { driver ->
            DriverDetailsCard(driver)
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Fleet Details Card (WS42 Success)
        uiState.fleetInfo?.let { fleet ->
            FleetDetailsCard(fleet)
        }
    }
}

@Composable
fun DriverDetailsCard(driver: DriverInfoCnt) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "اطلاعات راننده (WS41_GetDriverInfo)",
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B),
                    fontSize = 15.sp
                )
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = if (driver.isActive) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)
                ) {
                    Text(
                        text = if (driver.isActive) "فعال در سپاد" else "غیرفعال",
                        color = if (driver.isActive) Color(0xFF16A34A) else Color(0xFFDC2626),
                        fontSize = 11.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Divider(modifier = Modifier.padding(vertical = 10.dp), color = Color(0xFFF1F5F9))

            InfoRow("نام و نام خانوادگی:", driver.fullName)
            InfoRow("کد ملی:", driver.nationalCode)
            InfoRow("شماره تلفن همراه:", driver.mobileNumber)
            InfoRow("شماره کارت هوشمند راننده:", driver.smartCardNumber ?: "ثبت نشده")
            InfoRow("شماره گواهینامه:", driver.licenseNumber ?: "ثبت نشده")
            InfoRow("اعتبار گواهینامه:", driver.licenseValidityDate ?: "دارای اعتبار")
        }
    }
}

@Composable
fun FleetDetailsCard(fleet: FleetInfoCnt) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "مشخصات ناوگان و خودرو (WS42_GetFleetInfo)",
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E293B),
                fontSize = 15.sp
            )

            Divider(modifier = Modifier.padding(vertical = 10.dp), color = Color(0xFFF1F5F9))

            // Iranian License Plate Representation
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    modifier = Modifier
                        .border(2.dp, Color(0xFF1E293B), RoundedCornerShape(6.dp))
                        .background(Color(0xFFFEF08A), RoundedCornerShape(6.dp))
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ایران ${fleet.plateProvince}  |  ",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color.Black
                    )
                    Text(
                        text = "${fleet.platePart2} ${fleet.plateLetter} ${fleet.platePart1}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            InfoRow("نوع ناوگان:", fleet.vehicleType)
            InfoRow("حداکثر تناژ مجاز:", "${fleet.tonnageKg} کیلوگرم")
            InfoRow("سهمیه سوخت پایه:", "${fleet.fuelQuotaLiters} لیتر")
            InfoRow(
                "معاینه فنی:",
                if (fleet.technicalInspectionValid) "دارای معاینه فنی معتبر" else "فاقد معاینه فنی قانونی"
            )
        }
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, fontSize = 13.sp, color = Color(0xFF64748B))
        Text(text = value, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color(0xFF0F172A))
    }
}
