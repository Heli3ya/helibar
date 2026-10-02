import React, { useState } from 'react';
import { VehicleInfo, DriverInfo, FuelQuotaRecord, IranPlate, SipaadCredentials } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import {
  Fuel,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  PackageCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface FuelInquiryViewProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  fuelQuotas: FuelQuotaRecord[];
  config: SipaadCredentials;
  onOpenCarriageModal: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
}

export const FuelInquiryView: React.FC<FuelInquiryViewProps> = ({
  fleet,
  fuelQuotas,
  config,
  onOpenCarriageModal,
}) => {
  const [selectedPlateStr, setSelectedPlateStr] = useState<string>(
    fleet[0]
      ? `${fleet[0].vehicle.plate.part1}${fleet[0].vehicle.plate.letter}${fleet[0].vehicle.plate.part2}`
      : ''
  );
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isInquiring, setIsInquiring] = useState<boolean>(false);
  const [inquirySuccessMsg, setInquirySuccessMsg] = useState<string | null>(null);

  // Additional simulated new waybills for calculator
  const [simulatedExtraWaybills, setSimulatedExtraWaybills] = useState<number>(3);

  // Find active fleet item
  const selectedFleetItem = fleet.find(
    f => `${f.vehicle.plate.part1}${f.vehicle.plate.letter}${f.vehicle.plate.part2}` === selectedPlateStr
  ) || fleet[0];

  // Find active fuel record or generate one
  const activeRecord: FuelQuotaRecord = fuelQuotas.find(
    q =>
      `${q.plate.part1}${q.plate.letter}${q.plate.part2}` ===
      (selectedFleetItem
        ? `${selectedFleetItem.vehicle.plate.part1}${selectedFleetItem.vehicle.plate.letter}${selectedFleetItem.vehicle.plate.part2}`
        : '')
  ) || {
    id: 'fuel-dyn',
    plate: selectedFleetItem.vehicle.plate,
    vin: selectedFleetItem.vehicle.vinNumber || 'IRN-99481203',
    vehicleType: selectedFleetItem.vehicle.vehicleType,
    fuelType: selectedFleetItem.vehicle.fuelType || 'گازوئیل',
    smartCardNumber: selectedFleetItem.vehicle.smartCardNumber,
    fuelCardPan: '6037-9918-7712-4401',
    driverName: selectedFleetItem.driver.fullName,
    currentPeriodName: 'نیمه دوم شهریور ۱۴۰۴ (دوره ۲۴)',
    biweeklyWaybillCount: selectedFleetItem.vehicle.biweeklyWaybillCount || 8,
    baseQuotaLiters: selectedFleetItem.vehicle.fuelType === 'بنزین' ? 200 : 450,
    performanceQuotaLiters: (selectedFleetItem.vehicle.biweeklyWaybillCount || 8) * 40,
    totalCurrentQuotaLiters:
      (selectedFleetItem.vehicle.fuelType === 'بنزین' ? 200 : 450) +
      (selectedFleetItem.vehicle.biweeklyWaybillCount || 8) * 40,
    lastDepositDate: '۱۴۰۴/۰۶/۱۶',
    depositStatus: 'DEPOSITED',
    history: [],
  };

  const handleInquiryOnline = async () => {
    setIsInquiring(true);
    setInquirySuccessMsg(null);
    await new Promise(r => setTimeout(r, 700));
    setIsInquiring(false);
    setInquirySuccessMsg(
      `استعلام برخط سهمیه پلاک ${selectedFleetItem.vehicle.plate.part1}${selectedFleetItem.vehicle.plate.letter}${selectedFleetItem.vehicle.plate.part2} از سرور مرکزی پالایش و پخش با موفقیت به روزرسانی شد.`
    );
    setTimeout(() => setInquirySuccessMsg(null), 6000);
  };

  // Estimated extra liters based on fuel type
  const extraLitersEstimate =
    simulatedExtraWaybills * (selectedFleetItem.vehicle.fuelType === 'بنزین' ? 25 : 55);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30 mb-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            <span>سامانه پایش و استعلام سهمیه سوخت بر مبنای پیمایش (سپاد)</span>
          </div>
          <h3 className="font-black text-lg text-white">
            استعلام برخط سهمیه سوخت (پایه و عملکردی) ناوگان باری درون‌شهری
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            تخصیص سوخت خودروهای دیزل و بنزینی بر اساس ثبت باربرگ‌های رسمی در دوره‌های ۱۵ روزه محاسبه و به کارت سوخت خودرو در شرکت ملی پخش فرآورده‌های نفتی واریز می‌گردد.
          </p>
        </div>

        <button
          onClick={handleInquiryOnline}
          disabled={isInquiring}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer whitespace-nowrap self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isInquiring ? 'animate-spin' : ''}`} />
          <span>{isInquiring ? 'درحال استعلام از سپاد...' : 'استعلام برخط سهمیه از سرور سپاد'}</span>
        </button>
      </div>

      {inquirySuccessMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{inquirySuccessMsg}</span>
        </div>
      )}

      {/* Plate Selection Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>انتخاب خودرو از ناوگان صادرکننده جهت استعلام سهمیه:</span>
          </span>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="فیلتر پلاک، نام راننده یا خودرو..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full h-8 bg-slate-950 border border-slate-700 rounded-lg pr-8 pl-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Plates Carousel / Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {fleet
            .filter(f => {
              if (!searchFilter) return true;
              const term = searchFilter.toLowerCase();
              const pStr = `${f.vehicle.plate.part1}${f.vehicle.plate.letter}${f.vehicle.plate.part2}`;
              return (
                f.driver.fullName.toLowerCase().includes(term) ||
                f.vehicle.vehicleType.toLowerCase().includes(term) ||
                pStr.includes(term)
              );
            })
            .map((item, idx) => {
              const pKey = `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}`;
              const isSelected = pKey === selectedPlateStr;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedPlateStr(pKey)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer text-right ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <PlateBadge
                    plate={item.vehicle.plate}
                    tonnageKg={item.vehicle.maxLoadCapacityKg}
                    size="sm"
                  />
                  <div>
                    <span className="text-xs font-bold block">{item.vehicle.vehicleType}</span>
                    <span className="text-[10px] text-slate-400">
                      {item.driver.fullName} •{' '}
                      <strong className="text-amber-400">
                        {toPersianDigits(item.vehicle.biweeklyWaybillCount || 0)} باربرگ
                      </strong>
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Main Fuel Quota Dashboard for Selected Vehicle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Quota Details & Metrics */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Card Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <PlateBadge
                  plate={selectedFleetItem.vehicle.plate}
                  tonnageKg={selectedFleetItem.vehicle.maxLoadCapacityKg}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-white">
                      {selectedFleetItem.vehicle.vehicleType}
                    </h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      سوخت مصرفی: {selectedFleetItem.vehicle.fuelType || 'گازوئیل'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    راننده تحویل‌گیرنده:{' '}
                    <strong className="text-slate-200">{selectedFleetItem.driver.fullName}</strong> |
                    کد ملی: {toPersianDigits(selectedFleetItem.driver.nationalCode)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {activeRecord.depositStatus === 'DEPOSITED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>سهمیه واریز شده در کارت</span>
                  </span>
                ) : activeRecord.depositStatus === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>در صف واریز پایان دوره ۱۵ روزه</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>سهمیه مسدود به علت نقص مدارک</span>
                  </span>
                )}
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 block">سهمیه پایه ماهانه</span>
                <div className="text-2xl font-black font-mono text-white">
                  {toPersianDigits(activeRecord.baseQuotaLiters)}{' '}
                  <span className="text-xs font-sans text-slate-400">لیتر</span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  تخصیص استاندارد کلاس خودرو
                </span>
              </div>

              {/* Metric 2 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 block">سهمیه عملکردی (سپاد)</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded">
                    + باربرگ‌ها
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {toPersianDigits(activeRecord.performanceQuotaLiters)}{' '}
                  <span className="text-xs font-sans text-slate-400">لیتر</span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  بر اساس {toPersianDigits(selectedFleetItem.vehicle.biweeklyWaybillCount || 0)} باربرگ
                  در دوره ۱۵ روزه
                </span>
              </div>

              {/* Metric 3 */}
              <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-2">
                <span className="text-xs text-amber-300 font-bold block">
                  مجموع سهمیه واریزی این دوره
                </span>
                <div className="text-2xl font-black font-mono text-amber-400">
                  {toPersianDigits(activeRecord.totalCurrentQuotaLiters)}{' '}
                  <span className="text-xs font-sans text-slate-400">لیتر</span>
                </div>
                <span className="text-[11px] text-amber-300/80 block">
                  دوره جاری: {activeRecord.currentPeriodName}
                </span>
              </div>
            </div>

            {/* Smart Card & Fuel Card Info Details */}
            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">شماره کارت سوخت:</span>
                <span className="font-mono font-bold text-slate-200 mt-0.5 block">
                  {activeRecord.fuelCardPan}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">شناسه VIN خودرو:</span>
                <span className="font-mono text-slate-300 mt-0.5 block">
                  {selectedFleetItem.vehicle.vinNumber || 'IRN-9910482'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">کارت هوشمند خودرو:</span>
                <span className="font-mono text-slate-300 mt-0.5 block">
                  {toPersianDigits(selectedFleetItem.vehicle.smartCardNumber)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاریخ آخرین تسویه سوخت:</span>
                <span className="font-mono text-slate-300 mt-0.5 block">
                  {toPersianDigits(activeRecord.lastDepositDate)}
                </span>
              </div>
            </div>
          </div>

          {/* 15-Day Periods Historical Records Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  سوابق واریز سهمیه سوخت در دوره‌های ۱۵ روزه گذشته
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                بر اساس گزارشات سامانه سهمیه‌بندی نفت و گاز سپاد
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">دوره ۱۵ روزه</th>
                    <th className="p-3">تعداد باربرگ</th>
                    <th className="p-3">پیمایش ثبت‌شده</th>
                    <th className="p-3">سهمیه پایه</th>
                    <th className="p-3">سهمیه عملکردی</th>
                    <th className="p-3">کل سوخت واریزی</th>
                    <th className="p-3">وضعیت واریز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {activeRecord.history.length > 0 ? (
                    activeRecord.history.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-200">{h.periodName}</td>
                        <td className="p-3 font-mono text-amber-400 font-bold">
                          {toPersianDigits(h.barbargCount)} باربرگ
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {toPersianDigits(h.distanceKm.toLocaleString())} کیلومتر
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          {toPersianDigits(h.baseQuotaLiters)} لیتر
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">
                          +{toPersianDigits(h.performanceQuotaLiters)} لیتر
                        </td>
                        <td className="p-3 font-mono text-white font-black text-sm">
                          {toPersianDigits(h.totalAllocatedLiters)} لیتر
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>واریز موفق</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        سوابق واریز دوره‌های قبلی برای این پلاک به عنوان پلاک جدید در انتظار اولین سررسید دوره می‌باشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Fuel Simulator & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Action: Register with load directly to boost fuel */}
          <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <PackageCheck className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">صدور فوری باربرگ با حمل برای این پلاک</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              با صدور هر باربرگ «با حمل»، شناسه رهگیری سپاد فوراً برای این خودرو ثبت شده و سهمیه عملکردی دوره ۱۵ روزه آن افزایش می‌یابد.
            </p>
            <button
              onClick={() => onOpenCarriageModal(selectedFleetItem)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>ثبت با حمل برای پلاک {selectedFleetItem.vehicle.plate.part1}{selectedFleetItem.vehicle.plate.letter}{selectedFleetItem.vehicle.plate.part2}</span>
            </button>
          </div>

          {/* Fuel Quota Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-sm text-slate-100">
                محاسبه‌گر پیش‌بینی سهمیه سوخت سپاد
              </h4>
            </div>

            <p className="text-slate-400 leading-relaxed">
              تعداد باربرگ‌های مورد نظر برای صدور در باقیمانده دوره ۱۵ روزه را انتخاب کنید تا سوخت اضافی تخمین زده شود:
            </p>

            <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">تعداد باربرگ با حمل جدید:</span>
                <span className="font-mono font-bold text-sm text-amber-400">
                  {toPersianDigits(simulatedExtraWaybills)} باربرگ
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={simulatedExtraWaybills}
                onChange={e => setSimulatedExtraWaybills(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Estimated gain card */}
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1.5">
              <span className="text-emerald-400 font-bold block text-xs">
                سهمیه عملکردی اضافه حاصل از این باربرگ‌ها:
              </span>
              <div className="text-2xl font-black font-mono text-emerald-300">
                +{toPersianDigits(extraLitersEstimate)}{' '}
                <span className="text-xs font-sans text-emerald-400 font-normal">
                  لیتر {selectedFleetItem.vehicle.fuelType || 'گازوئیل'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مجموع سهمیه قابل برداشت در کارت سوخت پس از تایید این باربرگ‌ها به{' '}
                <strong className="text-white font-mono font-bold">
                  {toPersianDigits(activeRecord.totalCurrentQuotaLiters + extraLitersEstimate)}
                </strong>{' '}
                لیتر خواهد رسید.
              </p>
            </div>
          </div>

          {/* Sipaad Quota Rules FAQ */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs text-slate-400">
            <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>قوانین استعلام و واریز سهمیه سوخت:</span>
            </h5>
            <ul className="space-y-2 list-disc list-inside leading-relaxed text-[11px]">
              <li>
                سوخت بر اساس ثبت باربرگ و ثبت باربرگ‌های برگشتی در بازه‌های زمانی ۱ تا ۱۵ و ۱۶ تا انتهای هر ماه محاسبه می‌گردد.
              </li>
              <li>
                در صورت انقضای معاینه فنی یا پروانه اشتغال، سهمیه عملکردی آن دوره موقتاً تعلیق می‌شود.
              </li>
              <li>
                صادرکننده بارنامه مسئولیت صحت اطلاعات باربرگ جهت تخصیص سهمیه را بر عهده دارد.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
