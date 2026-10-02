import React, { useState } from 'react';
import { VehicleInfo, DriverInfo, IranPlate } from '../types';
import { PlateBadge } from './PlateBadge';
import { AddDriverWizardModal } from './AddDriverWizardModal';
import { toPersianDigits } from '../lib/iranPlate';
import {
  Truck,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  PackageCheck,
  LayoutGrid,
  Table as TableIcon,
  ArrowLeftRight,
  KeyRound,
  Clock,
  User,
  Phone,
  RefreshCw,
  RotateCw,
  Sparkles,
  Users,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { PlateTable } from './PlateTable';

interface FleetManagerProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  onAddVehicle: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onSelectForIssuance: (idx: number) => void;
  onRegisterWithCarriage?: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onRegisterRoundTrip?: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onUpdateFleet?: React.Dispatch<React.SetStateAction<{ vehicle: VehicleInfo; driver: DriverInfo }[]>>;
  onNavigateToOtp?: () => void;
  currentOperatorName?: string;
  isSupportRole?: boolean;
  currentPlateCount?: number;
  maxPlateCapacity?: number;
}

export const FleetManager: React.FC<FleetManagerProps> = ({
  fleet,
  onAddVehicle,
  onSelectForIssuance,
  onRegisterWithCarriage,
  onRegisterRoundTrip,
  onUpdateFleet,
  onNavigateToOtp,
  currentOperatorName = 'پشتیبان عملیاتی',
  isSupportRole = false,
  currentPlateCount = 120,
  maxPlateCapacity = 150,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showWizardModal, setShowWizardModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_OTP' | 'IN_TRANSIT' | 'IDLE' | 'HAS_ERROR' | 'MY_DRIVERS'>('ALL');
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [cardMenuOpenIdx, setCardMenuOpenIdx] = useState<number | null>(null);

  const handleDeletePlate = (plateStr: string) => {
    if (onUpdateFleet) {
      onUpdateFleet((prev) =>
        prev.filter((item) => {
          const p = item.vehicle.plate;
          const key = `${p.part1}${p.letter}${p.part2}-${p.provinceCode}`;
          const altKey = `${p.part1}${p.letter}${p.part2}`;
          return key !== plateStr && altKey !== plateStr;
        })
      );
      showToast(`پلاک ${plateStr} با موفقیت حذف گردید.`);
    }
  };

  const handleReRegister = (item: { vehicle: VehicleInfo; driver: DriverInfo }, idx: number) => {
    if (onRegisterWithCarriage) {
      onRegisterWithCarriage(item);
    } else {
      onSelectForIssuance(idx);
    }
  };

  // New vehicle state
  const [newPlate, setNewPlate] = useState<IranPlate>({
    part1: '58',
    letter: 'ع',
    part2: '412',
    provinceCode: '11',
    type: 'public',
  });
  const [newVehicleType, setNewVehicleType] = useState<VehicleInfo['vehicleType']>('وانت نیسان');
  const [newSmartCard, setNewSmartCard] = useState<string>('3910248');
  const [newMaxLoad, setNewMaxLoad] = useState<number>(2200);
  const [newDriverName, setNewDriverName] = useState<string>('رضا باقری');
  const [newDriverCode, setNewDriverCode] = useState<string>('0081928471');
  const [newDriverMobile, setNewDriverMobile] = useState<string>('09123456789');
  const [newDriverSmartCard, setNewDriverSmartCard] = useState<string>('DRV-991823');

  const showToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const getPlateKey = (item: { vehicle: VehicleInfo }) =>
    `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}`;

  // Trigger OTP for driver
  const handleTriggerOtp = (item: { vehicle: VehicleInfo; driver: DriverInfo }) => {
    if (!onUpdateFleet) return;
    const key = getPlateKey(item);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    onUpdateFleet(prev =>
      prev.map(f => {
        if (getPlateKey(f) === key) {
          return {
            ...f,
            vehicle: {
              ...f.vehicle,
              otpStatus: 'PENDING_OTP',
              pendingOtpCode: newOtp,
              otpExpiresAt: '۲ دقیقه دیگر',
              otpRemainingSeconds: 120,
              lastOtpRequestedAt: new Date().toLocaleTimeString('fa-IR'),
            },
          };
        }
        return f;
      })
    );

    showToast(`کد دو عاملی ۶ رقمی با موفقیت به راننده «${item.driver.fullName}» (${item.driver.mobile}) پیامک شد.`);
  };

  // Quick verify OTP
  const handleQuickVerifyOtp = (item: { vehicle: VehicleInfo; driver: DriverInfo }) => {
    if (!onUpdateFleet) return;
    const key = getPlateKey(item);

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

    showToast(`کد دو عاملی راننده «${item.driver.fullName}» با موفقیت در سامانه سپاد تأیید شد.`);
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVehicle({
      vehicle: {
        plate: newPlate,
        vehicleType: newVehicleType,
        smartCardNumber: newSmartCard,
        technicalInspectionExpiry: '1404/11/30',
        insurancePolicyNumber: 'INS-NEW-8812',
        maxLoadCapacityKg: Number(newMaxLoad),
        fuelType: newVehicleType === 'وانت نیسان' ? 'بنزین' : 'گازوئیل',
        permitStatus: 'VALID',
        permitErrorCode: 'NONE',
        permitErrorMessage: 'فاقد خطای صدور - مجاز',
        biweeklyWaybillCount: 0,
        biweeklyQuotaLimit: 15,
        fuelQuotaLiters: 400,
        isActive: true,
        carriageStatus: 'IDLE',
        otpStatus: 'NOT_REQUIRED',
        assignedSupportName: currentOperatorName,
      },
      driver: {
        fullName: newDriverName,
        nationalCode: newDriverCode,
        mobile: newDriverMobile,
        smartCardNumber: newDriverSmartCard,
        licenseNumber: 'B1-889104',
        assignedSupportName: currentOperatorName,
      },
    });

    setShowAddModal(false);
    showToast(`پلاک ${newPlate.part1} ${newPlate.letter} ${newPlate.part2} با موفقیت به ناوگان افزوده شد.`);
  };

  // Filtered fleet
  const filteredFleet = fleet.filter(item => {
    // Filter by tab
    if (activeFilter === 'PENDING_OTP' && item.vehicle.otpStatus !== 'PENDING_OTP') return false;
    if (activeFilter === 'IN_TRANSIT' && item.vehicle.carriageStatus !== 'IN_TRANSIT') return false;
    if (activeFilter === 'IDLE' && item.vehicle.carriageStatus !== 'IDLE') return false;
    if (activeFilter === 'HAS_ERROR' && item.vehicle.permitStatus !== 'ERROR') return false;
    if (activeFilter === 'MY_DRIVERS') {
      const assigned = item.driver.assignedSupportName || item.vehicle.assignedSupportName;
      if (!assigned || !assigned.includes(currentOperatorName)) return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const plateStr = `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}${item.vehicle.plate.provinceCode}`;

    return (
      item.driver.fullName.toLowerCase().includes(term) ||
      item.driver.nationalCode.includes(term) ||
      item.driver.mobile.includes(term) ||
      item.vehicle.smartCardNumber.includes(term) ||
      item.vehicle.vehicleType.toLowerCase().includes(term) ||
      plateStr.includes(term) ||
      (item.driver.assignedSupportName && item.driver.assignedSupportName.toLowerCase().includes(term))
    );
  });

  const pendingOtpCount = fleet.filter(f => f.vehicle.otpStatus === 'PENDING_OTP').length;
  const inTransitCount = fleet.filter(f => f.vehicle.carriageStatus === 'IN_TRANSIT').length;
  const errorCount = fleet.filter(f => f.vehicle.permitStatus === 'ERROR').length;

  return (
    <div className="space-y-4">
      {/* Status Toast */}
      {statusNotification && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>مدیریت ناوگان رانندگان، احراز دو عاملی و ثبت باربرگ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصیص اپراتور پشتیبان، درخواست رمز OTP، کنترل خطای صدور پروانه و ثبت با حمل برای هر پلاک
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Quick link to Bulk OTP tab */}
          {onNavigateToOtp && (
            <button
              type="button"
              onClick={onNavigateToOtp}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>میزکار تأیید دسته‌ای OTP</span>
              {pendingOtpCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono">
                  {toPersianDigits(pendingOtpCount)}
                </span>
              )}
            </button>
          )}

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'CARDS' ? 'bg-slate-800 text-amber-400 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="نمای کارتی"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'TABLE' ? 'bg-slate-800 text-amber-400 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="نمای جدولی"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowWizardModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>افزودن راننده</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            همه ناوگان ({toPersianDigits(fleet.length)})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('PENDING_OTP')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'PENDING_OTP'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>نیازمند کد دوعاملی ({toPersianDigits(pendingOtpCount)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('IN_TRANSIT')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'IN_TRANSIT'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            در حال حمل ({toPersianDigits(inTransitCount)})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('HAS_ERROR')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeFilter === 'HAS_ERROR'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>دارای خطای صدور ({toPersianDigits(errorCount)})</span>
          </button>

          {isSupportRole && (
            <button
              type="button"
              onClick={() => setActiveFilter('MY_DRIVERS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeFilter === 'MY_DRIVERS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 border border-slate-800 text-indigo-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ناوگان تحت پوشش من</span>
            </button>
          )}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو پلاک، نام، کدملی، همراه..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Fleet Cards Grid Mode */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFleet.map((item, idx) => {
            const waybillCount = item.vehicle.biweeklyWaybillCount || 0;
            const quotaLimit = item.vehicle.biweeklyQuotaLimit || 15;
            const percentUsed = Math.min(100, Math.round((waybillCount / quotaLimit) * 100));
            const hasError = item.vehicle.permitStatus === 'ERROR';
            const isWarning = item.vehicle.permitStatus === 'WARNING';
            const isPendingOtp = item.vehicle.otpStatus === 'PENDING_OTP';
            const isVerifiedOtp = item.vehicle.otpStatus === 'VERIFIED';
            const supportName = item.driver.assignedSupportName || item.vehicle.assignedSupportName || 'واحد ترابری تهران';

            return (
              <div
                key={idx}
                className={`bg-slate-900 border rounded-2xl p-5 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between shadow-xs ${
                  hasError
                    ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-slate-900'
                    : isPendingOtp
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/15 to-slate-900'
                    : isWarning
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-slate-900'
                    : 'border-slate-800'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Plate Header + Register with Load Button */}
                  <div className="flex flex-col gap-2.5 border-b border-slate-800 pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap relative">
                      <div className="flex items-center gap-2">
                        <PlateBadge
                          plate={item.vehicle.plate}
                          tonnageKg={item.vehicle.maxLoadCapacityKg}
                          biweeklyWaybillCount={item.vehicle.biweeklyWaybillCount ?? 0}
                          biweeklyQuotaLimit={item.vehicle.biweeklyQuotaLimit ?? 15}
                          size="md"
                        />
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300">
                          {item.vehicle.vehicleType}
                        </span>
                      </div>

                      {/* 3-Dot Menu Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCardMenuOpenIdx(cardMenuOpenIdx === idx ? null : idx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
                          title="عملیات پلاک"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {cardMenuOpenIdx === idx && (
                          <div className="absolute left-0 top-8 z-30 w-36 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 text-right animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => {
                                setCardMenuOpenIdx(null);
                                handleReRegister(item, idx);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-800 dark:text-neutral-200 hover:bg-orange-500 hover:text-black transition"
                            >
                              <RotateCw className="w-3.5 h-3.5 text-orange-500" />
                              ثبت مجدد
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCardMenuOpenIdx(null);
                                const p = item.vehicle.plate;
                                handleDeletePlate(`${p.part1}${p.letter}${p.part2}-${p.provinceCode}`);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              حذف پلاک
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons: ثبت با حمل و رفت و برگشت */}
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <span className="text-[11px] text-slate-400">عملیات صدور پلاک:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            if (onRegisterWithCarriage) {
                              onRegisterWithCarriage(item);
                            } else {
                              onSelectForIssuance(idx);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                          title="ثبت فوری باربرگ با حمل برای این پلاک"
                        >
                          <PackageCheck className="w-3.5 h-3.5 text-slate-950" />
                          <span>ثبت با حمل</span>
                        </button>

                        <button
                          onClick={() => {
                            if (onRegisterRoundTrip) {
                              onRegisterRoundTrip(item);
                            } else if (onRegisterWithCarriage) {
                              onRegisterWithCarriage(item);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                          title="ثبت باربرگ رفت و برگشت (مسیر دوطرفه) برای این پلاک"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
                          <span>رفت و برگشت</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* OTP Authentication Status & Direct Action Strip */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <KeyRound className={`w-4 h-4 ${isVerifiedOtp ? 'text-emerald-400' : isPendingOtp ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-[11px] text-slate-400 block">اعتبارسنجی دو عاملی (OTP):</span>
                        {isVerifiedOtp ? (
                          <span className="font-bold text-emerald-400 text-[11px]">تأیید شده و فعال در سپاد</span>
                        ) : isPendingOtp ? (
                          <span className="font-bold text-amber-400 text-[11px]">در انتظار ورود رمز (پیامک شد)</span>
                        ) : (
                          <span className="font-semibold text-slate-400 text-[11px]">نیازمند استعلام جدید</span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isPendingOtp ? (
                        <button
                          type="button"
                          onClick={() => handleQuickVerifyOtp(item)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] shadow-xs cursor-pointer transition-all"
                        >
                          تأیید سریع
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTriggerOtp(item)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] border border-slate-700 cursor-pointer transition-all"
                        >
                          درخواست رمز
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 15-day period quota progress bar */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">سقف مجاز دوره ۱۵ روزه:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {toPersianDigits(waybillCount)} / {toPersianDigits(quotaLimit)} باربرگ
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          percentUsed >= 100
                            ? 'bg-rose-500'
                            : percentUsed >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>

                  {/* Permit and Error Details */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">وضعیت پروانه صدور:</span>
                      {hasError ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>خطای مسدودی پروانه</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>هشدار سقف دوره</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>پروانه معتبر در سپاد</span>
                        </span>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 block">شرح وضعیت:</span>
                      <div className="text-slate-200 mt-0.5 text-[11px] leading-relaxed">
                        {item.vehicle.permitErrorMessage || 'پروانه فعالیت شهرداری و معاینه فنی معتبر می‌باشد.'}
                      </div>
                    </div>
                  </div>

                  {/* Driver and technical info with Multi-tenant Support label */}
                  <div className="pt-1 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">نام راننده:</span>
                      <span className="font-bold text-white">{item.driver.fullName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">کد ملی و همراه:</span>
                      <span className="font-mono text-slate-300">
                        {toPersianDigits(item.driver.nationalCode)} | {item.driver.mobile}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">پشتیبان مسئول:</span>
                      <span className="font-semibold text-indigo-300 text-[11px]">
                        {supportName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">معاینه فنی:</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {toPersianDigits(item.vehicle.technicalInspectionExpiry)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>احراز وب‌سرویس سپاد</span>
                  </span>

                  <button
                    onClick={() => onSelectForIssuance(idx)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    صدور بارنامه تکی
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Fleet Table Mode with 15-Day View & 3-Dot Menu */
        <PlateTable
          fleet={filteredFleet}
          onReRegister={(item) => handleReRegister(item, 0)}
          onDeletePlate={handleDeletePlate}
          onSelectForIssuance={onSelectForIssuance}
        />
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>افزودن پلاک و راننده جدید به ناوگان</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">نوع خودرو:</label>
                  <select
                    value={newVehicleType}
                    onChange={e => setNewVehicleType(e.target.value as any)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-2 text-xs text-white"
                  >
                    <option value="وانت نیسان">وانت نیسان (بنزینی/دوگانه‌سوز)</option>
                    <option value="کامیونت ایسوزو">کامیونت ایسوزو (دیزل)</option>
                    <option value="کامیون بنز تک">کامیون بنز تک (دیزل)</option>
                    <option value="خاور ۶۰۸">خاور ۶۰۸</option>
                    <option value="وانت پیکان/آریسان">وانت پیکان/آریسان</option>
                    <option value="تریلر کفی شهری">تریلر کفی شهری</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">ظرفیت بارگیری (کیلوگرم):</label>
                  <input
                    type="number"
                    value={newMaxLoad}
                    onChange={e => setNewMaxLoad(Number(e.target.value))}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white"
                  />
                </div>
              </div>

              {/* License Plate Inputs */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">شماره پلاک ایران:</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={newPlate.part1}
                    onChange={e => setNewPlate(prev => ({ ...prev, part1: e.target.value }))}
                    className="h-9 bg-slate-950 border border-slate-700 rounded-xl text-center text-xs text-white"
                    placeholder="۴۳"
                  />
                  <select
                    value={newPlate.letter}
                    onChange={e => setNewPlate(prev => ({ ...prev, letter: e.target.value }))}
                    className="h-9 bg-slate-950 border border-slate-700 rounded-xl text-center text-xs text-white"
                  >
                    <option value="ع">ع (عمومی)</option>
                    <option value="الف">الف</option>
                    <option value="ب">ب</option>
                    <option value="د">د</option>
                  </select>
                  <input
                    type="text"
                    maxLength={3}
                    value={newPlate.part2}
                    onChange={e => setNewPlate(prev => ({ ...prev, part2: e.target.value }))}
                    className="h-9 bg-slate-950 border border-slate-700 rounded-xl text-center text-xs text-white"
                    placeholder="۷۸۹"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={newPlate.provinceCode}
                    onChange={e => setNewPlate(prev => ({ ...prev, provinceCode: e.target.value }))}
                    className="h-9 bg-slate-950 border border-slate-700 rounded-xl text-center text-xs text-white"
                    placeholder="۷۷"
                  />
                </div>
              </div>

              {/* Driver info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">نام و نام خانوادگی راننده:</label>
                  <input
                    type="text"
                    value={newDriverName}
                    onChange={e => setNewDriverName(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">کد ملی راننده:</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={newDriverCode}
                    onChange={e => setNewDriverCode(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">شماره تلفن همراه:</label>
                  <input
                    type="text"
                    value={newDriverMobile}
                    onChange={e => setNewDriverMobile(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">شماره کارت هوشمند خودرو:</label>
                  <input
                    type="text"
                    value={newSmartCard}
                    onChange={e => setNewSmartCard(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  تأیید و افزودن به ناوگان
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-Step Minimalist Wizard Modal: افزودن راننده */}
      <AddDriverWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onAddDriver={item => {
          onAddVehicle(item);
          showToast(`راننده «${item.driver.fullName}» با پلاک «${item.vehicle.plate.part1} ${item.vehicle.plate.letter} ${item.vehicle.plate.part2}» با موفقیت افزوده شد.`);
        }}
        currentPlateCount={currentPlateCount}
        maxPlateCapacity={maxPlateCapacity}
        currentOperatorName={currentOperatorName}
      />
    </div>
  );
};
