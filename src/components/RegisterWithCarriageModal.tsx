import React, { useState, useEffect } from 'react';
import { VehicleInfo, DriverInfo, WaybillItem, SipaadCredentials } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits, formatRials, formatTomans } from '../lib/iranPlate';
import {
  Truck,
  PackageCheck,
  MapPin,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface RegisterWithCarriageModalProps {
  vehicle: VehicleInfo;
  driver: DriverInfo;
  config: SipaadCredentials;
  onClose: () => void;
  onSuccess: (newWaybill: WaybillItem) => void;
  onPrint?: (waybill: WaybillItem) => void;
}

export const RegisterWithCarriageModal: React.FC<RegisterWithCarriageModalProps> = ({
  vehicle,
  driver,
  config,
  onClose,
  onSuccess,
  onPrint,
}) => {
  const [cargoDescription, setCargoDescription] = useState<string>('مواد غذایی و اقلام سوپرمارکتی بسته‌بندی');
  const [weightKg, setWeightKg] = useState<number>(Math.min(vehicle.maxLoadCapacityKg, 1850));
  const [originAddress, setOriginAddress] = useState<string>('تهران، انبار مرکزی غرب، کیلومتر ۱۱ جاده مخصوص');
  const [destinationAddress, setDestinationAddress] = useState<string>('تهران، بازار بزرگ، خیابان خیام، پلاک ۱۱۸');
  const [freightCostRials, setFreightCostRials] = useState<number>(18500000); // ۱,۸۵۰,۰۰۰ تومان
  const [senderName, setSenderName] = useState<string>('شرکت پخش سلامت پارس');
  const [receiverName, setReceiverName] = useState<string>('فروشگاه زنجیره‌ای الماس');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdWaybill, setCreatedWaybill] = useState<WaybillItem | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const municipalTollRials = Math.round(freightCostRials * 0.05); // ۵٪ عوارض شهرداری
  const totalCostRials = freightCostRials + municipalTollRials;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate Sipaad API latency (300-500ms)
    await new Promise(r => setTimeout(r, 450));

    const trackingNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    const waybillNum = `WB-${config.companyCode}-${Date.now().toString().slice(-6)}`;
    const nowFa = new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const newWb: WaybillItem = {
      id: `wb-${Date.now()}`,
      waybillNumber: waybillNum,
      trackingCode: trackingNum,
      idempotencyKey: `IDEMP-CARRIAGE-${vehicle.plate.part1}${vehicle.plate.letter}${vehicle.plate.part2}-${Date.now()}`,
      issueDateTime: nowFa,
      status: 'ISSUED',
      companyCode: config.companyCode,
      companyName: config.issuerTitle,
      issuerUserName: config.username,
      senderName,
      senderNationalId: '10102938475',
      senderAddress: originAddress,
      senderCity: 'تهران',
      receiverName,
      receiverNationalId: '0071928374',
      receiverAddress: destinationAddress,
      receiverCity: 'تهران',
      cargoDescription,
      weightKg,
      packingType: 'کارتن / پالت',
      cargoValueRials: 50000000,
      freightCostRials,
      commissionRials: 0,
      insuranceCostRials: 0,
      municipalTollRials,
      totalCostRials,
      vehicle: { ...vehicle },
      driver: { ...driver },
      retryCount: 0,
      sipaadResponse: {
        sipaadCode: trackingNum,
        saltUsed: Math.floor(10000 + Math.random() * 89999),
        hashedSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        serverTimestamp: new Date().toISOString(),
        statusText: 'باربرگ با حمل با موفقیت در سامانه سپاد صادر و ثبت شد.',
      },
    };

    setIsSubmitting(false);
    setCreatedWaybill(newWb);
    onSuccess(newWb);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl relative text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base text-slate-100">
                  ثبت باربرگ با حمل (صدور فوری حمل بار)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  برخط سپاد
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصیص آنی بار، محاسبه عوارض شهرداری و افزایش سهمیه سوخت دوره ۱۵ روزه
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
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="بستن (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selected Plate & Driver Banner */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                {vehicle.vehicleType}
              </span>
              <span className="text-[11px] text-slate-400">
                راننده: <strong className="text-slate-200">{driver.fullName}</strong> (کد ملی: {toPersianDigits(driver.nationalCode)})
              </span>
            </div>
          </div>

          <div className="text-left font-mono text-xs">
            <span className="text-[11px] text-slate-400 block font-sans">
              عملکرد ۱۵ روزه پلاک:
            </span>
            <span className="font-bold text-amber-400">
              {toPersianDigits(vehicle.biweeklyWaybillCount || 0)} باربرگ ثبت شده
            </span>
          </div>
        </div>

        {/* Success Confirmation State */}
        {createdWaybill ? (
          <div className="p-5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h5 className="text-base font-bold text-emerald-300">
                باربرگ با حمل با موفقیت در سپاد صادر شد
              </h5>
              <p className="text-xs text-slate-300 mt-1">
                کد رهگیری سپاد: <span className="font-mono font-bold text-amber-400 text-sm">{toPersianDigits(createdWaybill.trackingCode || '')}</span>
              </p>
              <p className="text-[11px] text-emerald-400/90 mt-1">
                یک شماره به عملکرد ۱۵ روزه این پلاک اضافه شد و پیمایش برای سهمیه سوخت لحاظ گردید.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              {onPrint && (
                <button
                  onClick={() => {
                    onPrint(createdWaybill);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>چاپ رسمی باربرگ</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  شرح محموله و نوع بار
                </label>
                <input
                  type="text"
                  required
                  value={cargoDescription}
                  onChange={e => setCargoDescription(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  وزن بار (کیلوگرم) - حداکثر مجاز: {toPersianDigits(vehicle.maxLoadCapacityKg)} ک‌گ
                </label>
                <input
                  type="number"
                  required
                  max={vehicle.maxLoadCapacityKg}
                  value={weightKg}
                  onChange={e => setWeightKg(Number(e.target.value))}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg px-3 font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  مبدأ بارگیری (آدرس شهری)
                </label>
                <input
                  type="text"
                  required
                  value={originAddress}
                  onChange={e => setOriginAddress(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  مقصد تخلیه (آدرس شهری)
                </label>
                <input
                  type="text"
                  required
                  value={destinationAddress}
                  onChange={e => setDestinationAddress(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  نام فرستنده کالا
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  نام گیرنده کالا
                </label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Cost & Municipal Toll Summary */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">کرایه خالص حمل (ریال):</span>
                <input
                  type="number"
                  step="100000"
                  value={freightCostRials}
                  onChange={e => setFreightCostRials(Number(e.target.value))}
                  className="w-44 h-8 bg-slate-900 border border-slate-700 rounded px-2 text-left font-mono text-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">عوارض قانونی شهرداری (۵٪):</span>
                <span className="font-mono text-slate-300">{formatRials(municipalTollRials)}</span>
              </div>

              <div className="flex items-center justify-between font-bold pt-1 border-t border-slate-800">
                <span className="text-slate-200">مجموع کل بارنامه:</span>
                <span className="font-mono text-emerald-400">{formatTomans(totalCostRials)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700"
              >
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                <span>بازگشت و انصراف</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition-all cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'درحال ثبت و استعلام در سپاد...' : 'تایید و صدور برخط باربرگ با حمل'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
