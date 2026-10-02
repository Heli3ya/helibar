package ir.helibar.sipaad.model

/**
 * HeliBar (هلی‌بار) - Sealed Class State & Official Persian Error Code Mapper
 * Strictly maps every ErrorCode mentioned in "UTCM-WS-BOL-GUIDE (03.24)"
 */
sealed class SipaadResult<out T> {
    object Idle : SipaadResult<Nothing>()
    object Loading : SipaadResult<Nothing>()

    data class Success<out T>(val data: T) : SipaadResult<T>()

    data class Error(
        val errorCode: Int,
        val originalDesc: String?,
        val persianMessage: String
    ) : SipaadResult<Nothing>()

    data class NetworkFailure(
        val throwable: Throwable,
        val persianMessage: String = "خطای برقراری ارتباط با شبکه اینترنت یا سرور مرکزی سپاد"
    ) : SipaadResult<Nothing>()
}

/**
 * Utility to map official SIPAAD Error Codes (e.g. 445001, 445031) to friendly Persian UI messages
 */
object SipaadErrorMapper {

    fun getPersianMessage(errorCode: Int, fallbackDesc: String? = null): String {
        return when (errorCode) {
            0, 200 -> "عملیات با موفقیت در سامانه مرکزی سپاد ثبت گردید."
            445001 -> "نام کاربری، رمز عبور یا امضای امنیتی (هش SHA-512) نامعتبر است."
            445002 -> "حساب کاربری شرکت ترابری در سامانه سپاد مسدود یا فاقد مجوز معتبر است."
            445003 -> "مهر زمانی درخواست (Timestamp) منقضی شده یا تفاوت ساعت سیستمی وجود دارد."
            445010 -> "باربرگ با شناسه یا کد رهگیری ارسالی در سرور یافت نشد."
            445011 -> "وضعیت باربرگ برای این عملیات نامعتبر است (پیشتر آغاز یا مختومه شده است)."
            445012 -> "تداخل زمانی و مکانی در ثبت سفر؛ برای این ناوگان تردد همزمان وجود دارد."
            445013 -> "سقف مجاز صدور باربرگ ۱۵ روزه برای این ناوگان یا راننده تکمیل شده است."
            445014 -> "کد ملی راننده با ناوگان انتخاب شده در سامانه مطابقت ندارد."
            445020 -> "کارت هوشمند ناوگان غیرفعال یا فاقد اعتبار است."
            445021 -> "ناوگان فاقد معاینه فنی معتبر یا بیمه‌نامه شخص ثالث قانونی می‌باشد."
            445022 -> "کارت هوشمند راننده غیرفعال یا منقضی گردیده است."
            445030 -> "خطای ساختار داده ارسالی؛ فیلدهای اجباری باربرگ به درستی ارسال نشده‌اند."
            445031 -> "خطای اعتبارسنجی مقادیر ورودی (مختصات جغرافیایی GPS، تناژ بار یا مقادیر فیلدها)."
            445041 -> "راننده در سامانه مرکزی سپاد ثبت‌نام نشده یا رمز عبور سپاد ثبت نگردیده است."
            445042 -> "ناوگان در سامانه سپاد ثبت‌نام نشده یا فاقد پلاک فعال است."
            445050 -> "ناوگان در حال حاضر تحت قرارداد شرکت ترابری دیگری قرار دارد."
            445090 -> "کد اعتبارسنجی پیامکی (OTP) منقضی شده یا اشتباه وارد شده است."
            445099 -> "خطای داخلی سرور مرکزی سپاد؛ لطفاً دقایقی دیگر مجدداً تلاش فرمایید."
            else -> fallbackDesc?.takeIf { it.isNotBlank() }
                ?: "خطای ناشناخته در سامانه سپاد (کد خطا: $errorCode)"
        }
    }

    fun fromExceptionCnt(exceptionCnt: ExceptionCnt?): SipaadResult.Error {
        val code = exceptionCnt?.errorCode ?: -1
        val desc = exceptionCnt?.errorDesc
        return SipaadResult.Error(
            errorCode = code,
            originalDesc = desc,
            persianMessage = getPersianMessage(code, desc)
        )
    }
}
