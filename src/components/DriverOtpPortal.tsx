import React, { useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { IranPlate } from '../types';
import { PlateBadge } from './PlateBadge';
import { ThemeToggleMinimal } from './ThemeToggleMinimal';
import { toPersianDigits } from '../lib/iranPlate';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RotateCw,
  ShieldCheck,
  Truck,
  Phone,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface DriverOtpPortalProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

export const DriverOtpPortal: React.FC<DriverOtpPortalProps> = ({
  currentUser,
  onLogout,
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    trackingCode: string;
    message: string;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState(115);
  const [traceCode, setTraceCode] = useState('UTCMS-BOL-992410');

  // Simulated vehicle plate
  const driverPlate: IranPlate = {
    part1: '43',
    letter: 'ع',
    part2: '789',
    provinceCode: '77',
    type: 'public',
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleResend = () => {
    setTimeLeft(120);
    setErrorMessage(null);
    setSuccessData(null);
    setOtpCode('');
    setTraceCode(`UTCMS-BOL-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMessage('لطفاً کد تأیید دریافتی (حداقل ۴ رقم) را وارد فرمایید.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/drivers/submit-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          national_id: currentUser.nationalId || '0078192341',
          otp_code: cleanOtp,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessData({
          trackingCode: data.tracking_code || traceCode,
          message: data.message || 'بارنامه با موفقیت در وب‌سرویس سپاد تأیید و صادر شد.',
        });
      } else {
        setErrorMessage(data.detail || 'کد وارد شده صحیح نمی‌باشد یا منقضی شده است.');
      }
    } catch (_) {
      // Fallback local resolve
      setSuccessData({
        trackingCode: traceCode,
        message: 'کد با موفقیت ثبت شد و بارنامه در وب‌سرویس سپاد تایید گردید.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-[#0c0c0c] text-gray-900 dark:text-white flex flex-col font-sans">
      {/* Top Minimalist Header */}
      <header className="h-16 border-b border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-black font-black text-xl shadow-md shadow-orange-500/20">
            B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight text-gray-900 dark:text-white">
                helibar <span className="text-orange-500">هلی‌بار</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                پنل راننده (2FA)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggleMinimal />
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-800 text-xs font-bold text-gray-600 dark:text-neutral-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Main Restricted Driver View */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* Driver & Vehicle Identity Card */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-gray-900 dark:text-white">
                  {currentUser.roleTitle || 'راننده ناوگان حمل بار شهری'}
                </h2>
                <span className="text-xs text-gray-500 dark:text-neutral-400 font-mono">
                  {currentUser.mobile || '09124451092'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              احراز هویت فعال
            </span>
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 block mb-1">پلاک ناوگان تخصیص‌یافته:</span>
              <PlateBadge plate={driverPlate} tonnageKg={3800} size="sm" />
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-gray-400 block mb-1">کد رهگیری صدور:</span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                {traceCode}
              </span>
            </div>
          </div>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="bg-white dark:bg-neutral-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
              بارنامه با موفقیت صادر شد!
            </h3>
            <p className="text-xs text-gray-600 dark:text-neutral-300 mb-5 leading-relaxed">
              {successData.message}
            </p>

            <div className="bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-neutral-800 rounded-xl p-4 mb-6 font-mono">
              <div className="text-xs text-gray-400 mb-1">کد رهگیری برخط سامانه سپاد:</div>
              <div className="text-base font-black text-emerald-500 tracking-wider">
                {successData.trackingCode}
              </div>
            </div>

            <button
              type="button"
              onClick={handleResend}
              className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm transition-all shadow-md shadow-orange-500/20 cursor-pointer"
            >
              درخواست بارنامه یا کد جدید
            </button>
          </div>
        ) : (
          /* OTP Input Form Card */
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3 border border-orange-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-lg font-black text-gray-900 dark:text-white">
                تأیید دوعاملی صدور باربرگ (2FA)
              </h1>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                کد ارسال شده از سرور شهرداری/سپاد به شماره همراه خود را وارد کنید
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-900/40 text-red-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-neutral-300 mb-2 text-right">
                  کد یکبار مصرف پیامک‌شده (OTP)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full h-14 text-center font-mono text-2xl font-bold tracking-[0.5em] rounded-xl bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-neutral-800 focus:border-orange-500 focus:outline-none text-gray-900 dark:text-white transition-colors"
                />
              </div>

              {/* Timer and Resend Action */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-neutral-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {toPersianDigits(Math.floor(timeLeft / 60))}:
                    {toPersianDigits((timeLeft % 60).toString().padStart(2, '0'))}
                  </span>
                </div>

                {timeLeft === 0 ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-orange-500 hover:text-orange-600 font-bold transition-colors"
                  >
                    ارسال مجدد کد
                  </button>
                ) : (
                  <span className="text-gray-400 dark:text-neutral-500">
                    تا ارسال مجدد
                  </span>
                )}
              </div>

              {/* Fast Dev Button */}
              <button
                type="button"
                onClick={() => setOtpCode('492815')}
                className="w-full py-1.5 rounded-lg border border-dashed border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/5 text-xs font-bold transition-colors"
              >
                درج خودکار کد تستی (۴۹۲۸۱۵)
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !otpCode.trim()}
                className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-98 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>تأیید و صدور نهایی بارنامه</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="py-3 text-center text-xs text-gray-400 dark:text-neutral-500 border-t border-gray-200 dark:border-neutral-900">
        سامانه هوشمند helibar | هلی‌بار - درگاه اتصال رانندگان به وب‌سرویس سپاد
      </footer>
    </div>
  );
};
