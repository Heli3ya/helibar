import React, { useState, useMemo } from 'react';
import { WaybillItem } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits, formatRials } from '../lib/iranPlate';
import {
  Search,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Download,
  Filter,
  ArrowRight,
} from 'lucide-react';

interface WaybillListProps {
  waybills: WaybillItem[];
  onSelectPrint: (wb: WaybillItem) => void;
  onNavigateBack?: () => void;
}

export const WaybillList: React.FC<WaybillListProps> = ({ waybills, onSelectPrint, onNavigateBack }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return waybills.filter(wb => {
      if (statusFilter !== 'ALL' && wb.status !== statusFilter) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const plateStr = `${wb.vehicle.plate.part1}${wb.vehicle.plate.letter}${wb.vehicle.plate.part2}${wb.vehicle.plate.provinceCode}`;

      return (
        wb.waybillNumber?.toLowerCase().includes(term) ||
        wb.trackingCode?.toLowerCase().includes(term) ||
        wb.driver.fullName?.toLowerCase().includes(term) ||
        wb.driver.nationalCode?.includes(term) ||
        wb.cargoDescription?.toLowerCase().includes(term) ||
        wb.senderName?.toLowerCase().includes(term) ||
        wb.receiverName?.toLowerCase().includes(term) ||
        plateStr.includes(term)
      );
    });
  }, [waybills, searchTerm, statusFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = [
      'شماره سریال',
      'کد رهگیری سپاد',
      'تاریخ صدور',
      'پلاک',
      'نام راننده',
      'کد ملی',
      'شرح بار',
      'وزن کیلوگرم',
      'وضعیت',
    ];

    const rows = filtered.map(wb => [
      wb.waybillNumber,
      wb.trackingCode || '',
      wb.issueDateTime,
      `${wb.vehicle.plate.part1}${wb.vehicle.plate.letter}${wb.vehicle.plate.part2}-${wb.vehicle.plate.provinceCode}`,
      wb.driver.fullName,
      wb.driver.nationalCode,
      wb.cargoDescription,
      wb.weightKg,
      wb.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `waybills_helibar_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header Search & Actions */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو بر اساس شماره سریال، کد رهگیری سپاد، پلاک، راننده، فرستنده یا گیرنده..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-white border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700 rounded-xl pr-10 pl-4 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer font-bold transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-500'
                }`}
              >
                همه ({toPersianDigits(waybills.length)})
              </button>
              <button
                onClick={() => setStatusFilter('ISSUED')}
                className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer font-bold transition-colors ${
                  statusFilter === 'ISSUED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-emerald-500'
                }`}
              >
                تایید سپاد
              </button>
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer font-bold transition-colors ${
                  statusFilter === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-rose-500'
                }`}
              >
                رد شده
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-orange-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-500" />
              <span>خروجی اکسل</span>
            </button>

            {/* Back to Dashboard Button */}
            {onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="بازگشت به داشبورد عملیاتی"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>بازگشت</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Waybill Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/90 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 font-bold select-none">
              <tr>
                <th className="p-3">سریال / رهگیری سپاد</th>
                <th className="p-3">تاریخ و ساعت</th>
                <th className="p-3">ناوگان و پلاک</th>
                <th className="p-3">راننده</th>
                <th className="p-3">مسیر (مبدا ← مقصد)</th>
                <th className="p-3">شرح محموله</th>
                <th className="p-3">وضعیت</th>
                <th className="p-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    موردی یافت نشد. بارنامه جدید صادر نمایید.
                  </td>
                </tr>
              ) : (
                filtered.map(wb => (
                  <tr key={wb.id} className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-gray-900 dark:text-gray-100 block text-xs">
                          {toPersianDigits(wb.waybillNumber)}
                        </span>
                        {wb.trackingCode && (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] text-orange-500 font-bold">
                              {toPersianDigits(wb.trackingCode)}
                            </span>
                            <button
                              onClick={() => handleCopy(wb.trackingCode!, wb.id)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
                              title="کپی کد رهگیری"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {copiedId === wb.id && (
                              <span className="text-[9px] text-emerald-500 font-bold">کپی شد</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-gray-500 dark:text-gray-400 text-[11px]">
                      {toPersianDigits(wb.issueDateTime)}
                    </td>

                    <td className="p-3">
                      <PlateBadge
                        plate={wb.vehicle.plate}
                        tonnageKg={wb.vehicle.maxLoadCapacityKg}
                        biweeklyWaybillCount={wb.vehicle.biweeklyWaybillCount}
                        biweeklyQuotaLimit={wb.vehicle.biweeklyQuotaLimit ?? 15}
                        size="sm"
                      />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        {wb.vehicle.vehicleType}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-gray-900 dark:text-gray-100 block">{wb.driver.fullName}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        کد ملی: {toPersianDigits(wb.driver.nationalCode)}
                      </span>
                    </td>

                    <td className="p-3 text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 block font-medium">از: {wb.senderCity}</span>
                      <span className="text-blue-600 dark:text-blue-400 block font-medium">به: {wb.receiverCity}</span>
                    </td>

                    <td className="p-3">
                      <span className="text-gray-900 dark:text-gray-100 block truncate max-w-[140px]" title={wb.cargoDescription}>
                        {wb.cargoDescription}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {toPersianDigits(wb.weightKg.toLocaleString())} ک‌گ ({wb.packingType})
                      </span>
                    </td>

                    <td className="p-3">
                      {wb.status === 'ISSUED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>تایید سپاد</span>
                        </span>
                      )}
                      {wb.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-rose-200 dark:border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          <span>خطای سپاد</span>
                        </span>
                      )}
                      {wb.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-[11px] border border-orange-200 dark:border-orange-500/30">
                          <Clock className="w-3 h-3" />
                          <span>در انتظار</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => onSelectPrint(wb)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        title="مشاهده و چاپ بارنامه رسمی (باربرگ)"
                      >
                        <Printer className="w-3.5 h-3.5 text-orange-500" />
                        <span>چاپ باربرگ</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
