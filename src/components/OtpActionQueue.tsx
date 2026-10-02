import React, { useState } from 'react';
import { IranPlate } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import { KeyRound, Check, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface OtpActionQueueItem {
  id: string;
  plate: IranPlate;
  driverName: string;
  driverNationalCode?: string;
  driverMobile?: string;
  status: 'PENDING_OTP' | 'VERIFIED';
  expiresInSeconds?: number;
  tonnageKg?: number;
  biweeklyWaybillCount?: number;
  biweeklyQuotaLimit?: number;
}

interface OtpActionQueueProps {
  items: OtpActionQueueItem[];
  onInjectOtp: (item: OtpActionQueueItem, otpCode: string) => void;
  className?: string;
}

export const OtpActionQueue: React.FC<OtpActionQueueProps> = ({
  items,
  onInjectOtp,
  className = '',
}) => {
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [submittedIds, setSubmittedIds] = useState<Record<string, boolean>>({});

  const handleInputChange = (id: string, value: string) => {
    // Only allow numbers, max 6 digits
    const clean = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtpInputs(prev => ({ ...prev, [id]: clean }));
  };

  const handleQuickSubmit = (item: OtpActionQueueItem) => {
    const code = otpInputs[item.id] || '';
    if (!code || code.length < 4) return;

    setSubmittedIds(prev => ({ ...prev, [item.id]: true }));
    onInjectOtp(item, code);

    setTimeout(() => {
      setSubmittedIds(prev => ({ ...prev, [item.id]: false }));
      setOtpInputs(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }, 1200);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className={`rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-amber-950/10 to-slate-900 p-4 sm:p-5 shadow-lg shadow-amber-500/5 space-y-4 ${className}`}
    >
      {/* Queue Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">صف پلاک‌های کُدی (در انتظار کد دوعاملی OTP)</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold border border-amber-500/30">
                {toPersianDigits(items.length)} پلاک
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              برای پلاک‌های زیر پیامک اعتبارسنجی بارنامه ارسال شده است. کد دریافتی را مستقیماً تزریق کنید.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop & Tablet Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3 w-48 font-semibold">پلاک خودرو</th>
              <th className="p-3 font-semibold">نام راننده</th>
              <th className="p-3 font-semibold text-center">وضعیت</th>
              <th className="p-3 font-semibold text-left pl-4">تزریق سریع کد OTP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map(item => {
              const currentOtp = otpInputs[item.id] || '';
              const isSubmitted = submittedIds[item.id];
              return (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  {/* Plate visual badge with tonnage and 15-day count */}
                  <td className="p-3">
                    <PlateBadge
                      plate={item.plate}
                      tonnageKg={item.tonnageKg}
                      biweeklyWaybillCount={item.biweeklyWaybillCount}
                      biweeklyQuotaLimit={item.biweeklyQuotaLimit}
                      size="sm"
                    />
                  </td>

                  {/* Driver Name */}
                  <td className="p-3">
                    <div className="font-bold text-white">{item.driverName}</div>
                    {item.driverMobile && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        موبایل: {toPersianDigits(item.driverMobile)}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      <span>در انتظار کد</span>
                    </span>
                  </td>

                  {/* Input + ثبت button */}
                  <td className="p-3 text-left pl-4">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={currentOtp}
                        onChange={e => handleInputChange(item.id, e.target.value)}
                        placeholder="کد ۶ رقمی..."
                        className="w-28 h-9 px-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-white text-xs font-mono text-center tracking-widest outline-none transition-colors"
                      />
                      <button
                        type="button"
                        disabled={!currentOtp || currentOtp.length < 4 || isSubmitted}
                        onClick={() => handleQuickSubmit(item)}
                        className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                          isSubmitted
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isSubmitted ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>ثبت شد</span>
                          </>
                        ) : (
                          <span>ثبت</span>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Cards */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {items.map(item => {
          const currentOtp = otpInputs[item.id] || '';
          const isSubmitted = submittedIds[item.id];
          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <PlateBadge
                  plate={item.plate}
                  tonnageKg={item.tonnageKg}
                  biweeklyWaybillCount={item.biweeklyWaybillCount}
                  biweeklyQuotaLimit={item.biweeklyQuotaLimit}
                  size="sm"
                />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                  <span>در انتظار کد</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">راننده:</span>
                <span className="font-bold text-white">{item.driverName}</span>
              </div>

              {/* Input + ثبت button for mobile */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <input
                  type="text"
                  maxLength={6}
                  value={currentOtp}
                  onChange={e => handleInputChange(item.id, e.target.value)}
                  placeholder="کد ۶ رقمی..."
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-white text-xs font-mono text-center tracking-widest outline-none"
                />
                <button
                  type="button"
                  disabled={!currentOtp || currentOtp.length < 4 || isSubmitted}
                  onClick={() => handleQuickSubmit(item)}
                  className={`h-10 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                    isSubmitted
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {isSubmitted ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>ثبت شد</span>
                    </>
                  ) : (
                    <span>ثبت</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
