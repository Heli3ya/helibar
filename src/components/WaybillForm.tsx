import React, { useState, useEffect } from 'react';
import { IranPlate, WaybillItem, SipaadCredentials, VehicleInfo, DriverInfo } from '../types';
import { PlateInput } from './PlateInput';
import { PlateBadge } from './PlateBadge';
import { computeSipaadSecurityHash } from '../lib/sipaadCrypto';
import { formatRials, toPersianDigits, isValidNationalCode } from '../lib/iranPlate';
import {
  FilePlus2,
  Truck,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  Building2,
  Eye,
} from 'lucide-react';

interface WaybillFormProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  config: SipaadCredentials;
  onWaybillIssued: (newWaybill: WaybillItem) => void;
  onPreviewPrint: (waybill: WaybillItem) => void;
}

export const WaybillForm: React.FC<WaybillFormProps> = ({
  fleet,
  config,
  onWaybillIssued,
  onPreviewPrint,
}) => {
  // Vehicle and Plate
  const [selectedFleetIdx, setSelectedFleetIdx] = useState<number>(0);
  const [plate, setPlate] = useState<IranPlate>(fleet[0]?.vehicle.plate || {
    part1: '43',
    letter: 'ع',
    part2: '789',
    provinceCode: '77',
    type: 'public',
  });
  const [vehicleType, setVehicleType] = useState<string>(fleet[0]?.vehicle.vehicleType || 'وانت نیسان');
  const [vehicleSmartCard, setVehicleSmartCard] = useState<string>(fleet[0]?.vehicle.smartCardNumber || '2981044');
  const [inspectionExpiry, setInspectionExpiry] = useState<string>(fleet[0]?.vehicle.technicalInspectionExpiry || '1404/08/15');
  const [insuranceNumber, setInsuranceNumber] = useState<string>(fleet[0]?.vehicle.insurancePolicyNumber || 'INS-99218-D');

  // Driver
  const [driverName, setDriverName] = useState<string>(fleet[0]?.driver.fullName || 'محمدجواد اصغری');
  const [driverNationalCode, setDriverNationalCode] = useState<string>(fleet[0]?.driver.nationalCode || '0078192341');
  const [driverMobile, setDriverMobile] = useState<string>(fleet[0]?.driver.mobile || '09124451092');
  const [driverSmartCard, setDriverSmartCard] = useState<string>(fleet[0]?.driver.smartCardNumber || 'DRV-881923');

  // Sender & Receiver
  const [senderName, setSenderName] = useState<string>('انبار مرکزی پخش کالای تهران');
  const [senderNationalId, setSenderNationalId] = useState<string>('10103829104');
  const [senderAddress, setSenderAddress] = useState<string>('تهران، جاده مخصوص کرج، کیلومتر ۱۱، شهرک استقلال');
  const [senderCity, setSenderCity] = useState<string>('تهران');

  const [receiverName, setReceiverName] = useState<string>('فروشگاه زنجیره‌ای الماس شرق');
  const [receiverNationalId, setReceiverNationalId] = useState<string>('0071928341');
  const [receiverAddress, setReceiverAddress] = useState<string>('تهران، خیابان پیروزی، بعد از چهارراه کوکاکولا');
  const [receiverCity, setReceiverCity] = useState<string>('تهران');

  // Cargo
  const [cargoDescription, setCargoDescription] = useState<string>('مواد غذایی بسته‌بندی شده و کارتن خشکبار');
  const [weightKg, setWeightKg] = useState<number>(1850);
  const [packingType, setPackingType] = useState<string>('کارتن و شرینک پالت');
  const [cargoValueRials, setCargoValueRials] = useState<number>(250000000);

  // Financials
  const [freightCostRials, setFreightCostRials] = useState<number>(14000000);
  const commissionRials = Math.round(freightCostRials * 0.1);
  const insuranceCostRials = Math.round(cargoValueRials * 0.002);
  const municipalTollRials = Math.round(freightCostRials * 0.05); // ۵٪ عوارض شهرداری حمل بار درون‌شهری
  const totalCostRials = freightCostRials + commissionRials + insuranceCostRials + municipalTollRials;

  // Live Sipaad Hashing State
  const [liveSalt, setLiveSalt] = useState<number>(84920194);
  const [liveHashedValue, setLiveHashedValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastIssued, setLastIssued] = useState<WaybillItem | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Re-calculate security hash whenever companyCode or password changes
  useEffect(() => {
    let isMounted = true;
    computeSipaadSecurityHash(config.companyCode, config.password, liveSalt).then(res => {
      if (isMounted) setLiveHashedValue(res.hashedValue);
    });
    return () => {
      isMounted = false;
    };
  }, [config.companyCode, config.password, liveSalt]);

  const handleFleetSelection = (idx: number) => {
    setSelectedFleetIdx(idx);
    const item = fleet[idx];
    if (!item) return;

    setPlate(item.vehicle.plate);
    setVehicleType(item.vehicle.vehicleType);
    setVehicleSmartCard(item.vehicle.smartCardNumber);
    setInspectionExpiry(item.vehicle.technicalInspectionExpiry);
    setInsuranceNumber(item.vehicle.insurancePolicyNumber);

    setDriverName(item.driver.fullName);
    setDriverNationalCode(item.driver.nationalCode);
    setDriverMobile(item.driver.mobile);
    setDriverSmartCard(item.driver.smartCardNumber);
  };

  const handleRegenerateSalt = () => {
    const newSalt = Math.floor(10000000 + Math.random() * 89999999);
    setLiveSalt(newSalt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!plate.part1 || !plate.part2 || !plate.provinceCode) {
      setErrorNotice('لطفاً اطلاعات پلاک خودرو را به صورت کامل وارد نمایید.');
      return;
    }

    if (!isValidNationalCode(driverNationalCode)) {
      setErrorNotice('کد ملی راننده نامعتبر است. لطفاً کد ملی ۱۰ رقمی معتبر را وارد کنید.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Idempotency key prevents duplicate issuance for same plate + company in same trip
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const idempotencyKey = `IDEMP-${config.companyCode}-${plate.part1}${plate.letter}${plate.part2}-${datePart}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const newWaybillPayload = {
        companyCode: config.companyCode,
        companyName: config.issuerTitle,
        issuerUserName: 'صادرکننده ارشد بارنامه',
        idempotencyKey,
        senderName,
        senderNationalId,
        senderAddress,
        senderCity,
        receiverName,
        receiverNationalId,
        receiverAddress,
        receiverCity,
        cargoDescription,
        weightKg: Number(weightKg),
        packingType,
        cargoValueRials: Number(cargoValueRials),
        freightCostRials: Number(freightCostRials),
        commissionRials,
        insuranceCostRials,
        municipalTollRials,
        totalCostRials,
        vehicle: {
          plate,
          vehicleType: vehicleType as any,
          smartCardNumber: vehicleSmartCard,
          technicalInspectionExpiry: inspectionExpiry,
          insurancePolicyNumber: insuranceNumber,
          maxLoadCapacityKg: 3500,
        },
        driver: {
          fullName: driverName,
          nationalCode: driverNationalCode,
          mobile: driverMobile,
          smartCardNumber: driverSmartCard,
          licenseNumber: 'B1-998201',
        },
        salt: liveSalt,
        hashedSignature: liveHashedValue,
      };

      const res = await fetch('/api/waybills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWaybillPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت بارنامه در سامانه سپاد');
      }

      setLastIssued(data.waybill);
      onWaybillIssued(data.waybill);
      handleRegenerateSalt();
    } catch (err: any) {
      setErrorNotice(err.message || 'خطا در برقراری ارتباط با وب‌سرویس سپاد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification if last issued */}
      {lastIssued && (
        <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-300 text-sm">
                بارنامه با موفقیت در سامانه سپاد (UTCMS) ثبت گردید!
              </h4>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                کد رهگیری سپاد: <span className="font-mono font-bold">{toPersianDigits(lastIssued.trackingCode)}</span> | سریال بارنامه: <span className="font-mono">{toPersianDigits(lastIssued.waybillNumber)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPreviewPrint(lastIssued)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>مشاهده و چاپ بارنامه</span>
            </button>
            <button
              onClick={() => setLastIssued(null)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
            >
              بستن پیام
            </button>
          </div>
        </div>
      )}

      {errorNotice && (
        <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Fleet Autofill Strip */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm text-slate-200">انتخاب سریع از ناوگان تعریف‌شده</span>
            </div>
            <span className="text-xs text-slate-400">
              با انتخاب هر خودرو، مشخصات پلاک، کارت هوشمند و راننده بارگذاری می‌شود
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {fleet.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleFleetSelection(idx)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                  selectedFleetIdx === idx
                    ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="w-full flex justify-between items-center mb-1.5 flex-wrap gap-1">
                  <span className="font-bold text-xs">{item.vehicle.vehicleType}</span>
                  <PlateBadge
                    plate={item.vehicle.plate}
                    tonnageKg={item.vehicle.maxLoadCapacityKg}
                    size="sm"
                  />
                </div>
                <span className="text-[11px] text-slate-400 truncate w-full">{item.driver.fullName}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form Body */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section 1: Vehicle & Driver */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>مشخصات ناوگان، پلاک و راننده</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plate input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    شماره پلاک ملی خودرو (استاندارد سپاد)
                  </label>
                  <PlateInput value={plate} onChange={setPlate} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">نوع خودرو باربری</label>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="وانت نیسان">وانت نیسان زامیاد</option>
                    <option value="کامیونت ایسوزو">کامیونت ایسوزو</option>
                    <option value="خاور ۶۰۸">خاور ۶۰۸ / ۸۰۸</option>
                    <option value="کامیون بنز تک">کامیون بنز تک</option>
                    <option value="وانت پیکان/آریسان">وانت پیکان / آریسان</option>
                    <option value="تریلر کفی شهری">تریلر کفی شهری</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">کارت هوشمند ناوگان</label>
                  <input
                    type="text"
                    value={vehicleSmartCard}
                    onChange={e => setVehicleSmartCard(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">اعتبار معاینه فنی</label>
                  <input
                    type="text"
                    value={inspectionExpiry}
                    onChange={e => setInspectionExpiry(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">نام و نام خانوادگی راننده</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">کد ملی راننده (۱۰ رقم)</label>
                  <input
                    type="text"
                    value={driverNationalCode}
                    onChange={e => setDriverNationalCode(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">شماره همراه راننده (جهت پیامک سپاد)</label>
                  <input
                    type="text"
                    value={driverMobile}
                    onChange={e => setDriverMobile(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">شماره کارت هوشمند راننده</label>
                  <input
                    type="text"
                    value={driverSmartCard}
                    onChange={e => setDriverSmartCard(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Origin & Destination */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>اطلاعات فرستنده (مبدا) و گیرنده (مقصد)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                  <span className="font-bold text-xs text-emerald-400">مشخصات فرستنده</span>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نام فرستنده / شرکت</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                      className="w-full h-9 bg-slate-900 border border-slate-700 rounded px-2.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد / شناسه ملی فرستنده</label>
                    <input
                      type="text"
                      value={senderNationalId}
                      onChange={e => setSenderNationalId(e.target.value)}
                      className="w-full h-9 bg-slate-900 border border-slate-700 rounded px-2.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نشانی دقیق مبدا</label>
                    <input
                      type="text"
                      value={senderAddress}
                      onChange={e => setSenderAddress(e.target.value)}
                      className="w-full h-9 bg-slate-900 border border-slate-700 rounded px-2.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                  <span className="font-bold text-xs text-blue-400">مشخصات گیرنده</span>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نام گیرنده / شرکت</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={e => setReceiverName(e.target.value)}
                      className="w-full h-9 bg-slate-900 border border-slate-700 rounded px-2.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد / شناسه ملی گیرنده</label>
                    <input
                      type="text"
                      value={receiverNationalId}
                      onChange={e => setReceiverNationalId(e.target.value)}
                      className="w-full h-9 bg-slate-900 border border-slate-700 rounded px-2.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نشانی دقیق مقصد</label>
                    <input
                      type="text"
                      value={receiverAddress}
                      onChange={e => setReceiverAddress(e.target.value)}
                      className="w-full h-9 bg-slate-900 border border-slate-700 rounded px-2.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Cargo Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <FilePlus2 className="w-4 h-4 text-amber-400" />
                <span>مشخصات بار و محموله</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">شرح کالا</label>
                  <input
                    type="text"
                    value={cargoDescription}
                    onChange={e => setCargoDescription(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">وزن بار (کیلوگرم)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={e => setWeightKg(Number(e.target.value))}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">نوع بسته‌بندی</label>
                  <input
                    type="text"
                    value={packingType}
                    onChange={e => setPackingType(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financials & Sipaad Cryptography Box */}
          <div className="lg:col-span-4 space-y-6">
            {/* Financial Calculator */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 border-b border-slate-800 pb-3">
                محاسبه تعرفه و عوارض شهرداری
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">کرایه پایه راننده (ریال)</label>
                  <input
                    type="number"
                    step={100000}
                    value={freightCostRials}
                    onChange={e => setFreightCostRials(Number(e.target.value))}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs font-mono text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">ارزش ریالی اظهار شده بار (جهت بیمه)</label>
                  <input
                    type="number"
                    step={10000000}
                    value={cargoValueRials}
                    onChange={e => setCargoValueRials(Number(e.target.value))}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs font-mono text-slate-100"
                  />
                </div>

                <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>حق کمیسیون صادرکننده (۱۰٪):</span>
                    <span className="font-mono text-slate-200">{formatRials(commissionRials)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>حق بیمه مسئولیت مدنی:</span>
                    <span className="font-mono text-slate-200">{formatRials(insuranceCostRials)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>عوارض شهرداری (۵٪ قانونی):</span>
                    <span className="font-mono text-amber-400 font-bold">{formatRials(municipalTollRials)}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                    <span>مجموع کل بارنامه:</span>
                    <span className="font-mono text-emerald-400">{formatRials(totalCostRials)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sipaad Cryptography & Security Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-slate-200">الگوریتم رمزنگاری سپاد (SHA-512)</span>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateSalt}
                  title="تولید Salt جدید"
                  className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>شناسه شرکت صادرکننده:</span>
                  <span className="font-mono font-bold text-slate-200">{config.companyCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>تصادفی تولید شده (Salt):</span>
                  <span className="font-mono text-amber-400 font-bold">{toPersianDigits(liveSalt)}</span>
                </div>
                <div>
                  <span className="block mb-1">امضای امنیتی نهایی (HashedValue):</span>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[9px] text-emerald-400 break-all leading-tight">
                    {liveHashedValue || 'درحال محاسبه...'}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  فرمول: <code className="text-slate-400">SHA512(CompanyCode + SHA512(Pass) + Salt)</code>
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>درحال استعلام و صدور در سپاد...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>صدور رسمی بارنامه در سامانه سپاد</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
