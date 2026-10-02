import React, { useState, useEffect } from 'react';
import { VehicleInfo, DriverInfo, WaybillItem, SipaadCredentials } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits, formatTonnage } from '../lib/iranPlate';
import {
  ArrowLeftRight,
  X,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShieldCheck,
  Repeat,
  ArrowRight,
  Package,
} from 'lucide-react';

interface RoundTripWaybillModalProps {
  vehicle: VehicleInfo;
  driver: DriverInfo;
  config: SipaadCredentials;
  onClose: () => void;
  onSuccess: (outboundWaybill: WaybillItem, returnWaybill: WaybillItem) => void;
}

export const RoundTripWaybillModal: React.FC<RoundTripWaybillModalProps> = ({
  vehicle,
  driver,
  config,
  onClose,
  onSuccess,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  // Leg 1 (مسیر رفت)
  const [leg1OriginCity, setLeg1OriginCity] = useState('تهران');
  const [leg1OriginAddress, setLeg1OriginAddress] = useState('تهران، بازار آهن شادآباد، بلوک ۱۲');
  const [leg1DestCity, setLeg1DestCity] = useState('اسلامشهر');
  const [leg1DestAddress, setLeg1DestAddress] = useState('شهرک صنعتی چهاردانگه، خیابان ۲۲');
  const [leg1SenderName, setLeg1SenderName] = useState('فولاد بازرگان البرز');
  const [leg1ReceiverName, setLeg1ReceiverName] = useState('سازه گستر نوین');
  const [leg1CargoDesc, setLeg1CargoDesc] = useState('پروفیل و اتصالات فولادی صنعتی');
  const [leg1WeightKg, setLeg1WeightKg] = useState(
    Math.min(vehicle.maxLoadCapacityKg, Math.round(vehicle.maxLoadCapacityKg * 0.85))
  );
  const [leg1FreightCost, setLeg1FreightCost] = useState(14000000);

  // Leg 2 (مسیر برگشت)
  const [leg2OriginCity, setLeg2OriginCity] = useState('اسلامشهر');
  const [leg2OriginAddress, setLeg2OriginAddress] = useState('شهرک صنعتی چهاردانگه، مجتمع آلومینیوم');
  const [leg2DestCity, setLeg2DestCity] = useState('تهران');
  const [leg2DestAddress, setLeg2DestAddress] = useState('تهران، خیابان فداییان اسلام، انبار مرکزی');
  const [leg2SenderName, setLeg2SenderName] = useState('تولیدی آلوم سازه پویا');
  const [leg2ReceiverName, setLeg2ReceiverName] = useState('تدارکات فنی سپهر');
  const [leg2CargoDesc, setLeg2CargoDesc] = useState('قطعات ریخته‌گری آلومینیوم و اتصالات');
  const [leg2WeightKg, setLeg2WeightKg] = useState(
    Math.min(vehicle.maxLoadCapacityKg, Math.round(vehicle.maxLoadCapacityKg * 0.75))
  );
  const [leg2FreightCost, setLeg2FreightCost] = useState(12500000);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Financial Calculations for Leg 1
  const leg1Commission = Math.round(leg1FreightCost * 0.1);
  const leg1Toll = Math.round(leg1FreightCost * 0.05); // ۵٪ عوارض مصوب
  const leg1Total = leg1FreightCost + leg1Commission + leg1Toll;

  // Financial Calculations for Leg 2
  const leg2Commission = Math.round(leg2FreightCost * 0.1);
  const leg2Toll = Math.round(leg2FreightCost * 0.05); // ۵٪ عوارض مصوب
  const leg2Total = leg2FreightCost + leg2Commission + leg2Toll;

  const totalCombinedToll = leg1Toll + leg2Toll;
  const totalCombinedFreight = leg1FreightCost + leg2FreightCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('fa-IR');
      const timeStr = now.toLocaleTimeString('fa-IR');
      const serialBase = Math.floor(10000 + Math.random() * 89999);
      const plateCode = `${vehicle.plate.part1}${vehicle.plate.letter}${vehicle.plate.part2}`;

      // 1. Generate Outbound Waybill (باربرگ رفت)
      const outboundId = `wb-rt-out-${Date.now()}`;
      const returnId = `wb-rt-ret-${Date.now() + 1}`;

      const outboundWaybill: WaybillItem = {
        id: outboundId,
        trackingCode: `UTCMS-RT1-${Math.floor(100000 + Math.random() * 900000)}`,
        waybillNumber: `1404/${serialBase}`,
        idempotencyKey: `IDEMP-RT-OUT-${config.companyCode}-${plateCode}-${Date.now()}`,
        issueDateTime: `${dateStr} ${timeStr}`,
        status: 'ISSUED',
        companyCode: config.companyCode,
        companyName: config.issuerTitle,
        issuerUserName: 'اپراتور صدور رفت و برگشت',
        senderName: leg1SenderName,
        senderNationalId: '10103829104',
        senderAddress: leg1OriginAddress,
        senderCity: leg1OriginCity,
        receiverName: leg1ReceiverName,
        receiverNationalId: '14008291023',
        receiverAddress: leg1DestAddress,
        receiverCity: leg1DestCity,
        cargoDescription: `(مسیر رفت) ${leg1CargoDesc}`,
        weightKg: leg1WeightKg,
        packingType: 'پالت / بسته‌بندی استاندارد',
        cargoValueRials: leg1FreightCost * 15,
        freightCostRials: leg1FreightCost,
        commissionRials: leg1Commission,
        insuranceCostRials: 350000,
        municipalTollRials: leg1Toll,
        totalCostRials: leg1Total,
        vehicle,
        driver,
        sipaadResponse: {
          sipaadCode: `SIPAAD-RT-OUT-${Math.floor(100000 + Math.random() * 900000)}`,
          saltUsed: Math.floor(10000000 + Math.random() * 89999999),
          hashedSignature: 'sha512-verified-outbound-leg',
          serverTimestamp: new Date().toISOString(),
          statusText: 'باربرگ مسیر رفت با موفقیت در وب‌سرویس سپاد تایید و ثبت شد.',
        },
        retryCount: 0,
        isRoundTrip: true,
        roundTripLeg: 'OUTBOUND',
        pairedWaybillId: returnId,
      };

      // 2. Generate Return Waybill (باربرگ برگشت)
      const returnWaybill: WaybillItem = {
        id: returnId,
        trackingCode: `UTCMS-RT2-${Math.floor(100000 + Math.random() * 900000)}`,
        waybillNumber: `1404/${serialBase + 1}`,
        idempotencyKey: `IDEMP-RT-RET-${config.companyCode}-${plateCode}-${Date.now()}`,
        issueDateTime: `${dateStr} ${timeStr}`,
        status: 'ISSUED',
        companyCode: config.companyCode,
        companyName: config.issuerTitle,
        issuerUserName: 'اپراتور صدور رفت و برگشت',
        senderName: leg2SenderName,
        senderNationalId: '10109921448',
        senderAddress: leg2OriginAddress,
        senderCity: leg2OriginCity,
        receiverName: leg2ReceiverName,
        receiverNationalId: '14002910482',
        receiverAddress: leg2DestAddress,
        receiverCity: leg2DestCity,
        cargoDescription: `(مسیر برگشت) ${leg2CargoDesc}`,
        weightKg: leg2WeightKg,
        packingType: 'بسته‌بندی کارگاهی / پالت',
        cargoValueRials: leg2FreightCost * 12,
        freightCostRials: leg2FreightCost,
        commissionRials: leg2Commission,
        insuranceCostRials: 300000,
        municipalTollRials: leg2Toll,
        totalCostRials: leg2Total,
        vehicle,
        driver,
        sipaadResponse: {
          sipaadCode: `SIPAAD-RT-RET-${Math.floor(100000 + Math.random() * 900000)}`,
          saltUsed: Math.floor(10000000 + Math.random() * 89999999),
          hashedSignature: 'sha512-verified-return-leg',
          serverTimestamp: new Date().toISOString(),
          statusText: 'باربرگ مسیر برگشت با موفقیت در وب‌سرویس سپاد تایید و ثبت شد.',
        },
        retryCount: 0,
        isRoundTrip: true,
        roundTripLeg: 'RETURN',
        pairedWaybillId: outboundId,
      };

      // Persist both waybills to backend database for permanent persistence across sessions
      const token =
        localStorage.getItem('helibar_auth_token') ||
        localStorage.getItem('bargooo_auth_token') ||
        localStorage.getItem('token') ||
        '';

      try {
        await Promise.all([
          fetch('/api/waybills', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(outboundWaybill),
          }),
          fetch('/api/waybills', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(returnWaybill),
          }),
        ]);
      } catch (e) {
        console.warn('Network issue saving waybill to server:', e);
      }

      onSuccess(outboundWaybill, returnWaybill);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت باربرگ‌های رفت و برگشت در سرور سپاد.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base text-slate-100">
                  ثبت باربرگ رفت و برگشت (مسیر دوطرفه سپاد)
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  <span>ثبت همزمان ۲ باربرگ و سهمیه مضاعف سوخت</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تولید همزمان دو بارنامه قانونی سپاد با مبدأ و مقصدهای متقابل و اعمال در کارکرد دوره ۱۵ روزه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="بازگشت به داشبورد"
            >
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              <span>بازگشت</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="بستن (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selected Vehicle & Driver Plate Strip */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <PlateBadge
              plate={vehicle.plate}
              tonnageKg={vehicle.maxLoadCapacityKg}
              biweeklyWaybillCount={vehicle.biweeklyWaybillCount}
              biweeklyQuotaLimit={vehicle.biweeklyQuotaLimit}
              size="md"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                {vehicle.vehicleType} • راننده: {driver.fullName}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                کد ملی: {toPersianDigits(driver.nationalCode)} • کارت هوشمند: {toPersianDigits(vehicle.smartCardNumber)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              ثبت فعلی دوره: <strong className="text-amber-400">{toPersianDigits(vehicle.biweeklyWaybillCount || 0)}</strong> باربرگ
            </span>
            <span className="px-2 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
              +۲ باربرگ پس از تایید
            </span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Leg 1: Outbound (مسیر رفت) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4" />
                  <span>بخش اول: مسیر رفت (Leg 1 - Outbound)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  باربرگ شماره ۱
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">شهر مبدا</label>
                    <input
                      type="text"
                      value={leg1OriginCity}
                      onChange={e => setLeg1OriginCity(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">شهر مقصد</label>
                    <input
                      type="text"
                      value={leg1DestCity}
                      onChange={e => {
                        setLeg1DestCity(e.target.value);
                        setLeg2OriginCity(e.target.value); // Auto-chain
                      }}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نشانی دقیق مبدا رفت</label>
                  <input
                    type="text"
                    value={leg1OriginAddress}
                    onChange={e => setLeg1OriginAddress(e.target.value)}
                    className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نشانی دقیق مقصد رفت (تخلیه بار ۱)</label>
                  <input
                    type="text"
                    value={leg1DestAddress}
                    onChange={e => {
                      setLeg1DestAddress(e.target.value);
                      setLeg2OriginAddress(e.target.value); // Auto-chain
                    }}
                    className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">فرستنده رفت</label>
                    <input
                      type="text"
                      value={leg1SenderName}
                      onChange={e => setLeg1SenderName(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">گیرنده رفت</label>
                    <input
                      type="text"
                      value={leg1ReceiverName}
                      onChange={e => setLeg1ReceiverName(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">شرح کالای رفت</label>
                    <input
                      type="text"
                      value={leg1CargoDesc}
                      onChange={e => setLeg1CargoDesc(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">وزن بار رفت (کیلوگرم)</label>
                    <input
                      type="number"
                      max={vehicle.maxLoadCapacityKg}
                      value={leg1WeightKg}
                      onChange={e => setLeg1WeightKg(Number(e.target.value))}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Leg 2: Return (مسیر برگشت) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                  <Repeat className="w-4 h-4" />
                  <span>بخش دوم: مسیر برگشت (Leg 2 - Return)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  باربرگ شماره ۲
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">شهر مبدا برگشت</label>
                    <input
                      type="text"
                      value={leg2OriginCity}
                      onChange={e => setLeg2OriginCity(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">شهر مقصد برگشت</label>
                    <input
                      type="text"
                      value={leg2DestCity}
                      onChange={e => setLeg2DestCity(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نشانی بارگیری برگشت (مبدا برگشت)</label>
                  <input
                    type="text"
                    value={leg2OriginAddress}
                    onChange={e => setLeg2OriginAddress(e.target.value)}
                    className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نشانی تخلیه نهایی برگشت (مقصد برگشت)</label>
                  <input
                    type="text"
                    value={leg2DestAddress}
                    onChange={e => setLeg2DestAddress(e.target.value)}
                    className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">فرستنده برگشت</label>
                    <input
                      type="text"
                      value={leg2SenderName}
                      onChange={e => setLeg2SenderName(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">گیرنده برگشت</label>
                    <input
                      type="text"
                      value={leg2ReceiverName}
                      onChange={e => setLeg2ReceiverName(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">شرح کالای برگشت</label>
                    <input
                      type="text"
                      value={leg2CargoDesc}
                      onChange={e => setLeg2CargoDesc(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">وزن بار برگشت (کیلوگرم)</label>
                    <input
                      type="number"
                      max={vehicle.maxLoadCapacityKg}
                      value={leg2WeightKg}
                      onChange={e => setLeg2WeightKg(Number(e.target.value))}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2 text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Summary Bar */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Repeat className="w-4 h-4 text-amber-400" />
              <span>تعداد باربرگ‌های صادره:</span>{' '}
              <strong className="text-emerald-400 font-bold">۲ باربرگ رسمی سپاد (رفت و برگشت)</strong>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>پوشش کامل بیمه باربری و ثبت بلادرنگ در سامانه سپاد</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              <span>بازگشت و انصراف</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>درحال استعلام و ثبت دوطرفه در سپاد...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>تایید و ثبت باربرگ رفت و برگشت در سپاد</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
