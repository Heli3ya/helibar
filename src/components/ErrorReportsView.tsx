import React, { useState } from 'react';
import { VehicleInfo, DriverInfo, WaybillItem } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import { ErrorDetailsModal } from './ErrorDetailsModal';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  FileText,
  Clock,
  ShieldAlert,
  ArrowUpDown,
  Download,
  Info,
  ExternalLink,
} from 'lucide-react';

interface ErrorReportsViewProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  waybills: WaybillItem[];
}

type LogFilter = 'ALL' | 'SUCCESS' | 'ERROR' | 'ACTION_REQUIRED';

// Helper to format real-time Persian datetime with exact seconds
function formatLogRealtime(timestamp?: string): string {
  if (!timestamp) {
    const now = new Date();
    const datePart = now.toLocaleDateString('fa-IR');
    const timePart = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return toPersianDigits(`${datePart} - ${timePart}`);
  }

  // If it's already a formatted Jalali date with time
  if (timestamp.includes('/') && timestamp.includes(':')) {
    return toPersianDigits(timestamp.replace(/\s+/g, ' '));
  }

  // If it's an ISO string or timestamp
  try {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      const datePart = d.toLocaleDateString('fa-IR');
      const timePart = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return toPersianDigits(`${datePart} - ${timePart}`);
    }
  } catch {}

  return toPersianDigits(timestamp);
}

export const ErrorReportsView: React.FC<ErrorReportsViewProps> = ({ fleet, waybills }) => {
  const [filter, setFilter] = useState<LogFilter>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedErrorItem, setSelectedErrorItem] = useState<{ vehicle: VehicleInfo; driver: DriverInfo } | null>(null);

  // Synthesize unified log records from fleet errors and waybills with exact real-time timestamps
  const logRecords = React.useMemo(() => {
    const list = [];

    // From Fleet vehicles with errors
    fleet.forEach(item => {
      const v = item.vehicle;
      if (v.permitStatus === 'ERROR' || v.lastIssuanceStatus === 'ERROR') {
        const rawTime = v.lastActiveTime || v.lastOtpRequestedAt;
        list.push({
          id: `FLT-${v.smartCardNumber || v.id || Math.random()}`,
          time: formatLogRealtime(rawTime),
          vehicle: v,
          driver: item.driver,
          status: 'ERROR' as const,
          traceCode: v.lastTraceCode || `ERR-UTCMS-${v.lastErrorCode || '4022'}`,
          errorCode: v.lastErrorCode || v.permitErrorCode || 'UTCMS-4022',
          description: v.lastErrorMessage || v.permitErrorMessage || 'عدم تطابق اطلاعات معاینه فنی با سپاد',
          actionGuide: v.suggestedAction || 'مراجعه به سیمفا یا درگاه شهرداری جهت تمدید اعتبار',
          type: 'ناوگان / پروانه',
        });
      }
    });

    // From Waybills (Both ISSUED and other statuses)
    waybills.forEach(wb => {
      const isSuccess = wb.status === 'ISSUED';
      const rawTime = wb.issueDateTime || wb.sipaadResponse?.serverTimestamp || (wb as any).created_at;
      list.push({
        id: `WB-${wb.id}`,
        time: formatLogRealtime(rawTime),
        vehicle: wb.vehicle,
        driver: wb.driver,
        status: isSuccess ? ('SUCCESS' as const) : ('ERROR' as const),
        traceCode: wb.trackingCode || `UTCMS-${wb.id.slice(0, 8)}`,
        errorCode: isSuccess ? 'NONE' : (wb.errorCode || 'UTCMS-5012'),
        description: isSuccess
          ? `باربرگ با موفقیت صادر و ثبت گردید (${wb.cargoDescription || 'محموله بار'})`
          : (wb.errorMessage || 'خطای وب‌سرویس سپاد در زمان اعتبارسنجی ناوگان'),
        actionGuide: isSuccess
          ? 'باربرگ صادر شده و در پورتال سپاد قابل استعلام است'
          : 'بررسی مجدد پارامترهای ارسالی و ورود مجدد کد دوعاملی',
        type: 'صدور بارنامه',
      });
    });

    return list;
  }, [fleet, waybills]);

  const filteredLogs = logRecords.filter(log => {
    const p = log.vehicle.plate;
    const plateStr = `${p.part1}${p.letter}${p.part2}${p.provinceCode}`.toLowerCase();
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      plateStr.includes(s) ||
      log.traceCode.toLowerCase().includes(s) ||
      log.driver.fullName.toLowerCase().includes(s) ||
      log.description.toLowerCase().includes(s);

    if (!matchesSearch) return false;

    if (filter === 'SUCCESS') return log.status === 'SUCCESS';
    if (filter === 'ERROR') return log.status === 'ERROR';
    if (filter === 'ACTION_REQUIRED') return log.status === 'ERROR' && Boolean(log.actionGuide);

    return true;
  });

  const successCount = logRecords.filter(l => l.status === 'SUCCESS').length;
  const errorCount = logRecords.filter(l => l.status === 'ERROR').length;

  return (
    <div className="space-y-5">
      {/* Header and Filter summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>نتایج عملکرد، رهگیری خطا و لاگ‌های سامانه مرکزی (UTCMS)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ثبت شفاف تمام تعاملات با وب‌سرویس سپاد شهرداری همراه با راهنمای گام‌به‌گام رفع خطا
            </p>
          </div>

          {/* Export Logs */}
          <button
            onClick={() => {
              const text = filteredLogs
                .map(l => `${l.time} | ${l.traceCode} | ${l.status} | ${l.description}`)
                .join('\n');
              const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sipaad_error_logs.txt';
              a.click();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>دریافت فایل متنی لاگ‌ها</span>
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              تمام رویدادها ({toPersianDigits(logRecords.length)})
            </button>
            <button
              onClick={() => setFilter('SUCCESS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'SUCCESS'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              موفقیت‌آمیز ({toPersianDigits(successCount)})
            </button>
            <button
              onClick={() => setFilter('ERROR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'ERROR'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-rose-300 border border-slate-800'
              }`}
            >
              خطاها و رد شده‌ها ({toPersianDigits(errorCount)})
            </button>
            <button
              onClick={() => setFilter('ACTION_REQUIRED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'ACTION_REQUIRED'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-amber-300 border border-slate-800'
              }`}
            >
              نیازمند اقدام صادرکننده
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو در لاگ‌ها، کد رهگیری یا پلاک..."
              className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 select-none">
              <tr>
                <th className="p-3.5">زمان</th>
                <th className="p-3.5">کد رهگیری (TraceCode)</th>
                <th className="p-3.5">پلاک خودرو</th>
                <th className="p-3.5">راننده</th>
                <th className="p-3.5 text-center">وضعیت</th>
                <th className="p-3.5">شرح خطای وب‌سرویس سپاد</th>
                <th className="p-3.5">راهنمای اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map(log => {
                const isError = log.status === 'ERROR';
                return (
                  <tr key={log.id} className="hover:bg-slate-850 transition-colors">
                    <td className="p-3.5 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {log.time}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                        {log.traceCode}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <PlateBadge plate={log.vehicle.plate} size="sm" />
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-medium text-slate-200">
                      {log.driver.fullName}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {isError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>خطای {log.errorCode}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>موفق</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs leading-relaxed text-slate-300">
                      {log.description}
                    </td>
                    <td className="p-3.5">
                      {isError ? (
                        <button
                          onClick={() => setSelectedErrorItem({ vehicle: log.vehicle, driver: log.driver })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>راهنمای رفع مشکل</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">عملیات کامل شد</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedErrorItem && (
        <ErrorDetailsModal
          vehicle={selectedErrorItem.vehicle}
          driver={selectedErrorItem.driver}
          onClose={() => setSelectedErrorItem(null)}
        />
      )}
    </div>
  );
};
