package ir.helibar.sipaad.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.helibar.sipaad.model.BOLCnt
import ir.helibar.sipaad.model.GPSCnt
import ir.helibar.sipaad.viewmodel.TripBolViewModel
import ir.helibar.sipaad.viewmodel.TripStage
import java.text.SimpleDateFormat
import java.util.*

/**
 * Jetpack Compose UI for HeliBar Trip / BOL Flow (حمل باربرگ شهری)
 * Flow:
 * 1. صدور باربرگ (WS01_InsertBOL)
 * 2. شروع سفر (WS03_StartBOL)
 * 3. رهگیری موقعیت GPS (WS06_InsertBOLTrack)
 * 4. خاتمه و تحویل (WS04_EndBOL)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripBolScreen(
    viewModel: TripBolViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    // Form states for test issue
    var senderName by remember { mutableStateOf("شرکت پخش بهار") }
    var senderNationalId by remember { mutableStateOf("10103456789") }
    var senderAddress by remember { mutableStateOf("تهران، بزرگراه فتح، خیابان ۱۷") }
    var receiverName by remember { mutableStateOf("فروشگاه مرکزی افق") }
    var receiverNationalId by remember { mutableStateOf("0078192341") }
    var receiverAddress by remember { mutableStateOf("کرج، بلوار شهید بهشتی") }
    var cargoDescription by remember { mutableStateOf("کارتن مواد غذایی و بسته‌بندی") }
    var cargoWeightKg by remember { mutableStateOf("2500") }
    var driverNationalId by remember { mutableStateOf("0078192341") }
    var driverMobile by remember { mutableStateOf("09124451092") }
    var platePart1 by remember { mutableStateOf("43") }
    var plateLetter by remember { mutableStateOf("ع") }
    var platePart2 by remember { mutableStateOf("789") }
    var plateProvince by remember { mutableStateOf("77") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp)
            .verticalScroll(scrollState),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Text(
            text = "هلی‌بار | فرآیند مدیریت باربرگ شهری (SIPAAD)",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF1E293B),
            textAlign = TextAlign.Center
        )
        Text(
            text = "اتصال رسمی به وب‌سرویس‌های ۴ گانه حمل (WS01, WS03, WS06, WS04)",
            fontSize = 13.sp,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
        )

        // Progress Steps Indicator
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StepChip("۱. صدور", uiState.stage >= TripStage.ISSUED)
                StepChip("۲. شروع", uiState.stage >= TripStage.STARTED)
                StepChip("۳. رهگیری", uiState.stage >= TripStage.TRACKING)
                StepChip("۴. اتمام", uiState.stage == TripStage.ENDED)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Success / Error Banner
        if (uiState.errorMessage != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2))
            ) {
                Text(
                    text = "خطا در سامانه سپاد: ${uiState.errorMessage}",
                    color = Color(0xFFB91C1C),
                    fontSize = 14.sp,
                    modifier = Modifier.padding(12.dp),
                    textAlign = TextAlign.Right
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (uiState.successMessage != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFDCFCE7))
            ) {
                Text(
                    text = uiState.successMessage ?: "",
                    color = Color(0xFF15803D),
                    fontSize = 14.sp,
                    modifier = Modifier.padding(12.dp),
                    textAlign = TextAlign.Right
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Active BOL Summary Card
        if (uiState.trackingCode != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "اطلاعات باربرگ فعال در سپاد",
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1D4ED8),
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(text = "کد رهگیری: ${uiState.trackingCode}", fontSize = 14.sp)
                    Text(text = "شماره باربرگ: ${uiState.waybillNumber ?: "در حال تخصیص"}", fontSize = 14.sp)
                    Text(text = "تاریخ صدور: ${uiState.issueDate ?: "-"}", fontSize = 13.sp)
                    if (uiState.startDate != null) {
                        Text(text = "زمان شروع سفر: ${uiState.startDate}", fontSize = 13.sp)
                    }
                    if (uiState.trackedPointsCount > 0) {
                        Text(text = "نقاط رهگیری ثبت شده: ${uiState.trackedPointsCount}", fontSize = 13.sp)
                    }
                    if (uiState.endDate != null) {
                        Text(text = "زمان تحویل و خاتمه: ${uiState.endDate}", fontSize = 13.sp, color = Color(0xFF15803D))
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Flow Actions
        when (uiState.stage) {
            TripStage.IDLE -> {
                // Step 1: Issue Form
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(
                            text = "گام ۱: صدور باربرگ جدید (WS01_InsertBOL)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = senderName,
                            onValueChange = { senderName = it },
                            label = { Text("نام فرستنده") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = receiverName,
                            onValueChange = { receiverName = it },
                            label = { Text("نام گیرنده") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = cargoDescription,
                            onValueChange = { cargoDescription = it },
                            label = { Text("شرح محموله") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = cargoWeightKg,
                            onValueChange = { cargoWeightKg = it },
                            label = { Text("وزن ناخالص (کیلوگرم)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = driverNationalId,
                            onValueChange = { driverNationalId = it },
                            label = { Text("کد ملی راننده") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                val bol = BOLCnt(
                                    senderName = senderName,
                                    senderNationalId = senderNationalId,
                                    senderAddress = senderAddress,
                                    senderCityCode = 1, // تهران
                                    receiverName = receiverName,
                                    receiverNationalId = receiverNationalId,
                                    receiverAddress = receiverAddress,
                                    receiverCityCode = 2, // کرج
                                    cargoDescription = cargoDescription,
                                    cargoWeightKg = cargoWeightKg.toIntOrNull() ?: 2500,
                                    driverNationalCode = driverNationalId,
                                    driverMobile = driverMobile,
                                    platePart1 = platePart1,
                                    plateLetter = plateLetter,
                                    platePart2 = platePart2,
                                    plateProvince = plateProvince,
                                    freightCostRials = 15_000_000L,
                                    commissionRials = 1_500_000L,
                                    insuranceCostRials = 300_000L,
                                    municipalTollRials = 450_000L
                                )
                                viewModel.issueBOL(bol)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !uiState.isLoading
                        ) {
                            if (uiState.isLoading) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                            } else {
                                Text("ثبت و صدور باربرگ در سپاد (WS01)")
                            }
                        }
                    }
                }
            }

            TripStage.ISSUED -> {
                // Step 2: Start Trip
                Button(
                    onClick = { viewModel.startBOL() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                    enabled = !uiState.isLoading
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    } else {
                        Text("آغاز حرکت و شروع سفر (WS03_StartBOL)")
                    }
                }
            }

            TripStage.STARTED, TripStage.TRACKING -> {
                // Step 3 & 4: Track GPS and End
                Column(modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = {
                            val simulatedGps = listOf(
                                GPSCnt(
                                    latitude = 35.6892 + (Math.random() - 0.5) * 0.05,
                                    longitude = 51.3890 + (Math.random() - 0.5) * 0.05,
                                    speedKmh = 62.5f,
                                    timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
                                )
                            )
                            viewModel.trackBOL(simulatedGps)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D9488)),
                        enabled = !uiState.isLoading
                    ) {
                        Text("ارسال موقعیت مکانی GPS (WS06_InsertBOLTrack)")
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Button(
                        onClick = { viewModel.endBOL(unloadWeightKg = 2500) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                        enabled = !uiState.isLoading
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        } else {
                            Text("خاتمه باربرگ و تحویل محموله (WS04_EndBOL)")
                        }
                    }
                }
            }

            TripStage.ENDED -> {
                Button(
                    onClick = { viewModel.resetState() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF475569))
                ) {
                    Text("صدور باربرگ جدید")
                }
            }
        }
    }
}

@Composable
fun StepChip(label: String, isActive: Boolean) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isActive) Color(0xFF2563EB) else Color(0xFFE2E8F0)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = if (isActive) Color.White else Color(0xFF64748B),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}
