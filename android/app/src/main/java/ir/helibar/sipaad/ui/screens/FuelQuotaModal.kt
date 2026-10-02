package ir.helibar.sipaad.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.helibar.sipaad.model.FuelQuotaResult
import ir.helibar.sipaad.model.FuelQuotaState
import ir.helibar.sipaad.util.PlateSplitter
import ir.helibar.sipaad.viewmodel.FuelQuotaViewModel

/**
 * Jetpack Compose UI component for Fuel Quota Inquiry dialog/modal
 * Triggered from Operational Dashboard on plate click.
 */
@Composable
fun FuelQuotaModal(
    plateNumber: String,
    nationalCode: String,
    viewModel: FuelQuotaViewModel,
    onDismiss: () -> Unit
) {
    val state by viewModel.quotaState.collectAsState()
    var captchaInput by remember { mutableStateOf("49766") }
    var yearInput by remember { mutableStateOf("1405") }
    var monthInput by remember { mutableStateOf("7") }

    val tags = remember(plateNumber) {
        PlateSplitter.splitPlate(plateNumber)
    }

    LaunchedEffect(plateNumber, nationalCode) {
        viewModel.getFuelQuotaForPlate(
            plateNumber = plateNumber,
            nationalCode = nationalCode,
            year = yearInput,
            month = monthInput,
            captcha = captchaInput
        )
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .padding(20.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                text = "استعلام سهمیه سوخت ناوگان (ShowFuelQuota.aspx)",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = Color(0xFF1E293B)
            )

            Text(
                text = "اتصال برخط به درگاه سوخت و ناوگان UTCMS",
                fontSize = 12.sp,
                color = Color(0xFF64748B),
                modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
            )

            // Plate Badge & Split Tags Inspector
            Box(
                modifier = Modifier
                    .border(1.5.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                    .background(Color(0xFFFEF9C3), RoundedCornerShape(8.dp))
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "ایران ${tags.tag2}  |  ${tags.tag4} ${tags.tag3} ${tags.tag1}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color.Black
                )
            }

            Text(
                text = "تقسیم‌بندی تگ‌ها: Tag1=${tags.tag1} | Tag2=${tags.tag2} | Tag3=${tags.tag3} | Tag4=${tags.tag4}",
                fontSize = 11.sp,
                color = Color(0xFF64748B),
                modifier = Modifier.padding(top = 6.dp, bottom = 14.dp)
            )

            // Status State Renderer
            when (val s = state) {
                is FuelQuotaState.Idle -> {
                    Text("آماده جهت استعلام سهمیه سوخت", fontSize = 13.sp, color = Color(0xFF64748B))
                }

                is FuelQuotaState.FetchingSession, is FuelQuotaState.SubmittingInquiry -> {
                    val msg = if (s is FuelQuotaState.FetchingSession) s.message else (s as FuelQuotaState.SubmittingInquiry).message
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(vertical = 20.dp)
                    ) {
                        CircularProgressIndicator(color = Color(0xFF2563EB), modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = msg,
                            fontSize = 13.sp,
                            color = Color(0xFF1E40AF),
                            textAlign = TextAlign.Center
                        )
                    }
                }

                is FuelQuotaState.Success -> {
                    FuelQuotaResultCard(s.data)
                }

                is FuelQuotaState.Error -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "خطا در استعلام سهمیه سوخت:",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF991B1B),
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = s.message,
                                fontSize = 12.sp,
                                color = Color(0xFFB91C1C)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        viewModel.getFuelQuotaForPlate(
                            plateNumber = plateNumber,
                            nationalCode = nationalCode,
                            year = yearInput,
                            month = monthInput,
                            captcha = captchaInput
                        )
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                ) {
                    Text("استعلام مجدد")
                }

                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("بستن")
                }
            }
        }
    }
}

@Composable
fun FuelQuotaResultCard(result: FuelQuotaResult) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4)),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF86EFAC)))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = "کارنامه سهمیه سوخت دوره ${result.year}/${result.month}",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = Color(0xFF166534)
            )
            Divider(modifier = Modifier.padding(vertical = 8.dp), color = Color(0xFFDCFCE7))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("سهمیه پایه ماهانه:", fontSize = 13.sp, color = Color(0xFF374151))
                Text("${result.baseQuotaLiters} لیتر", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("سهمیه عملکردی (پیمایش):", fontSize = 13.sp, color = Color(0xFF374151))
                Text("${result.performanceQuotaLiters} لیتر", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("مجموع سهمیه تخصیصی:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF15803D))
                Text("${result.totalQuotaLiters} لیتر", fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color(0xFF15803D))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = result.statusDescription,
                fontSize = 11.sp,
                color = Color(0xFF16A34A),
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
