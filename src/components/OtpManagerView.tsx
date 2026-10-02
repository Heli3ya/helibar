import React, { useState } from 'react';
import { VehicleInfo, DriverInfo } from '../types';
import { BulkOtpVerification } from './BulkOtpVerification';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import {
  KeyRound,
  ShieldCheck,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  History,
  Sparkles,
} from 'lucide-react';

interface OtpManagerViewProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  onUpdateFleet: React.Dispatch<React.SetStateAction<{ vehicle: VehicleInfo; driver: DriverInfo }[]>>;
  currentOperatorName?: string;
  isSupportRole?: boolean;
}

export const OtpManagerView: React.FC<OtpManagerViewProps> = ({
  fleet,
  onUpdateFleet,
  currentOperatorName,
  isSupportRole,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'BULK' | 'GUIDE_LOGS'>('BULK');

  const pendingCount = fleet.filter(f => f.vehicle.otpStatus === 'PENDING_OTP').length;
  const verifiedCount = fleet.filter(f => f.vehicle.otpStatus === 'VERIFIED').length;

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('BULK')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'BULK'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>میزکار تأیید دسته‌ای OTP</span>
          {pendingCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'BULK' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {toPersianDigits(pendingCount)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('GUIDE_LOGS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'GUIDE_LOGS'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>قوانین سپاد و لاگ‌های امنیتی</span>
        </button>
      </div>

      {/* Tab 1: Bulk OTP Engine */}
      {activeSubTab === 'BULK' && (
        <BulkOtpVerification
          fleet={fleet}
          onUpdateFleet={onUpdateFleet}
          currentOperatorName={currentOperatorName}
          isSupportRole={isSupportRole}
        />
      )}

      {/* Tab 2: Guidelines & Security Logs */}
      {activeSubTab === 'GUIDE_LOGS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>الزامات قانونی احراز هویت دوعاملی وب‌سرویس سپاد (UTCMS)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">۱. اعتبار زمانی محدود (۱۲۰ ثانیه)</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  طبق بخشنامه سازمان راهداری، رمزهای دوعاملی دارای مهلت ۱۲۰ ثانیه‌ای هستند و پس از انقضا باید پیامک جدید صادر شود.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">۲. عدم نیاز به حضور فیزیکی راننده</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  راننده رمز یکبار مصرف را به اپراتور پشتیبان اعلام می‌کند و پشتیبان به صورت دسته‌ای یا تکی آن را در سامانه اعمال می‌نماید.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">۳. ماندگاری نشست کاری</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  پس از یکبار تأیید موفق، پلاک تا انتهای شیفت کاری یا پایان سفر نیازی به دریافت مجدد پیامک اعتبارسنجی نخواهد داشت.
                </p>
              </div>
            </div>
          </div>

          {/* Audit History of Verified Fleet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <History className="w-4 h-4 text-emerald-400" />
                <span>سوابق و کدهای رهگیری فعال در نشست جاری ({toPersianDigits(verifiedCount)})</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {fleet
                .filter(f => f.vehicle.otpStatus === 'VERIFIED')
                .map((item, idx) => (
                  <div
                    key={`${item.vehicle?.id || 'v'}-${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}-${item.driver?.nationalCode || idx}-${idx}`}
                    className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <PlateBadge plate={item.vehicle.plate} size="sm" />
                      <div>
                        <span className="font-bold text-white block">{item.driver.fullName}</span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          همراه: {item.driver.mobile} | کد ملی: {toPersianDigits(item.driver.nationalCode)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                        کد رهگیری: {item.vehicle.lastTraceCode || 'UTCMS-9812401'}
                      </span>
                      <span className="text-slate-500 text-[11px] font-mono">
                        {item.vehicle.lastActiveTime || 'هم‌اکنون'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
