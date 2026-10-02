import React from 'react';
import { VehicleInfo, DriverInfo } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface ErrorDetailsModalProps {
  vehicle: VehicleInfo;
  driver: DriverInfo;
  onClose: () => void;
  onRetryInquiry?: (vehicle: VehicleInfo) => void;
}

export const ErrorDetailsModal: React.FC<ErrorDetailsModalProps> = ({
  vehicle,
  driver,
  onClose,
  onRetryInquiry,
}) => {
  const [copied, setCopied] = React.useState<boolean>(false);

  const traceCode = vehicle.lastTraceCode || `ERR-UTCMS-${vehicle.permitErrorCode || '4022'}`;
  const errorCode = vehicle.lastErrorCode || vehicle.permitErrorCode || 'UTCMS-4022';
  const errorMessage =
    vehicle.lastErrorMessage ||
    vehicle.permitErrorMessage ||
    'عدم تطابق مشخصات ناوگان یا پروانه در پایگاه داده مرکزی سپاد شهرداری';
  const suggestedAction =
    vehicle.suggestedAction ||
    'بررسی تاریخ اعتبار معاینه فنی در سیمفا و تمدید پروانه فعالیت ناوگان در سازمان مدیریت حمل بار شهرداری';

  const handleCopyTrace = () => {
    navigator.clipboard.writeText(traceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">رهگیری خطای سامانه مرکزی (UTCMS)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">شناسایی علت رد صدور یا مسدودی پلاک در وب‌سرویس سپاد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Plate & Driver Card */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <PlateBadge plate={vehicle.plate} tonnageKg={vehicle.maxLoadCapacityKg} size="md" />
            <div className="text-right text-xs space-y-0.5">
              <div className="text-gray-900 dark:text-gray-100 font-bold">{driver.fullName}</div>
              <div className="text-gray-500 dark:text-gray-400">کد ملی: <span className="font-mono text-gray-800 dark:text-gray-200">{toPersianDigits(driver.nationalCode)}</span></div>
              <div className="text-gray-500 dark:text-gray-400">کارت هوشمند: <span className="font-mono text-gray-800 dark:text-gray-200">{vehicle.smartCardNumber}</span></div>
            </div>
          </div>

          {/* Error Banner */}
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>کد خطای سامانه:</span>
                <span className="font-mono px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/40 rounded text-rose-700 dark:text-rose-300">
                  {errorCode}
                </span>
              </div>
              <span className="text-[11px] text-rose-600/80 dark:text-rose-300/80">سطح خطا: بحرانی (مانع صدور)</span>
            </div>
            <p className="text-xs leading-relaxed text-rose-900 dark:text-rose-100 font-medium">{errorMessage}</p>
          </div>

          {/* TraceCode Bar */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-gray-500 dark:text-gray-400 text-[11px]">کد رهگیری فنی خطا در سپاد (TraceCode):</span>
              <div className="font-mono font-bold text-orange-500 text-sm tracking-wider">{traceCode}</div>
            </div>
            <button
              onClick={handleCopyTrace}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 text-xs transition-colors cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
            </button>
          </div>

          {/* Suggested Action Guide */}
          <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/30 space-y-2">
            <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-orange-500" />
              <span>دستورالعمل رفع مشکل توسط صادرکننده:</span>
            </h4>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{suggestedAction}</p>
            <div className="pt-2 text-[11px] text-orange-600/80 dark:text-orange-400/80 border-t border-orange-200 dark:border-orange-500/20 flex items-center gap-1">
              <span>نکته: پس از رفع مشکل در سامانه سیمفا یا شهرداری، استعلام مجدد برخط را انجام دهید.</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-black/40 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-orange-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
          >
            بستن
          </button>
          {onRetryInquiry && (
            <button
              onClick={() => {
                onRetryInquiry(vehicle);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>استعلام مجدد از وب‌سرویس سپاد</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
