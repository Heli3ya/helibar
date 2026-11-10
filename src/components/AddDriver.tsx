import React, { useState } from 'react';
import { VehicleInfo, DriverInfo } from '../types';
import { AddDriverModal } from './AddDriverModal';
import { toPersianDigits } from '../lib/iranPlate';
import {
  UserPlus,
  ShieldCheck,
  CreditCard,
  Lock,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Truck,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface AddDriverProps {
  onDriverAdded?: (newDriverItem: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  showToastNotification?: (message: string) => void;
  onNavigateBack?: () => void;
  currentPlateCount?: number;
  maxPlateCapacity?: number;
}

export const AddDriver: React.FC<AddDriverProps> = ({
  onDriverAdded,
  showToastNotification,
  onNavigateBack,
  currentPlateCount,
  maxPlateCapacity,
}) => {
  // Check if plate capacity is reached
  const isCapacityFull =
    maxPlateCapacity !== undefined &&
    currentPlateCount !== undefined &&
    maxPlateCapacity > 0 &&
    currentPlateCount >= maxPlateCapacity;

  // 2-Step Wizard State
  const [step, setStep] = useState<'entry' | 'preview'>('entry');

  // Step 1: Input Form State (Strictly ONLY two fields)
  const [nationalId, setNationalId] = useState<string>('');
  const [utcmsPassword, setUtcmsPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Step 2: Validated Data from /api/drivers/validate
  const [validatedData, setValidatedData] = useState<{
    first_name?: string;
    last_name?: string;
    driver_name: string;
    national_id: string;
    plate_number: string;
    vehicle_type: string;
    plate_details?: {
      part1: string;
      letter: string;
      part2: string;
      provinceCode: string;
    };
    mobile?: string;
    smart_card_number?: string;
    tonnage_kg?: number;
  } | null>(null);

  // Step 1: Submit & Verify
  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (isCapacityFull) {
      setErrorMessage('تکمیل ظرفیت پلاک: سقف مجاز ثبت پلاک برای این پنل تکمیل شده است. لطفاً جهت افزایش ظرفیت با مدیر ارشد هلی‌بار تماس حاصل نمایید.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const cleanNatId = nationalId.trim();
    const cleanPassword = utcmsPassword.trim();

    if (!cleanNatId || cleanNatId.length < 8) {
      setErrorMessage('کد ملی وارد شده نامعتبر است (باید ۱۰ رقم باشد).');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('رمز عبور سایت بارنامه شهری (سپاد) الزامی است.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/drivers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          national_id: cleanNatId,
          utcms_password: cleanPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || 'رمز عبور نامعتبر است یا راننده در سپاد یافت نشد.'
        );
      }

      setValidatedData(data);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در برقراری ارتباط با وب‌سرویس سپاد.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Final Confirm & Add to Fleet (Protected strictly against Double Submit)
  const handleConfirm = async () => {
    if (!validatedData || isLoading || isSubmitting) return;

    if (isCapacityFull) {
      setErrorMessage('تکمیل ظرفیت پلاک: سقف مجاز ثبت پلاک برای این پنل تکمیل شده است.');
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    setErrorMessage('');

    try {
      const token =
        localStorage.getItem('helibar_auth_token') ||
        localStorage.getItem('bargooo_auth_token') ||
        '';

      const response = await fetch('/api/drivers/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.detail || result?.message || 'خطا در ثبت نهایی راننده.');
      }

      // Convert to local vehicle/driver item
      const pDetails = validatedData.plate_details || {
        part1: '58',
        letter: 'ع',
        part2: '412',
        provinceCode: '11',
      };

      const newFleetItem: { vehicle: VehicleInfo; driver: DriverInfo } = {
        vehicle: {
          id: result.plate_id || undefined,
          plate: {
            part1: pDetails.part1 || '58',
            letter: (pDetails.letter as any) || 'ع',
            part2: pDetails.part2 || '412',
            provinceCode: pDetails.provinceCode || '11',
            type: 'public',
          },
          vehicleType: (validatedData.vehicle_type as any) || 'وانت نیسان',
          smartCardNumber: validatedData.smart_card_number || (3910000 + Math.floor(Math.random() * 90000)).toString(),
          technicalInspectionExpiry: '1404/11/30',
          insurancePolicyNumber: `INS-${Math.floor(1000 + Math.random() * 9000)}`,
          maxLoadCapacityKg: validatedData.tonnage_kg || 2200,
          fuelType: 'بنزین',
          permitStatus: 'VALID',
          permitErrorCode: 'NONE',
          permitErrorMessage: 'مجاز در سپاد',
          biweeklyWaybillCount: 0,
          biweeklyQuotaLimit: 15,
          fuelQuotaLiters: 400,
          isActive: true,
          carriageStatus: 'IDLE',
          otpStatus: 'VERIFIED',
          lastIssuanceStatus: 'NONE',
        },
        driver: {
          fullName: validatedData.driver_name,
          nationalCode: validatedData.national_id,
          mobile: validatedData.mobile || '09124451092',
          smartCardNumber: validatedData.smart_card_number || `DRV-${validatedData.national_id.slice(-6)}`,
          licenseNumber: 'B1-998811',
        },
      };

      if (onDriverAdded) {
        onDriverAdded(newFleetItem);
      }

      const toast = result.message || 'راننده با موفقیت ثبت شد';
      setSuccessMessage(toast);
      if (showToastNotification) {
        showToastNotification(toast);
      }

      // Reset form after short delay
      setTimeout(() => {
        setStep('entry');
        setNationalId('');
        setUtcmsPassword('');
        setValidatedData(null);
        setIsSubmitting(false);
        if (onNavigateBack) onNavigateBack();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در ثبت نهایی راننده.');
      setIsSubmitting(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl" className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Module Title Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">افزودن راننده به ناوگان (۲ مرحله‌ای)</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              استعلام برخط راننده و ناوگان از وب‌سرویس سامانه سپاد (UTCMS) با اعتبارسنجی رمز عبور
            </p>
          </div>
        </div>

        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>بازگشت به داشبورد</span>
          </button>
        )}
      </div>

      {/* Wizard Progress Indicator */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
        <div className="flex-1 flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 'entry'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/30'
                : 'bg-emerald-500 text-black'
            }`}
          >
            {step === 'entry' ? '۱' : '✓'}
          </div>
          <span className={`text-xs font-bold ${step === 'entry' ? 'text-orange-400' : 'text-neutral-400'}`}>
            ورود کد ملی و رمز عبور سپاد
          </span>
        </div>

        <div className="w-8 h-px bg-neutral-800" />

        <div className="flex-1 flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 'preview'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/30'
                : 'bg-neutral-800 text-neutral-500'
            }`}
          >
            ۲
          </div>
          <span className={`text-xs font-bold ${step === 'preview' ? 'text-orange-400' : 'text-neutral-500'}`}>
            پیش‌نمایش استعلام و تایید نهایی
          </span>
        </div>
      </div>

      {/* Capacity Exhausted Banner */}
      {isCapacityFull && (
        <div className="p-4 rounded-xl bg-rose-950/60 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-black text-sm text-rose-300">تکمیل ظرفیت پلاک</p>
              <p className="text-[11px] text-rose-300/80 font-normal mt-0.5">
                سقف مجاز پلاک‌های پنل شما ({toPersianDigits(maxPlateCapacity || 0)}) تکمیل شده است. افزودن راننده یا پلاک جدید امکان‌پذیر نمی‌باشد.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono text-[11px] shrink-0 border border-rose-500/30">
            {toPersianDigits(currentPlateCount || 0)} / {toPersianDigits(maxPlateCapacity || 0)}
          </span>
        </div>
      )}

      {/* Error / Success Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Card Container (Minimalist Orange / Black) */}
      <div className="bg-neutral-950 border border-orange-500/30 rounded-2xl p-6 shadow-2xl shadow-orange-950/20 text-neutral-100 relative overflow-hidden">
        {/* Glow Accent Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600" />

        {/* STEP 1: ONLY 2 INPUTS */}
        {step === 'entry' && (
          <form onSubmit={handleValidate} className="space-y-4 pt-1">
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                رمز عبور مستقیماً به وب‌سرویس رمزنگاری‌شده <span className="font-mono text-orange-400 font-bold">WS42/WS21</span> سپاد ارسال شده و پیش‌نمایش اطلاعات راننده استخراج می‌شود.
              </span>
            </div>

            {/* Input 1: National ID (کد ملی) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-200">
                کد ملی راننده <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={10}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0078192341"
                  required
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-sm font-mono text-white placeholder-neutral-600 outline-none transition-all"
                />
                <CreditCard className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Input 2: Password (رمز عبور سایت بارنامه شهری) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-200">
                رمز عبور سایت بارنامه شهری <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={utcmsPassword}
                  onChange={(e) => setUtcmsPassword(e.target.value)}
                  placeholder="رمز عبور راننده در سپاد"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-neutral-900 border border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-sm font-mono text-white placeholder-neutral-600 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-300 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit & Verify Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading || isCapacityFull}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-black" />
                    <span>در حال استعلام برخط از وب‌سرویس سپاد...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>{isCapacityFull ? 'تکمیل ظرفیت پلاک' : 'ثبت و بررسی (مرحله بعد)'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PREVIEW CARD & FINAL CONFIRM */}
        {step === 'preview' && validatedData && (
          <div className="space-y-5 animate-in fade-in">
            {/* Read-Only Preview Card */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <span className="text-xs font-bold text-neutral-400">اطلاعات بازیابی‌شده از وب‌سرویس:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  اطلاعات معتبر در سپاد
                </span>
              </div>

              {/* Driver Name & National Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[11px] text-neutral-500 font-medium">نام راننده:</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {validatedData.first_name || validatedData.driver_name.split(' ')[0] || 'محمدجواد'}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-neutral-500 font-medium">نام خانوادگی:</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {validatedData.last_name || validatedData.driver_name.split(' ').slice(1).join(' ') || 'اصغری'}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-neutral-500 font-medium">کد ملی راننده:</div>
                  <div className="text-sm font-mono font-bold text-orange-400 mt-0.5">
                    {toPersianDigits(validatedData.national_id)}
                  </div>
                </div>
              </div>

              {/* Iranian Plate Styled Visually */}
              <div className="pt-3 border-t border-neutral-800/80">
                <div className="text-[11px] text-neutral-400 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                    <span>شماره پلاک و ناوگان تاییدشده در سپاد:</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {toPersianDigits(validatedData.plate_number)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-xl bg-black/60 border border-neutral-800">
                  {/* License Plate Display */}
                  <div
                    dir="ltr"
                    className="inline-flex items-center justify-between h-11 px-2.5 rounded-lg border-2 border-amber-500 bg-amber-400 text-slate-950 font-mono select-none shadow-md shadow-amber-500/10 min-w-[190px]"
                  >
                    <div className="h-full bg-blue-700 text-white flex flex-col items-center justify-between py-0.5 px-1 rounded-l-xs mr-2 text-[8px]">
                      <div className="flex flex-col items-center leading-none">
                        <span className="block w-2.5 h-0.5 bg-green-500 mb-0.5" />
                        <span className="block w-2.5 h-0.5 bg-white mb-0.5" />
                        <span className="block w-2.5 h-0.5 bg-red-500" />
                      </div>
                      <span className="font-sans font-bold text-[7px]">I.R.</span>
                    </div>

                    <div className="flex items-center gap-2 text-base font-black">
                      <span>{toPersianDigits(validatedData.plate_details?.part1 || '58')}</span>
                      <span className="font-extrabold text-lg px-0.5">{validatedData.plate_details?.letter || 'ع'}</span>
                      <span>{toPersianDigits(validatedData.plate_details?.part2 || '412')}</span>
                    </div>

                    <div className="border-l border-slate-900/30 pl-2 ml-1 text-center leading-none">
                      <div className="text-[8px] font-sans font-semibold text-slate-800">ایران</div>
                      <div className="text-sm font-black">
                        {toPersianDigits(validatedData.plate_details?.provinceCode || '11')}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:text-left space-y-1">
                    <div className="text-xs font-bold text-white">{validatedData.vehicle_type}</div>
                    <div className="text-[11px] text-neutral-400">
                      ظرفیت بارگیری: <span className="font-mono text-orange-400 font-bold">{toPersianDigits(validatedData.tonnage_kg || 2200)}</span> کیلوگرم
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('entry')}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>ویرایش اطلاعات</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading || isSubmitting || isCapacityFull}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-black" />
                    <span>در حال ذخیره و اتصال راننده به پنل صادرکننده...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>{isCapacityFull ? 'تکمیل ظرفیت پلاک' : 'تایید و ثبت نهایی'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { AddDriverModal };
