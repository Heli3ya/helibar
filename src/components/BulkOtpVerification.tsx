import React, { useState, useEffect, useRef } from 'react';
import { VehicleInfo, DriverInfo } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import {
  KeyRound,
  ShieldCheck,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  UserCheck,
  Send,
  Sparkles,
  Zap,
  CheckSquare,
  Square,
  Copy,
  Check,
  Filter,
  Users,
} from 'lucide-react';

interface BulkOtpVerificationProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  onUpdateFleet: React.Dispatch<React.SetStateAction<{ vehicle: VehicleInfo; driver: DriverInfo }[]>>;
  currentOperatorName?: string;
  isSupportRole?: boolean;
}

export const BulkOtpVerification: React.FC<BulkOtpVerificationProps> = ({
  fleet,
  onUpdateFleet,
  currentOperatorName = 'پشتیبان عملیاتی',
  isSupportRole = false,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [inputCodes, setInputCodes] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [filterSupportOnly, setFilterSupportOnly] = useState<boolean>(false);

  // Per-driver timers in seconds (defaults to 120s if pending)
  const [countdowns, setCountdowns] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    fleet.forEach(item => {
      const key = `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}`;
      if (item.vehicle.otpStatus === 'PENDING_OTP') {
        initial[key] = item.vehicle.otpRemainingSeconds ?? 115;
      }
    });
    return initial;
  });

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Countdown timer tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const next = { ...prev };
        let hasChanges = false;
        Object.keys(next).forEach(k => {
          if (next[k] > 0) {
            next[k] -= 1;
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter pending drivers
  const pendingDrivers = fleet.filter(item => {
    if (item.vehicle.otpStatus !== 'PENDING_OTP') return false;
    if (filterSupportOnly && isSupportRole) {
      if (item.driver.assignedSupportName && !item.driver.assignedSupportName.includes(currentOperatorName)) {
        return false;
      }
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const plateStr = `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}${item.vehicle.plate.provinceCode}`;
    return (
      item.driver.fullName.toLowerCase().includes(term) ||
      item.driver.nationalCode.includes(term) ||
      item.driver.mobile.includes(term) ||
      plateStr.includes(term) ||
      (item.driver.assignedSupportName && item.driver.assignedSupportName.toLowerCase().includes(term))
    );
  });

  const verifiedDrivers = fleet.filter(item => item.vehicle.otpStatus === 'VERIFIED');

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  const getPlateKey = (item: { vehicle: VehicleInfo }) =>
    `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}`;

  // Toggle selection
  const toggleSelect = (key: string) => {
    setSelectedPlates(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const selectAll = () => {
    if (selectedPlates.length === pendingDrivers.length) {
      setSelectedPlates([]);
    } else {
      setSelectedPlates(pendingDrivers.map(getPlateKey));
    }
  };

  // Verify single driver
  const handleVerifySingle = (item: { vehicle: VehicleInfo; driver: DriverInfo }, codeToUse?: string) => {
    const key = getPlateKey(item);
    const code = codeToUse || inputCodes[key] || item.vehicle.pendingOtpCode || '123456';

    if (code.length < 4) {
      showToast(`لطفاً کد معتبر حداقل ۴ رقمی را وارد نمایید.`, 'error');
      return;
    }

    onUpdateFleet(prev =>
      prev.map(f => {
        if (getPlateKey(f) === key) {
          return {
            ...f,
            vehicle: {
              ...f.vehicle,
              otpStatus: 'VERIFIED',
              pendingOtpCode: undefined,
              lastTraceCode: `UTCMS-OTP-${Math.floor(100000 + Math.random() * 900000)}`,
              lastActiveTime: 'هم‌اکنون',
            },
          };
        }
        return f;
      })
    );

    setSelectedPlates(prev => prev.filter(k => k !== key));
    showToast(`کد دو عاملی راننده «${item.driver.fullName}» با موفقیت در سپاد تأیید شد.`, 'success');

    // Auto-advance to next driver if available
    if (autoAdvance) {
      const remaining = pendingDrivers.filter(p => getPlateKey(p) !== key);
      if (remaining.length > 0) {
        const nextKey = getPlateKey(remaining[0]);
        setTimeout(() => {
          inputRefs.current[nextKey]?.focus();
        }, 100);
      }
    }
  };

  // Batch verify selected drivers
  const handleBatchVerifySelected = () => {
    if (selectedPlates.length === 0) {
      showToast('لطفاً حداقل یک راننده را برای تأیید گروهی انتخاب فرمایید.', 'info');
      return;
    }

    const count = selectedPlates.length;

    onUpdateFleet(prev =>
      prev.map(f => {
        const key = getPlateKey(f);
        if (selectedPlates.includes(key)) {
          return {
            ...f,
            vehicle: {
              ...f.vehicle,
              otpStatus: 'VERIFIED',
              pendingOtpCode: undefined,
              lastTraceCode: `UTCMS-BULK-${Math.floor(100000 + Math.random() * 900000)}`,
              lastActiveTime: 'هم‌اکنون',
            },
          };
        }
        return f;
      })
    );

    setSelectedPlates([]);
    showToast(`تأیید دسته‌ای انجام شد: کد دو عاملی ${toPersianDigits(count)} راننده با موفقیت فعال شد.`, 'success');
  };

  // Bulk resend OTP
  const handleBulkResend = () => {
    const targets = selectedPlates.length > 0 ? selectedPlates : pendingDrivers.map(getPlateKey);
    if (targets.length === 0) return;

    onUpdateFleet(prev =>
      prev.map(f => {
        const key = getPlateKey(f);
        if (targets.includes(key)) {
          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
          return {
            ...f,
            vehicle: {
              ...f.vehicle,
              otpStatus: 'PENDING_OTP',
              pendingOtpCode: newOtp,
              otpExpiresAt: '۲ دقیقه دیگر',
              lastOtpRequestedAt: new Date().toLocaleTimeString('fa-IR'),
            },
          };
        }
        return f;
      })
    );

    setCountdowns(prev => {
      const updated = { ...prev };
      targets.forEach(k => {
        updated[k] = 120;
      });
      return updated;
    });

    showToast(`ارسال مجدد پیامک برای ${toPersianDigits(targets.length)} راننده با موفقیت انجام شد.`, 'info');
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string, key: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Statistics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  مدیریت دسته‌ای کدهای دوعاملی (Bulk OTP Verification)
                </h2>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  اتصال به وب‌سرویس سپاد
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تأیید همزمان و بدون وقفه رمزهای یکبار مصرف پیامک‌شده به رانندگان جهت تسریع صدور بارنامه
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>در انتظار: {toPersianDigits(pendingDrivers.length)} راننده</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>تأیید شده: {toPersianDigits(verifiedDrivers.length)}</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Auto-advance, Multi-tenant filter */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="جستجو بر اساس نام، پلاک، کد ملی یا همراه..."
                className="w-full h-9 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pr-9 pl-3 text-xs text-white outline-none placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end text-xs">
            {/* Multi-tenant toggle */}
            {isSupportRole && (
              <button
                type="button"
                onClick={() => setFilterSupportOnly(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  filterSupportOnly
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-bold'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>فقط رانندگان من ({currentOperatorName})</span>
              </button>
            )}

            {/* Auto advance toggle */}
            <button
              type="button"
              onClick={() => setAutoAdvance(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                autoAdvance
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-semibold'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="پرش خودکار فوکوس به ردیف بعدی پس از تأیید"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>انتقال خودکار: {autoAdvance ? 'فعال' : 'غیرفعال'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-md animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              : 'bg-blue-950/60 border-blue-500/50 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Bulk Action Controls Bar (When items are pending) */}
      {pendingDrivers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-800"
            >
              {selectedPlates.length === pendingDrivers.length ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>انتخاب همه ({toPersianDigits(pendingDrivers.length)})</span>
            </button>

            {selectedPlates.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {toPersianDigits(selectedPlates.length)} مورد انتخاب شده
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBulkResend}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>ارسال مجدد پیامک ({toPersianDigits(selectedPlates.length || pendingDrivers.length)})</span>
            </button>

            <button
              type="button"
              onClick={handleBatchVerifySelected}
              disabled={selectedPlates.length === 0}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                selectedPlates.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأیید دسته‌ای موارد انتخابی</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Drivers List (Card Grid) */}
      {pendingDrivers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">تمامی رانندگان احراز هویت و فعال هستند</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            هیچ راننده‌ای در صف اعتبارسنجی رمز دوعاملی قرار ندارد. شما می‌توانید مستقیماً برای تمام پلاک‌ها بارنامه صادر کنید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {pendingDrivers.map((item, idx) => {
            const key = getPlateKey(item);
            const isSelected = selectedPlates.includes(key);
            const secondsLeft = countdowns[key] ?? 115;
            const isUrgent = secondsLeft < 30;
            const progressPercent = Math.max(0, Math.min(100, (secondsLeft / 120) * 100));

            return (
              <div
                key={`${key}-${item.vehicle.id || idx}`}
                className={`bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-3 transition-all relative ${
                  isSelected
                    ? 'border-amber-500/80 ring-2 ring-amber-500/20'
                    : isUrgent
                    ? 'border-rose-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header: Checkbox + Iran Plate + Timer */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSelect(key)}
                      className="cursor-pointer text-slate-400 hover:text-white"
                      title="انتخاب برای عملیات دسته‌ای"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <PlateBadge plate={item.vehicle.plate} size="sm" />
                  </div>

                  {/* Countdown Badge with Real-time Timer */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                      secondsLeft === 0
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : isUrgent
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {secondsLeft > 0
                        ? `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
                        : 'منقضی شده'}
                    </span>
                  </div>
                </div>

                {/* Progress bar of timer */}
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      isUrgent ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Driver Details & Assigned Support Operator */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">نام و کد ملی راننده:</span>
                    <span className="font-bold text-white block truncate">{item.driver.fullName}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {toPersianDigits(item.driver.nationalCode)}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-slate-400 block text-[11px]">تلفن همراه راننده:</span>
                    <span className="font-mono font-bold text-amber-400 dir-ltr inline-block">
                      {item.driver.mobile}
                    </span>
                    {item.driver.assignedSupportName && (
                      <span className="block text-[10px] text-indigo-300 truncate mt-0.5">
                        پشتیبان: {item.driver.assignedSupportName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Simulated SMS Badge for Testing / Quick Copy */}
                {item.vehicle.pendingOtpCode && (
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">کد پیامک‌شده:</span>
                      <span className="font-mono font-bold text-emerald-400 tracking-wider">
                        {item.vehicle.pendingOtpCode}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(item.vehicle.pendingOtpCode!, key)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                      title="کپی در حافظه"
                    >
                      {copiedKey === key ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">کپی شد</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>کپی کد</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Input Field + Quick Verify Button */}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    ref={el => (inputRefs.current[key] = el)}
                    type="text"
                    maxLength={6}
                    value={inputCodes[key] ?? (item.vehicle.pendingOtpCode || '')}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setInputCodes(prev => ({ ...prev, [key]: val }));
                      // If user types complete 6 digits, auto trigger
                      if (val.length === 6 && autoAdvance) {
                        setTimeout(() => handleVerifySingle(item, val), 150);
                      }
                    }}
                    placeholder="کد ۶ رقمی..."
                    className="flex-1 py-2 px-3 text-center font-mono font-bold text-base tracking-widest bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-white outline-none min-h-[44px]"
                  />

                  <button
                    type="button"
                    onClick={() => handleVerifySingle(item)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm min-h-[44px] flex items-center gap-1 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأیید فوری</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verified Fleet Summary Footer */}
      {verifiedDrivers.length > 0 && (
        <div className="pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>پلاک‌های تأیید شده در این نشست ({toPersianDigits(verifiedDrivers.length)})</span>
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {verifiedDrivers.map((v, idx) => (
              <div
                key={`${getPlateKey(v)}-${idx}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2 shrink-0 flex items-center gap-2 text-xs"
              >
                <PlateBadge plate={v.vehicle.plate} size="sm" />
                <span className="font-semibold text-slate-300 text-[11px] truncate max-w-[100px]">
                  {v.driver.fullName}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
