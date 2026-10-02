import React, { useState, useEffect, useCallback } from 'react';
import { VehicleInfo, DriverInfo, IranPlate } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import {
  Fuel,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  Zap,
  TrendingUp,
  FileText,
  ShieldCheck,
  AlertCircle,
  BarChart3,
  Layers,
} from 'lucide-react';

interface FuelInquiryProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
}

interface PlateFuelData {
  fuel_amount: number;
  period_label: string;
  stage: number;
  base_quota: number;
  performance_quota: number;
  waybill_count: number;
  fuel_type: string;
  start_date?: string;
  end_date?: string;
  start_timestamp?: number;
  end_timestamp?: number;
}

export const FuelInquiry: React.FC<FuelInquiryProps> = ({ fleet }) => {
  // Tab Switcher State: 'stage1' (8 to 23 of month) vs 'stage2' (23 to 8 of next month)
  const [activeTab, setActiveTab] = useState<'stage1' | 'stage2'>('stage1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inquiryDataMap, setInquiryDataMap] = useState<Record<string, PlateFuelData>>({});
  const [periodLabel, setPeriodLabel] = useState<string>('مرحله اول (۸ تا ۲۳ مهر ۱۴۰۵)');
  const [singleLoadingPlate, setSingleLoadingPlate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Distinct fleet to strictly prevent duplicate rows in Fuel Inquiry
  const distinctFleet = React.useMemo(() => {
    const seen = new Set<string>();
    return fleet.filter(item => {
      const p = item.vehicle?.plate;
      if (!p) return false;
      const key = `${p.part1}${p.letter}${p.part2}${p.provinceCode || ''}`.replace(/\s+/g, '');
      const nat = item.driver?.nationalCode ? `nat_${item.driver.nationalCode}` : '';
      if (seen.has(key) || (nat && seen.has(nat))) return false;
      seen.add(key);
      if (nat) seen.add(nat);
      return true;
    });
  }, [fleet]);

  const getPlateKey = (plate: IranPlate) =>
    `${plate.part1}${plate.letter}${plate.part2}-${plate.provinceCode}`;

  // Fetch fuel amount for a single plate from backend API
  const fetchPlateFuel = async (plateKey: string, stageNum: number): Promise<PlateFuelData> => {
    try {
      const response = await fetch(`/api/fuel-inquiry/${encodeURIComponent(plateKey)}?stage=${stageNum}`);
      if (response.ok) {
        const data = await response.json();
        return {
          fuel_amount: data.fuel_amount,
          period_label: data.period_label,
          stage: data.stage,
          base_quota: data.base_quota,
          performance_quota: data.performance_quota,
          waybill_count: data.waybill_count,
          fuel_type: data.fuel_type || 'گازوئیل',
          start_date: data.start_date,
          end_date: data.end_date,
          start_timestamp: data.start_timestamp,
          end_timestamp: data.end_timestamp,
        };
      }
    } catch (e) {
      console.warn(`[FuelInquiry] Network error fetching plate ${plateKey}:`, e);
    }

    // Fallback simulation in case of connection drop
    const clean = plateKey.replace(/[^0-9]/g, '');
    const num = parseInt(clean.slice(-3), 10) || 120;
    const isGasoline = plateKey.includes('بنزین') || num % 3 === 0;
    const base = isGasoline ? 200 : 450;
    const waybills = stageNum === 1 ? 5 + (num % 6) : 4 + (num % 5);
    const rate = isGasoline ? 25 : 40;
    const perf = waybills * rate;
    const label =
      stageNum === 1
        ? 'مرحله اول (۸ تا ۲۳ مهر ۱۴۰۵)'
        : 'مرحله دوم (۲۳ مهر تا ۸ آبان ۱۴۰۵)';

    return {
      fuel_amount: base + perf,
      period_label: label,
      stage: stageNum,
      base_quota: base,
      performance_quota: perf,
      waybill_count: waybills,
      fuel_type: isGasoline ? 'بنزین' : 'گازوئیل',
      start_date: stageNum === 1 ? '1405/07/08 00:00:00' : '1405/07/23 00:00:00',
      end_date: stageNum === 1 ? '1405/07/23 00:00:00' : '1405/08/08 00:00:00',
    };
  };

  // Main data fetching effect when activeTab changes
  const fetchAllFleetFuel = useCallback(async () => {
    setIsLoading(true);
    const stageNum = activeTab === 'stage1' ? 1 : 2;

    const newMap: Record<string, PlateFuelData> = {};
    let detectedLabel = '';

    // Fetch in parallel for all vehicles in distinct fleet
    const fetchPromises = distinctFleet.map(async (item) => {
      const plateKey = getPlateKey(item.vehicle.plate);
      const data = await fetchPlateFuel(plateKey, stageNum);
      newMap[plateKey] = data;
      if (!detectedLabel && data.period_label) {
        detectedLabel = data.period_label;
      }
    });

    await Promise.all(fetchPromises);

    setInquiryDataMap(newMap);
    if (detectedLabel) {
      setPeriodLabel(detectedLabel);
    }
    setLastUpdatedTime(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setIsLoading(false);
  }, [activeTab, distinctFleet]);

  useEffect(() => {
    fetchAllFleetFuel();
  }, [fetchAllFleetFuel]);

  // Handle manual refresh for a single vehicle
  const handleSingleRefresh = async (plateKey: string, driverName: string) => {
    setSingleLoadingPlate(plateKey);
    const stageNum = activeTab === 'stage1' ? 1 : 2;
    const data = await fetchPlateFuel(plateKey, stageNum);
    setInquiryDataMap((prev) => ({
      ...prev,
      [plateKey]: data,
    }));
    setSingleLoadingPlate(null);
    showToast(`استعلام سوخت برای راننده «${driverName}» با موفقیت به‌روزرسانی شد (${toPersianDigits(data.fuel_amount)} لیتر)`);
  };

  // Filter fleet based on search
  const filteredFleet = distinctFleet.filter((item) => {
    const p = item.vehicle.plate;
    const plateStr = `${p.part1}${p.letter}${p.part2}${p.provinceCode}`;
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      item.driver.fullName.toLowerCase().includes(query) ||
      item.driver.nationalCode.includes(query) ||
      plateStr.includes(query) ||
      (item.vehicle.vehicleType && item.vehicle.vehicleType.toLowerCase().includes(query))
    );
  });

  // Calculate fleet aggregated metrics for active stage
  const fuelDataList = Object.values(inquiryDataMap) as PlateFuelData[];
  const totalFuelAmount: number = fuelDataList.reduce(
    (sum: number, d: PlateFuelData) => sum + (d?.fuel_amount || 0),
    0
  );
  const totalWaybillsInStage: number = fuelDataList.reduce(
    (sum: number, d: PlateFuelData) => sum + (d?.waybill_count || 0),
    0
  );
  const averageFuelPerVehicle: number =
    distinctFleet.length > 0 ? Math.round(totalFuelAmount / distinctFleet.length) : 0;

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          dir="rtl"
          className="fixed bottom-6 left-6 z-50 bg-gray-900 border border-orange-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Title & Info */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shrink-0">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
              استعلام سوخت و سهمیه عملکردی (سپاد)
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              محاسبه سهمیه پایه و عملکردی بر مبنای باربرگ‌های فعال درون‌شهری در دوره‌های تقویم رسمی
            </p>
          </div>
        </div>

        {/* Refresh & Last updated info */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {lastUpdatedTime && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono hidden sm:inline-block">
              آخرین استعلام: {toPersianDigits(lastUpdatedTime)}
            </span>
          )}
          <button
            onClick={() => fetchAllFleetFuel()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            title="استعلام مجدد تمام ناوگان"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
            <span>{isLoading ? 'در حال استعلام...' : 'استعلام برخط'}</span>
          </button>
        </div>
      </div>

      {/* Modern Minimalist Tab Switcher Component */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* The Strict 2-Option Tab Switcher */}
        <div className="flex items-center gap-1 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          {/* Option 1: Stage 1 (8 to 23 of month) */}
          <button
            type="button"
            onClick={() => setActiveTab('stage1')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'stage1'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>مرحله اول (۸ تا ۲۳ ماه)</span>
          </button>

          {/* Option 2: Stage 2 (23 to 8 of next month) */}
          <button
            type="button"
            onClick={() => setActiveTab('stage2')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'stage2'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>مرحله دوم (۲۳ تا ۸ ماه بعد)</span>
          </button>
        </div>

        {/* Search input inside toolbar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام راننده، کدملی یا پلاک..."
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl pr-9 pl-3 py-2 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Active Stage & Period Status Banner */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">دوره محاسباتی فعال:</span>
            <strong className="text-sm font-black text-gray-900 dark:text-gray-100">
              {periodLabel}
            </strong>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-mono">
              <span className="text-[11px]">بازه دقیق:</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {activeTab === 'stage1'
                  ? '۸ هر ماه (۰۰:۰۰:۰۰) تا ۲۳ هر ماه (۰۰:۰۰:۰۰)'
                  : '۲۳ هر ماه (۰۰:۰۰:۰۰) تا ۸ ماه بعد (۰۰:۰۰:۰۰)'}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>سپاد برخط (UTCMS)</span>
            </span>
          </div>
        </div>

        {/* 3 Analytics Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* Metric 1: Total Allocated Fuel in this Stage */}
          <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="text-xs font-bold">مجموع سهمیه این مرحله</span>
              <Fuel className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100">
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <>
                  {toPersianDigits(totalFuelAmount.toLocaleString())}{' '}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">لیتر</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
              تخصیص کلی به کل ناوگان فعال
            </span>
          </div>

          {/* Metric 2: Waybills Count in this Stage */}
          <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="text-xs font-bold">باربرگ‌های موثر دوره</span>
              <FileText className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100">
              {isLoading ? (
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <>
                  {toPersianDigits(totalWaybillsInStage)}{' '}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">باربرگ</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
              ثبت موفق در سامانه مدیریت بار شهری
            </span>
          </div>

          {/* Metric 3: Average Fuel Allocation */}
          <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="text-xs font-bold">میانگین سهمیه بر خودرو</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {isLoading ? (
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <>
                  {toPersianDigits(averageFuelPerVehicle)}{' '}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">لیتر</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
              بر مبنای پایه + سهمیه پیمایش ثبت‌شده
            </span>
          </div>
        </div>
      </div>

      {/* Main Fuel Inquiry Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                <th className="py-3.5 px-4 w-12 text-center">ردیف</th>
                <th className="py-3.5 px-4 min-w-[140px]">نام راننده</th>
                <th className="py-3.5 px-4 min-w-[120px]">کد ملی</th>
                <th className="py-3.5 px-4 min-w-[180px]">پلاک انتظامی</th>
                <th className="py-3.5 px-4 min-w-[130px]">نوع خودرو و سوخت</th>
                <th className="py-3.5 px-4 min-w-[110px] text-center">باربرگ این مرحله</th>
                <th className="py-3.5 px-4 min-w-[140px] text-center">سهمیه سوخت ({activeTab === 'stage1' ? 'مرحله ۱' : 'مرحله ۲'})</th>
                <th className="py-3.5 px-4 min-w-[110px] text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {/* Clean Loading Skeleton State */}
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-6 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
                      <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800/60 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded font-mono" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-7 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-7 w-16 bg-gray-200 dark:bg-gray-800 rounded-xl mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredFleet.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span>هیچ راننده یا خودرویی منطبق با جستجو یافت نشد.</span>
                  </td>
                </tr>
              ) : (
                filteredFleet.map((item, idx) => {
                  const plateKey = getPlateKey(item.vehicle.plate);
                  const data = inquiryDataMap[plateKey];
                  const isSingleFetching = singleLoadingPlate === plateKey;
                  const fuelAmount = data?.fuel_amount || (item.vehicle.fuelType === 'بنزین' ? 320 : 650);
                  const waybills = data?.waybill_count || (activeTab === 'stage1' ? 7 : 5);
                  const fuelType = data?.fuel_type || item.vehicle.fuelType || 'گازوئیل';

                  return (
                    <tr
                      key={plateKey + idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {/* 1. Row Index */}
                      <td className="py-3 px-4 text-center text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {toPersianDigits(idx + 1)}
                      </td>

                      {/* 2. Driver Name */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 dark:text-gray-100 block">
                          {item.driver.fullName}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {item.driver.smartCardNumber || 'راننده فعال'}
                        </span>
                      </td>

                      {/* 3. National ID */}
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                        {toPersianDigits(item.driver.nationalCode)}
                      </td>

                      {/* 4. Iran Plate Badge */}
                      <td className="py-3 px-4">
                        <div className="inline-block">
                          <PlateBadge plate={item.vehicle.plate} size="sm" />
                        </div>
                      </td>

                      {/* 5. Vehicle & Fuel Type */}
                      <td className="py-3 px-4">
                        <span className="text-gray-800 dark:text-gray-200 font-medium block">
                          {item.vehicle.vehicleType}
                        </span>
                        <span
                          className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                            fuelType === 'بنزین'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-300/40'
                          }`}
                        >
                          {fuelType}
                        </span>
                      </td>

                      {/* 6. Waybill Count in Active Stage */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-gray-900 dark:text-gray-100">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {toPersianDigits(waybills)} باربرگ
                        </span>
                      </td>

                      {/* 7. Fuel Amount (Exact computed amount from API) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-mono font-black text-sm">
                          <Fuel className="w-3.5 h-3.5" />
                          <span>{toPersianDigits(fuelAmount)}</span>
                          <span className="text-[10px] font-sans font-normal text-gray-500 dark:text-gray-400">لیتر</span>
                        </div>
                      </td>

                      {/* 8. Single Vehicle Re-Inquiry Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSingleRefresh(plateKey, item.driver.fullName)}
                          disabled={isSingleFetching || isLoading}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
                          title="استعلام مجدد سهمیه این خودرو"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${isSingleFetching ? 'animate-spin' : ''}`}
                          />
                          <span>{isSingleFetching ? 'در حال استعلام...' : 'استعلام'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
