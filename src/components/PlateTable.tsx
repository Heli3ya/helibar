import React, { useState, useRef, useEffect } from 'react';
import { VehicleInfo, DriverInfo } from '../types';
import { PlateBadge, TonnageBadge, BiweeklyCountBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import {
  MoreVertical,
  RotateCw,
  Trash2,
  Calendar,
  Scale,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export type BiweeklyPeriod = '8TH_TO_23RD' | '23RD_TO_8TH';

interface PlateTableProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  onReRegister?: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onDeletePlate?: (plateNumber: string) => void;
  onSelectForIssuance?: (idx: number) => void;
}

export const PlateTable: React.FC<PlateTableProps> = ({
  fleet,
  onReRegister,
  onDeletePlate,
  onSelectForIssuance,
}) => {
  // 15-Day Cycle Tab
  const [activePeriod, setActivePeriod] = useState<BiweeklyPeriod>('8TH_TO_23RD');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close 3-dot dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter fleet by search term (name, national code, plate)
  const filteredFleet = fleet.filter((item) => {
    const p = item.vehicle.plate;
    const plateStr = `${p.part1}${p.letter}${p.part2}${p.provinceCode}`;
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      item.driver.fullName.toLowerCase().includes(query) ||
      item.driver.nationalCode.includes(query) ||
      item.driver.mobile.includes(query) ||
      plateStr.includes(query)
    );
  });

  // Calculate dynamic 15-day statistics based on the selected period
  const getPeriodStats = (item: { vehicle: VehicleInfo; driver: DriverInfo }, index: number) => {
    const baseCount = item.vehicle.biweeklyWaybillCount || 10;
    const count =
      activePeriod === '8TH_TO_23RD'
        ? Math.min(24, Math.max(1, (baseCount * 13 + index * 3) % 23 + 2))
        : Math.min(24, Math.max(1, (baseCount * 11 + index * 4) % 21 + 3));

    const tonnageKg = item.vehicle.maxLoadCapacityKg || 2500;
    const totalTonnageTons = ((tonnageKg * count) / 1000).toLocaleString('fa-IR', {
      maximumFractionDigits: 1,
    });

    return {
      count,
      limit: 24,
      tonnageKg,
      totalTonnageTons,
    };
  };

  const handleReRegisterClick = (item: { vehicle: VehicleInfo; driver: DriverInfo }, idx: number) => {
    setOpenMenuIndex(null);
    if (onReRegister) {
      onReRegister(item);
    } else if (onSelectForIssuance) {
      onSelectForIssuance(idx);
    }
  };

  const handleDeleteClick = (plateStr: string) => {
    setOpenMenuIndex(null);
    setDeleteConfirmTarget(plateStr);
  };

  const confirmDelete = () => {
    if (deleteConfirmTarget && onDeletePlate) {
      onDeletePlate(deleteConfirmTarget);
    }
    setDeleteConfirmTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* 15-Day Registration View Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        {/* Period Selector Tabs */}
        <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 self-start sm:self-auto">
          <button
            onClick={() => setActivePeriod('8TH_TO_23RD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activePeriod === '8TH_TO_23RD'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            هشتم تا بیست و سوم ماه
          </button>

          <button
            onClick={() => setActivePeriod('23RD_TO_8TH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activePeriod === '23RD_TO_8TH'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            بیست و سوم تا هشتم ماه
          </button>
        </div>

        {/* Minimal Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی پلاک، راننده یا کد ملی..."
            className="w-full bg-white border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl pr-9 pl-3 py-1.5 text-xs outline-none transition"
          />
        </div>
      </div>

      {/* Plates Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold">
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4 min-w-[190px]">پلاک انتظامی</th>
                <th className="py-3 px-4 min-w-[140px]">راننده و کد ملی</th>
                <th className="py-3 px-4 min-w-[130px]">تناژ مجاز</th>
                <th className="py-3 px-4 min-w-[160px]">
                  تعداد باربرگ (
                  {activePeriod === '8TH_TO_23RD' ? '۸ تا ۲۳ ماه' : '۲۳ تا ۸ ماه'})
                </th>
                <th className="py-3 px-4 min-w-[130px]">مجموع تناژ دوره</th>
                <th className="py-3 px-4 text-center min-w-[80px]">اتصال</th>
                <th className="py-3 px-4 text-center min-w-[120px]">وضعیت دوعاملی</th>
                <th className="py-3 px-4 min-w-[110px]">وضعیت ناوگان</th>
                <th className="py-3 px-4 w-14 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {filteredFleet.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 dark:text-gray-500">
                    هیچ موردی با مشخصات جستجویافته یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredFleet.map((item, idx) => {
                  const p = item.vehicle.plate;
                  const plateStr = `${p.part1}${p.letter}${p.part2}-${p.provinceCode}`;
                  const stats = getPeriodStats(item, idx);
                  const isMenuOpen = openMenuIndex === idx;

                  const isAutoReg = item.vehicle.isAutoRegisterEnabled !== false;
                  return (
                    <tr
                      key={plateStr + idx}
                      className={`transition-all ${
                        !isAutoReg
                          ? 'opacity-40 bg-gray-50/50 dark:bg-gray-900/30 hover:opacity-75'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {/* Row index */}
                      <td className="py-3 px-4 text-center text-gray-400 dark:text-gray-500 font-mono">
                        {toPersianDigits(idx + 1)}
                      </td>

                      {/* Plate Badge with authentic Iranian License Style */}
                      <td className="py-3 px-4">
                        <div className="inline-block">
                          <PlateBadge plate={item.vehicle.plate} size="sm" />
                        </div>
                      </td>

                      {/* Driver Name & National ID */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {item.driver.fullName}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {toPersianDigits(item.driver.nationalCode)}
                        </div>
                      </td>

                      {/* Tonnage */}
                      <td className="py-3 px-4">
                        <TonnageBadge tonnageKg={stats.tonnageKg} size="sm" />
                      </td>

                      {/* 15-Day Registration Count */}
                      <td className="py-3 px-4">
                        <BiweeklyCountBadge
                          count={stats.count}
                          limit={stats.limit}
                          size="sm"
                        />
                      </td>

                      {/* Cumulative 15-day Tonnage */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                          <Scale className="w-3 h-3 text-orange-500" />
                          <span>{toPersianDigits(stats.totalTonnageTons)} تن</span>
                        </span>
                      </td>

                      {/* Connection Switch: strictly OFF if pending OTP */}
                      <td className="py-3 px-4 text-center">
                        <div
                          className={`w-9 h-5 rounded-full relative inline-block transition-colors ${
                            item.vehicle.otpStatus === 'PENDING_OTP'
                              ? 'bg-gray-300 dark:bg-gray-700 opacity-80 cursor-not-allowed'
                              : (item.vehicle.isActive ?? true)
                              ? 'bg-emerald-500'
                              : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                          title={
                            item.vehicle.otpStatus === 'PENDING_OTP'
                              ? 'اتصال به دلیل وضعیت «نیازمند کد» قطع است'
                              : (item.vehicle.isActive ?? true)
                              ? 'اتصال فعال'
                              : 'اتصال غیرفعال'
                          }
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                              item.vehicle.otpStatus === 'PENDING_OTP'
                                ? 'right-0.5'
                                : (item.vehicle.isActive ?? true)
                                ? 'left-0.5'
                                : 'right-0.5'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Two-Factor Status (وضعیت دوعاملی) */}
                      <td className="py-3 px-4 text-center">
                        {item.vehicle.otpStatus === 'PENDING_OTP' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/40">
                            نیازمند کد
                          </span>
                        ) : item.vehicle.otpStatus === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>تأیید شده</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                        )}
                      </td>

                      {/* Operational Status */}
                      <td className="py-3 px-4">
                        {item.vehicle.otpStatus === 'PENDING_OTP' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 animate-spin" />
                            در انتظار ۲FA
                          </span>
                        ) : item.vehicle.carriageStatus === 'IN_TRANSIT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3" />
                            در حال حمل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            آماده صدور
                          </span>
                        )}
                      </td>

                      {/* 3-Dot Menu Button */}
                      <td className="py-3 px-4 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuIndex(isMenuOpen ? null : idx);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="عملیات پلاک"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute left-4 top-10 z-30 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1 text-right animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100 dark:divide-gray-800"
                          >
                            {/* Option 1: Re-register */}
                            <button
                              onClick={() => handleReRegisterClick(item, idx)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5 text-orange-500" />
                              <span>ثبت مجدد</span>
                            </button>

                            {/* Option 2: Delete Plate */}
                            <button
                              onClick={() => handleDeleteClick(plateStr)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>حذف پلاک</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 mx-auto mb-3 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
              تایید حذف پلاک
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              آیا از حذف پلاک{' '}
              <span className="font-mono font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {deleteConfirmTarget}
              </span>{' '}
              از فهرست ناوگان فعال خود اطمینان دارید؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                بله، حذف شود
              </button>
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
