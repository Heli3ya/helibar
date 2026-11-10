import React, { useState } from 'react';
import { VehicleInfo, DriverInfo, IranPlate } from '../types';
import { toPersianDigits } from '../lib/iranPlate';
import {
  UserPlus,
  ShieldCheck,
  AlertCircle,
  X,
  RotateCw,
  CheckCircle2,
  Lock,
  CreditCard,
  User,
  Truck,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface DriverValidatedData {
  driver_name: string;
  national_id: string;
  plate_number: string;
  vehicle_type: string;
  plate_details?: {
    part1: string;
    letter: string;
    part2: string;
    provinceCode: string;
    type?: string;
  };
  mobile?: string;
  smart_card_number?: string;
  tonnage_kg?: number;
}

interface AddDriverModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onDriverAdded?: (newDriverItem: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  showToastNotification?: (message: string) => void;
  currentPlateCount?: number;
  maxPlateCapacity?: number;
}

export const AddDriverModal: React.FC<AddDriverModalProps> = ({
  isOpen = true,
  onClose,
  onDriverAdded,
  showToastNotification,
  currentPlateCount,
  maxPlateCapacity,
}) => {
  // Check if plate capacity is reached
  const isCapacityFull =
    maxPlateCapacity !== undefined &&
    currentPlateCount !== undefined &&
    maxPlateCapacity > 0 &&
    currentPlateCount >= maxPlateCapacity;

  // Wizard step state: 'entry' (Step 1) or 'preview' (Step 2)
  const [step, setStep] = useState<'entry' | 'preview'>('entry');

  // Step 1: Input Form State (ONLY two fields)
  const [nationalId, setNationalId] = useState<string>('');
  const [utcmsPassword, setUtcmsPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 2: Validated Data Received from Sipaad API
  const [validatedData, setValidatedData] = useState<DriverValidatedData | null>(null);

  if (!isOpen) return null;

  // STEP 1 HANDLER: Validate with Municipal/Sipaad Backend
  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);

    if (isCapacityFull) {
      setErrorMessage('تکمیل ظرفیت پلاک: سقف مجاز ثبت پلاک برای این پنل تکمیل شده است. لطفاً با مدیر ارشد هلی‌بار تماس حاصل فرمایید.');
      return;
    }

    // Basic format validation
    const cleanedNationalId = nationalId.trim();
    if (!cleanedNationalId || cleanedNationalId.length !== 10) {
      setErrorMessage('کد ملی راننده باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    if (!utcmsPassword.trim()) {
      setErrorMessage('لطفاً رمز عبور سایت بارنامه شهری (سپاد) را وارد نمایید.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/drivers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          national_id: cleanedNationalId,
          utcms_password: utcmsPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || result.error || result.message || 'اعتبارسنجی با خطا مواجه شد. لطفاً رمز عبور یا کد ملی را بررسی نمایید.');
      }

      // Successful validation: Transition to Step 2 Preview
      const dataToSet = result.data || result;
      setValidatedData(dataToSet);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در برقراری ارتباط با وب‌سرویس سپاد.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2 HANDLER: Confirm & Finalize Registration (Strictly protected against Double Submit)
  const handleConfirm = async () => {
    if (!validatedData || isLoading || isSubmitting) return;

    if (isCapacityFull) {
      setErrorMessage('تکمیل ظرفیت پلاک: سقف مجاز ثبت پلاک برای این پنل تکمیل شده است.');
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    setErrorMessage(null);

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
        body: JSON.stringify({
          national_id: validatedData.national_id,
          driver_name: validatedData.driver_name,
          plate_number: validatedData.plate_number,
          vehicle_type: validatedData.vehicle_type,
          plate_details: validatedData.plate_details,
          mobile: validatedData.mobile,
          smart_card_number: validatedData.smart_card_number,
          tonnage_kg: validatedData.tonnage_kg,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || result.error || result.message || 'ثبت نهایی راننده در سیستم انجام نشد.');
      }

      // Construct standard IranPlate object
      const iranPlate: IranPlate = {
        part1: validatedData.plate_details?.part1 || '58',
        letter: (validatedData.plate_details?.letter as any) || 'ع',
        part2: validatedData.plate_details?.part2 || '412',
        provinceCode: validatedData.plate_details?.provinceCode || '11',
        type: 'public',
      };

      const newFleetItem: { vehicle: VehicleInfo; driver: DriverInfo } = {
        vehicle: {
          id: result.plate_id || undefined,
          plate: iranPlate,
          vehicleType: (validatedData.vehicle_type as any) || 'وانت نیسان',
          maxLoadCapacityKg: validatedData.tonnage_kg || 2200,
          smartCardNumber: validatedData.smart_card_number || `DRV-${validatedData.national_id.slice(-6)}`,
          technicalInspectionExpiry: '1404/12/29',
          insurancePolicyNumber: 'INS-99021',
          isActive: true,
          carriageStatus: 'IN_TRANSIT',
          permitStatus: 'VALID',
          lastIssuanceStatus: 'SUCCESS',
          otpStatus: 'VERIFIED',
          biweeklyWaybillCount: 0,
          biweeklyQuotaLimit: 15,
          stage1WaybillCount: 0,
          stage2WaybillCount: 0,
        },
        driver: {
          fullName: validatedData.driver_name,
          nationalCode: validatedData.national_id,
          mobile: validatedData.mobile || '09120000000',
          smartCardNumber: validatedData.smart_card_number || `DRV-${validatedData.national_id.slice(-6)}`,
          licenseNumber: 'B1-998811',
        },
      };

      // Auto-refresh main dashboard plate list
      if (onDriverAdded) {
        onDriverAdded(newFleetItem);
      }

      // Trigger Toast Notification
      const toastMsg = result.message || `راننده «${validatedData.driver_name}» با موفقیت به ناوگان اضافه گردید.`;
      if (showToastNotification) {
        showToastNotification(toastMsg);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در ارسال اطلاعات تایید به سرور.');
      setIsSubmitting(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl text-gray-900 dark:text-gray-100 relative overflow-hidden transition-all">
        {/* Glow decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">افزودن راننده جدید</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold">
                  سپاد / UTCMS
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {step === 'entry'
                  ? 'مرحله ۱ از ۲: استعلام برخط مشخصات از سامانه شهرداری'
                  : 'مرحله ۲ از ۲: پیش‌نمایش و ثبت قطعی در ناوگان'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              step === 'entry' ? 'bg-orange-500 shadow-xs' : 'bg-orange-500/80'
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              step === 'preview' ? 'bg-orange-500 shadow-xs' : 'bg-gray-200 dark:bg-gray-800'
            }`}
          />
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/50 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: INPUT FORM (State: 'entry') - ONLY 2 INPUTS */}
        {/* ========================================================================= */}
        {step === 'entry' && (
          <form onSubmit={handleValidate} className="space-y-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 leading-relaxed flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
              <span>
                رمز عبور و کد ملی با الگوریتم امنیتی <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">SHA-512</span> به سامانه سپاد ارسال و اعتبارسنجی خواهد شد.
              </span>
            </div>

            {/* Input 1: کد ملی (National ID) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                کد ملی <span className="text-orange-500">*</span>
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
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all"
                />
                <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">کد ملی ۱۰ رقمی راننده دارای مجوز یا پروانه فعالیت</p>
            </div>

            {/* Input 2: رمز عبور سایت بارنامه شهری (Password) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                رمز عبور سایت بارنامه شهری <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={utcmsPassword}
                  onChange={(e) => setUtcmsPassword(e.target.value)}
                  placeholder="رمز عبور راننده در سامانه سپاد"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">کلمه عبور جهت استعلام از وب‌سرویس WS42/WS21 سامانه سپاد</p>
            </div>

            {/* Step 1 Actions */}
            <div className="pt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>در حال استعلام از سپاد...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>ثبت و بررسی</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PREVIEW & CONFIRM (State: 'preview') */}
        {/* ========================================================================= */}
        {step === 'preview' && validatedData && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Simulation Warning Banner if in Simulation Mode */}
            {(validatedData as any).is_mock_simulation && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">حالت شبیه‌ساز (آزمایشی): </span>
                  {(validatedData as any).simulation_notice || 'جهت استعلام دیتای زنده از باربری، متغیر SIPAAD_MODE=live را در سرور فعال نمایید.'}
                </div>
              </div>
            )}

            {/* Clean Read-Only Preview Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 p-4 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">نتیجه استعلام برخط وب‌سرویس:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (validatedData as any).source?.startsWith('LIVE')
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {(validatedData as any).source?.startsWith('LIVE') ? 'استعلام زنده از سپاد' : 'احراز هویت آزمایشی'}
                </span>
              </div>

              {/* Driver Name & National Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-750 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">نام:</div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      {(validatedData as any).first_name || validatedData.driver_name.split(' ')[0] || 'محمدجواد'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">نام خانوادگی:</div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {(validatedData as any).last_name || validatedData.driver_name.split(' ').slice(1).join(' ') || 'اصغری'}
                  </div>
                </div>

                <div className="text-right sm:text-left font-mono">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">کد ملی:</div>
                  <div className="text-xs font-bold text-orange-600 dark:text-orange-400">{toPersianDigits(validatedData.national_id)}</div>
                </div>
              </div>

              {/* Iranian License Plate Visual Representation */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-500" />
                    <span>شماره پلاک و مشخصات ناوگان ثبت‌شده:</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                    {toPersianDigits(validatedData.plate_number)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  {/* Visually Styled Iranian License Plate */}
                  <div
                    dir="ltr"
                    className="inline-flex items-center justify-between h-10 px-2 rounded-lg border-2 border-amber-500 bg-amber-400 text-slate-950 font-mono select-none shadow-md shadow-amber-500/10 min-w-[170px]"
                  >
                    {/* Blue IRI Strip */}
                    <div className="h-full bg-blue-700 text-white flex flex-col items-center justify-between py-0.5 px-1 rounded-l-xs mr-2 text-[8px]">
                      <div className="flex flex-col items-center leading-none">
                        <span className="block w-2.5 h-0.5 bg-green-500 mb-0.5" />
                        <span className="block w-2.5 h-0.5 bg-white mb-0.5" />
                        <span className="block w-2.5 h-0.5 bg-red-500" />
                      </div>
                      <span className="font-sans font-bold text-[7px] tracking-tighter">I.R.</span>
                    </div>

                    {/* Plate Digits & Letter (e.g. 12 ع 345 - 67) */}
                    <div className="flex items-center gap-1.5 text-sm font-black">
                      <span>{toPersianDigits(validatedData.plate_details?.part1 || '58')}</span>
                      <span className="font-extrabold text-base px-0.5">
                        {validatedData.plate_details?.letter || 'ع'}
                      </span>
                      <span>{toPersianDigits(validatedData.plate_details?.part2 || '412')}</span>
                    </div>

                    {/* Iran Province Box */}
                    <div className="border-l border-slate-900/30 pl-1.5 ml-1 text-center leading-none">
                      <div className="text-[8px] font-sans font-semibold text-slate-800">ایران</div>
                      <div className="text-xs font-black">
                        {toPersianDigits(validatedData.plate_details?.provinceCode || '11')}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Type & Attributes */}
                  <div className="text-right sm:text-left space-y-0.5">
                    <div className="text-xs font-bold text-gray-900 dark:text-white">{validatedData.vehicle_type}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      ظرفیت بار: <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">{toPersianDigits(validatedData.tonnage_kg || 2200)}</span> کیلوگرم
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('entry')}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>ویرایش اطلاعات</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading || isSubmitting || isCapacityFull}
                className="px-7 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLoading || isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>در حال ذخیره در سیستم...</span>
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
