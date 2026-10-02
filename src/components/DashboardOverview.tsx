import React from 'react';
import { WaybillItem, VehicleInfo, DriverInfo, SipaadCredentials } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits, formatRials, formatTomans } from '../lib/iranPlate';
import { NavTab } from './Navbar';
import {
  Truck,
  FileCheck,
  TrendingUp,
  Coins,
  ShieldCheck,
  Play,
  FilePlus2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Zap,
  Power,
  Fuel,
  RefreshCw,
} from 'lucide-react';

interface DashboardOverviewProps {
  waybills: WaybillItem[];
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  config: SipaadCredentials;
  autoRegisterEnabled: boolean;
  onToggleAutoRegister: () => void;
  onNavigate: (tab: NavTab) => void;
  onSelectPrint: (wb: WaybillItem) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  waybills,
  fleet,
  config,
  autoRegisterEnabled,
  onToggleAutoRegister,
  onNavigate,
  onSelectPrint,
}) => {
  const totalTonnageKg = waybills.reduce((acc, cur) => acc + (cur.weightKg || 0), 0);
  const totalMunicipalTollRials = waybills.reduce(
    (acc, cur) => acc + (cur.municipalTollRials || 0),
    0
  );
  const totalRevenueRials = waybills.reduce((acc, cur) => acc + (cur.freightCostRials || 0), 0);
  const issuedCount = waybills.filter(w => w.status === 'ISSUED').length;
  const successRate = waybills.length > 0 ? Math.round((issuedCount / waybills.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>پایانه اختصاصی صادرکننده رسمی بارنامه درون‌شهری</span>
            </div>
            <h2 className="text-xl font-black text-white">
              سامانه اتوماسیون باربرگ و صدور بارنامه سپاد (UTCMS)
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              اتصال مستقیم به وب‌سرویس‌های رسمی ITMBOL و ITMFreighter شهرداری با تضمین ایزولاسیون کامل خطا در پردازش دسته‌ای، محاسبات رمزنگاری محلی SHA-512 و کنترل هوشمند تکرار (Idempotency).
            </p>
          </div>

          {/* Quick Buttons including Auto-Register quick toggle */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Auto-Register Quick Button */}
            <button
              onClick={onToggleAutoRegister}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer border ${
                autoRegisterEnabled
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Power className={`w-4 h-4 ${autoRegisterEnabled ? 'text-slate-950 animate-pulse' : 'text-slate-400'}`} />
              <span>ثبت خودکار: {autoRegisterEnabled ? 'روشن (فعال)' : 'خاموش'}</span>
            </button>

            <button
              onClick={() => onNavigate('ISSUE_SINGLE')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>صدور بارنامه جدید</span>
            </button>
            <button
              onClick={() => onNavigate('FUEL_INQUIRY')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <Fuel className="w-4 h-4" />
              <span>استعلام سهمیه سوخت</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Auto-Register (ثبت خودکار) Control Panel Banner */}
      <div
        className={`rounded-2xl p-5 border transition-all duration-300 ${
          autoRegisterEnabled
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                autoRegisterEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Zap className={`w-6 h-6 ${autoRegisterEnabled ? 'animate-bounce' : ''}`} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base text-white">
                  سیستم ثبت خودکار باربرگ (Auto-Register)
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    autoRegisterEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      autoRegisterEnabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <span>{autoRegisterEnabled ? 'حالت فعال - ثبت هوشمند دوره‌ای روشن است' : 'حالت غیرفعال - ثبت خودکار خاموش است'}</span>
                </span>
              </div>

              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                در صورت فعال بودن «ثبت خودکار»، الگوریتم اتوماسیون باربرگ برای خودروهای مجاز ناوگان که سهمیه ۱۵ روزه آنها تکمیل نشده است، به صورت خودکار و زمان‌بندی‌شده باربرگ با حمل صادر می‌کند تا از کسر سهمیه سوخت گازوئیل در پایان دوره جلوگیری شود.
              </p>
            </div>
          </div>

          {/* Toggle Switch Button */}
          <div className="flex items-center gap-4 shrink-0 self-end lg:self-auto">
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold block text-slate-200">
                وضعیت کلید ثبت خودکار
              </span>
              <span className="text-[11px] text-slate-400 block">
                {autoRegisterEnabled ? 'در حال پایش و ثبت خودکار ناوگان' : 'آماده به کار (خاموش)'}
              </span>
            </div>

            <button
              onClick={onToggleAutoRegister}
              className={`relative inline-flex h-11 w-24 items-center rounded-full p-1 transition-colors duration-300 cursor-pointer focus:outline-none ${
                autoRegisterEnabled ? 'bg-emerald-500' : 'bg-slate-800 border border-slate-700'
              }`}
              title="تغییر وضعیت ثبت خودکار"
            >
              <span
                className={`flex items-center justify-center h-9 w-9 rounded-full bg-slate-950 text-white shadow-md transform transition-transform duration-300 ${
                  autoRegisterEnabled ? 'translate-x-0 text-emerald-400' : 'translate-x-13 text-slate-400'
                }`}
              >
                <Power className="w-5 h-5" />
              </span>
              <span
                className={`text-xs font-black select-none ${
                  autoRegisterEnabled ? 'mr-auto pl-3 text-slate-950 font-bold' : 'ml-auto pr-3 text-slate-400'
                }`}
              >
                {autoRegisterEnabled ? 'روشن' : 'خاموش'}
              </span>
            </button>
          </div>
        </div>

        {/* Status sub-bar when enabled */}
        {autoRegisterEnabled && (
          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300/90">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>
                دور بعدی پایش و ثبت خودکار پلاک‌های آماده: <strong>۳ دقیقه دیگر</strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              کنترل خودکار سقف ۱۵ روزه • فیلتر پلاک‌های دارای نقص پروانه • تایید برخط در سپاد
            </div>
          </div>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">بارنامه‌های تایید شده</span>
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {toPersianDigits(issuedCount)}
            </div>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>نرخ موفقیت در سپاد: {toPersianDigits(successRate)}٪</span>
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">تناژ کل حمل شده</span>
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {toPersianDigits((totalTonnageKg / 1000).toFixed(1))} <span className="text-sm font-sans font-normal text-slate-400">تن</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              معادل {toPersianDigits(totalTonnageKg.toLocaleString())} کیلوگرم بار درون‌شهری
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">ناوگان و رانندگان فعال</span>
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {toPersianDigits(fleet.length)} <span className="text-sm font-sans font-normal text-slate-400">دستگاه</span>
            </div>
            <span className="text-[11px] text-indigo-400 flex items-center gap-1 mt-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>همه دارای کارت هوشمند معتبر</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Waybills + Gateway Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Issued Waybills */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100">آخرین بارنامه‌های صادر شده در سپاد</h3>
            </div>
            <button
              onClick={() => onNavigate('ARCHIVE')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>مشاهده همه</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {waybills.slice(0, 4).map(wb => (
              <div
                key={wb.id}
                className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <PlateBadge
                    plate={wb.vehicle.plate}
                    tonnageKg={wb.vehicle.maxLoadCapacityKg}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {wb.cargoDescription}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({toPersianDigits(wb.weightKg)} ک‌گ)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>راننده: {wb.driver.fullName}</span>
                      <span>•</span>
                      <span className="font-mono text-amber-400">
                        کد رهگیری: {toPersianDigits(wb.trackingCode || 'در انتظار')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-left font-mono">
                    <span className="text-xs font-bold text-slate-200 block">
                      {formatRials(wb.totalCostRials)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {toPersianDigits(wb.issueDateTime)}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectPrint(wb)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    چاپ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sipaad Gateway Architecture Highlights */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>معماری و مشخصات وب‌سرویس سپاد</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
                <span className="font-bold text-slate-200 block text-xs">
                  الگوریتم امنیتی ۳ مرحله‌ای (SHA-512):
                </span>
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  1. Random Salt (int)<br />
                  2. SHA512(Password)<br />
                  3. SHA512(CompanyCode + SHA512(Pass) + Salt)
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
                <span className="font-bold text-amber-400 block text-xs">
                  قانون بحرانی JSON (Explicit Null):
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  فیلدهای اختیاری خالی حتماً با مقدار صریح <code className="text-white">null</code> سریالایز می‌شوند تا از خطای پروتکل HTTP در سرور سپاد جلوگیری شود.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
                <span className="font-bold text-blue-400 block text-xs">
                  تضمین عدم تکرار (Idempotency Key):
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  تولید کلید یکتا بر مبنای شناسه صادرکننده، پلاک خودرو و تاریخ مانع از صدور تکراری ناخواسته بارنامه می‌شود.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('LAB')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>ورود به آزمایشگاه رمزنگاری و تست سپاد</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
