import React, { useState, useEffect } from 'react';
import { SipaadCredentials, SipaadHashCalculation, OTPRecord } from '../types';
import { computeSipaadSecurityHash, generateRandomSalt, formatSipaadJsonPayload, sha512 } from '../lib/sipaadCrypto';
import { toPersianDigits } from '../lib/iranPlate';
import {
  KeyRound,
  ShieldCheck,
  Server,
  Code2,
  Send,
  CheckCircle2,
  RefreshCw,
  Copy,
  AlertTriangle,
  Globe,
  Truck,
  MapPin,
  UserCheck,
  FileText,
  Navigation,
  Check,
  AlertCircle,
  Play,
  CheckCircle,
} from 'lucide-react';

interface SipaadIntegrationLabProps {
  config: SipaadCredentials;
  onUpdateConfig: (newConfig: SipaadCredentials) => void;
}

type LabTab = 'SECURITY' | 'BOL_FLOW' | 'DRIVER_FLEET' | 'BASE_INFO' | 'ERROR_CODES';

export const SipaadIntegrationLab: React.FC<SipaadIntegrationLabProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<LabTab>('BOL_FLOW');

  // --- Hash calculator state ---
  const [testCompanyCode, setTestCompanyCode] = useState<string>(config.companyCode || '24981');
  const [testPassword, setTestPassword] = useState<string>(config.password || 'helibar@1404');
  const [testSalt, setTestSalt] = useState<number>(generateRandomSalt());
  const [hashResult, setHashResult] = useState<SipaadHashCalculation | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // --- JSON null inspection state ---
  const [sampleOptionalValue, setSampleOptionalValue] = useState<string>('');
  const [rawJsonOutput, setRawJsonOutput] = useState<string>('');

  // --- OTP Manager state ---
  const [otpMobile, setOtpMobile] = useState<string>('09124451092');
  const [otpPurpose, setOtpPurpose] = useState<OTPRecord['purpose']>('ISSUER_AUTH');
  const [activeOtps, setActiveOtps] = useState<OTPRecord[]>([
    {
      id: 'otp-901',
      mobile: '09124451092',
      purpose: 'ISSUER_AUTH',
      otpCode: '849201',
      expiresAt: '1403/07/26 12:30:00',
      isUsed: true,
      referenceId: 'REF-SIPAAD-99120',
    },
  ]);
  const [newOtpGenerated, setNewOtpGenerated] = useState<OTPRecord | null>(null);

  // --- Connection Test state ---
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    bolStatus: 'OK' | 'FAIL' | 'IDLE';
    freighterStatus: 'OK' | 'FAIL' | 'IDLE';
    responseTimeMs: number;
    message: string;
    serverIp?: string;
    advice?: string;
  }>({
    bolStatus: 'IDLE',
    freighterStatus: 'IDLE',
    responseTimeMs: 0,
    message: '',
  });

  // --- Trip / BOL Flow states ---
  const [bolStage, setBolStage] = useState<'IDLE' | 'ISSUED' | 'STARTED' | 'TRACKING' | 'ENDED'>('IDLE');
  const [activeTrackingCode, setActiveTrackingCode] = useState<string>('');
  const [activeWaybillNumber, setActiveWaybillNumber] = useState<string>('');
  const [bolLoading, setBolLoading] = useState<boolean>(false);
  const [bolLog, setBolLog] = useState<string[]>([]);
  const [trackedPoints, setTrackedPoints] = useState<number>(0);

  // Form inputs for WS01
  const [senderName, setSenderName] = useState('شرکت پخش بهار البرز');
  const [receiverName, setReceiverName] = useState('فروشگاه زنجیره‌ای افق کوروش');
  const [cargoDesc, setCargoDesc] = useState('مواد غذایی و خشکبار');
  const [cargoWeight, setCargoWeight] = useState('2800');
  const [driverNatId, setDriverNatId] = useState('0078192341');

  // --- Driver & Fleet state ---
  const [searchNatId, setSearchNatId] = useState('0078192341');
  const [driverData, setDriverData] = useState<any>(null);
  const [fleetData, setFleetData] = useState<any>(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);

  // --- Base Info state (Provinces & Cities) ---
  const [provinces, setProvinces] = useState<Array<{ ProvinceCode: number; ProvinceName: string }>>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number>(1);
  const [cities, setCities] = useState<Array<{ CityCode: number; CityName: string }>>([]);
  const [baseInfoLoading, setBaseInfoLoading] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');

  // Re-calculate hash
  useEffect(() => {
    let active = true;
    computeSipaadSecurityHash(testCompanyCode, testPassword, testSalt).then(res => {
      if (active) setHashResult(res);
    });
    return () => {
      active = false;
    };
  }, [testCompanyCode, testPassword, testSalt]);

  // Update JSON sample output
  useEffect(() => {
    const rawPayload = {
      CompanyCode: testCompanyCode,
      WaybillNumber: '1403/10892',
      PlateNumber: '12ع345-77',
      DriverNationalCode: '0078192341',
      CargoWeightKg: 2400,
      TransitPermitCode: sampleOptionalValue || null, // Critical null rule!
      SecondaryReceiverCode: null,
      MunicipalExemptionCode: null,
      TrackingRemarks: null,
    };

    const formatted = formatSipaadJsonPayload(rawPayload, [
      'TransitPermitCode',
      'SecondaryReceiverCode',
      'MunicipalExemptionCode',
      'TrackingRemarks',
    ]);

    setRawJsonOutput(JSON.stringify(formatted, null, 2));
  }, [testCompanyCode, sampleOptionalValue]);

  // Load provinces on mount
  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    setBaseInfoLoading(true);
    try {
      const res = await fetch('/api/sipaad/WS11_GetProvinces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.Provinces) {
        setProvinces(data.Provinces);
        if (data.Provinces.length > 0) {
          fetchCities(data.Provinces[0].ProvinceCode);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBaseInfoLoading(false);
    }
  };

  const fetchCities = async (provinceCode: number) => {
    setSelectedProvinceCode(provinceCode);
    try {
      const res = await fetch('/api/sipaad/WS12_GetCities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ProvinceCode: provinceCode }),
      });
      const data = await res.json();
      if (data.Cities) {
        setCities(data.Cities);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult({
      bolStatus: 'IDLE',
      freighterStatus: 'IDLE',
      responseTimeMs: 0,
      message: 'درحال ارسال درخواست اعتبارسنجی امنیتی به وب‌سرویس سپاد...',
    });

    try {
      const res = await fetch('/api/sipaad/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: config.companyCode,
          password: config.password,
          isSandboxMode: config.isSandboxMode,
        }),
      });

      const data = await res.json();
      setTestResult({
        bolStatus: data.success ? 'OK' : 'FAIL',
        freighterStatus: data.success ? 'OK' : 'FAIL',
        responseTimeMs: data.latencyMs || 0,
        message: data.statusText || data.message || 'پاسخ از سرور دریافت شد.',
        serverIp: data.serverIp,
        advice: data.advice,
      });
    } catch (err: any) {
      setTestResult({
        bolStatus: 'FAIL',
        freighterStatus: 'FAIL',
        responseTimeMs: 0,
        message: `خطای ارتباط با سرور محلی: ${err?.message || err}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // --- Step 1: Issue BOL (WS01) ---
  const handleIssueBol = async () => {
    setBolLoading(true);
    try {
      const auth = await computeSipaadSecurityHash(testCompanyCode, testPassword);
      const res = await fetch('/api/sipaad/WS01_InsertBOL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CompanyCode: auth.companyCode,
          Salt: auth.salt,
          HashedValue: auth.hashedValue,
          BOL: {
            SenderName: senderName,
            SenderNationalId: '10103456789',
            SenderAddress: 'تهران، فتح',
            SenderCityCode: 101,
            ReceiverName: receiverName,
            ReceiverNationalId: '0078192341',
            ReceiverAddress: 'کرج، بهشتی',
            ReceiverCityCode: 201,
            CargoDescription: cargoDesc,
            CargoWeightKg: parseInt(cargoWeight, 10) || 2500,
            DriverNationalCode: driverNatId,
            DriverMobile: '09124451092',
            PlatePart1: '43',
            PlateLetter: 'ع',
            PlatePart2: '789',
            PlateProvince: '77',
          },
        }),
      });
      const data = await res.json();
      if (data.ExceptionCnt?.ErrorCode === 0) {
        setActiveTrackingCode(data.TrackingCode);
        setActiveWaybillNumber(data.WaybillNumber);
        setBolStage('ISSUED');
        setBolLog(prev => [
          `[WS01_InsertBOL] باربرگ با شماره ${data.WaybillNumber} صادر شد (کد رهگیری: ${data.TrackingCode})`,
          ...prev,
        ]);
      } else {
        alert(data.ExceptionCnt?.ErrorDesc || 'خطا در صدور باربرگ');
      }
    } catch (e: any) {
      alert(`خطای شبکه: ${e.message}`);
    } finally {
      setBolLoading(false);
    }
  };

  // --- Step 2: Start BOL (WS03) ---
  const handleStartBol = async () => {
    setBolLoading(true);
    try {
      const res = await fetch('/api/sipaad/WS03_StartBOL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TrackingCode: activeTrackingCode,
          StartDateTime: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.ExceptionCnt?.ErrorCode === 0) {
        setBolStage('STARTED');
        setBolLog(prev => [`[WS03_StartBOL] سفر باربرگ ${activeTrackingCode} رسماً آغاز گردید.`, ...prev]);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBolLoading(false);
    }
  };

  // --- Step 3: Track BOL (WS06) ---
  const handleTrackBol = async () => {
    setBolLoading(true);
    try {
      const mockGps = [
        {
          Latitude: 35.6892 + (Math.random() - 0.5) * 0.05,
          Longitude: 51.389 + (Math.random() - 0.5) * 0.05,
          SpeedKmh: 64.2,
          Timestamp: new Date().toISOString(),
        },
      ];
      const res = await fetch('/api/sipaad/WS06_InsertBOLTrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TrackingCode: activeTrackingCode,
          GPSList: mockGps,
        }),
      });
      const data = await res.json();
      if (data.ExceptionCnt?.ErrorCode === 0) {
        setTrackedPoints(p => p + 1);
        setBolStage('TRACKING');
        setBolLog(prev => [
          `[WS06_InsertBOLTrack] نقطه GPS جدید (Lat: ${mockGps[0].Latitude.toFixed(4)}, Lon: ${mockGps[0].Longitude.toFixed(4)}) ثبت شد.`,
          ...prev,
        ]);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBolLoading(false);
    }
  };

  // --- Step 4: End BOL (WS04) ---
  const handleEndBol = async () => {
    setBolLoading(true);
    try {
      const res = await fetch('/api/sipaad/WS04_EndBOL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TrackingCode: activeTrackingCode,
          EndDateTime: new Date().toISOString(),
          UnloadWeightKg: parseInt(cargoWeight, 10),
        }),
      });
      const data = await res.json();
      if (data.ExceptionCnt?.ErrorCode === 0) {
        setBolStage('ENDED');
        setBolLog(prev => [`[WS04_EndBOL] باربرگ ${activeTrackingCode} تحویل داده شد و خاتمه یافت.`, ...prev]);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBolLoading(false);
    }
  };

  // --- Driver & Fleet Inquiry (WS41 & WS42) ---
  const handleSearchDriver = async () => {
    if (searchNatId.length !== 10) {
      setDriverError('کد ملی راننده باید ۱۰ رقمی باشد.');
      return;
    }
    setDriverLoading(true);
    setDriverError(null);
    setDriverData(null);
    setFleetData(null);

    try {
      // 1. Fetch Driver (WS41)
      const resDriver = await fetch('/api/sipaad/WS41_GetDriverInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ NationalCode: searchNatId }),
      });
      const driverJson = await resDriver.json();

      // 2. Fetch Fleet (WS42)
      const resFleet = await fetch('/api/sipaad/WS42_GetFleetInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ NationalCode: searchNatId }),
      });
      const fleetJson = await resFleet.json();

      if (driverJson.ExceptionCnt?.ErrorCode === 0 && driverJson.DriverInfo) {
        setDriverData(driverJson.DriverInfo);
      } else {
        setDriverError(driverJson.ExceptionCnt?.ErrorDesc || 'راننده یافت نشد');
      }

      if (fleetJson.ExceptionCnt?.ErrorCode === 0 && fleetJson.FleetInfo) {
        setFleetData(fleetJson.FleetInfo);
      }
    } catch (e: any) {
      setDriverError(`خطای شبکه: ${e.message}`);
    } finally {
      setDriverLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Gateway Mode Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base text-slate-100">
                مرکز آزمایشگاه فنی و یکپارچه‌سازی وب‌سرویس‌های سپاد (UTCMS / SIPAAD)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              مبتنی بر سند رسمی "UTCM-WS-BOL-GUIDE (03.24)" - متدهای صدور باربرگ، رهگیری، پایه و استعلام ناوگان
            </p>
          </div>

          {/* Sandbox vs Production Toggle */}
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span
              className={`text-xs font-semibold ${
                config.isSandboxMode ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              محیط سندباکس (شبیه‌ساز رسمی)
            </span>
            <button
              onClick={() =>
                onUpdateConfig({ ...config, isSandboxMode: !config.isSandboxMode })
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                config.isSandboxMode ? 'bg-amber-500 justify-start' : 'bg-emerald-600 justify-end'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
            </button>
            <span
              className={`text-xs font-semibold ${
                !config.isSandboxMode ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              محیط عملیاتی (Live Sipaad)
            </span>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('BOL_FLOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'BOL_FLOW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>فرآیند ۴گانه حمل (WS01-WS04)</span>
          </button>

          <button
            onClick={() => setActiveTab('DRIVER_FLEET')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'DRIVER_FLEET'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>استعلام راننده و ناوگان (WS41 & WS42)</span>
          </button>

          <button
            onClick={() => setActiveTab('BASE_INFO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'BASE_INFO'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>اطلاعات پایه استان و شهر (WS11 & WS12)</span>
          </button>

          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'SECURITY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>امضای امنیتی و قانون JSON (Section 17)</span>
          </button>

          <button
            onClick={() => setActiveTab('ERROR_CODES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'ERROR_CODES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>کاتالوگ خطاهای ۴۴۵xxx سپاد</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TRIP / BOL LIFECYCLE (WS01 -> WS03 -> WS06 -> WS04) */}
      {activeTab === 'BOL_FLOW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {/* Step Progress Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div
                  className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                    bolStage !== 'IDLE' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>۱. صدور (WS01)</span>
                </div>
                <div
                  className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                    bolStage === 'STARTED' || bolStage === 'TRACKING' || bolStage === 'ENDED'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>۲. شروع (WS03)</span>
                </div>
                <div
                  className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                    bolStage === 'TRACKING' || bolStage === 'ENDED'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>۳. رهگیری (WS06)</span>
                </div>
                <div
                  className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                    bolStage === 'ENDED' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>۴. اتمام (WS04)</span>
                </div>
              </div>
            </div>

            {/* Stage Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
              {bolStage === 'IDLE' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>گام اول: صدور و درج باربرگ در وب‌سرویس مرکزی (WS01_InsertBOL)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">فرستنده</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={e => setSenderName(e.target.value)}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded px-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">گیرنده</label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={e => setReceiverName(e.target.value)}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded px-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">شرح کالا</label>
                      <input
                        type="text"
                        value={cargoDesc}
                        onChange={e => setCargoDesc(e.target.value)}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded px-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">وزن بار (کیلوگرم)</label>
                      <input
                        type="text"
                        value={cargoWeight}
                        onChange={e => setCargoWeight(e.target.value)}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded px-2 text-slate-200"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleIssueBol}
                    disabled={bolLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                  >
                    {bolLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>ارسال و صدور باربرگ رسمی (WS01_InsertBOL)</span>
                  </button>
                </div>
              )}

              {bolStage === 'ISSUED' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-lg">
                    <span className="font-bold text-blue-300 block mb-1">باربرگ صادر شده است:</span>
                    <span className="text-slate-300">کد رهگیری: </span>
                    <code className="text-amber-400 font-mono font-bold">{activeTrackingCode}</code>
                  </div>

                  <button
                    onClick={handleStartBol}
                    disabled={bolLoading}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Play className="w-4 h-4" />
                    <span>آغاز حرکت و ثبت عزیمت ناوگان (WS03_StartBOL)</span>
                  </button>
                </div>
              )}

              {(bolStage === 'STARTED' || bolStage === 'TRACKING') && (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-950/40 border border-teal-500/40 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-bold text-teal-300 block">سفر در جریان است</span>
                      <span className="text-slate-400">نقاط GPS ثبت شده: {toPersianDigits(trackedPoints)}</span>
                    </div>
                    <code className="text-amber-400 font-mono text-xs">{activeTrackingCode}</code>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleTrackBol}
                      disabled={bolLoading}
                      className="py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>ارسال مختصات GPS (WS06)</span>
                    </button>

                    <button
                      onClick={handleEndBol}
                      disabled={bolLoading}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>خاتمه و تحویل (WS04)</span>
                    </button>
                  </div>
                </div>
              )}

              {bolStage === 'ENDED' && (
                <div className="space-y-3 text-center p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-sm text-emerald-300">باربرگ با موفقیت در سپاد مختومه شد</h4>
                  <p className="text-slate-400 text-xs">
                    رسید تحویل بار و زمان تخلیه با موفقیت در سامانه باربرگ شهری به ثبت رسید.
                  </p>
                  <button
                    onClick={() => {
                      setBolStage('IDLE');
                      setActiveTrackingCode('');
                      setTrackedPoints(0);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    صدور باربرگ جدید
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Execution Logs */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-xs text-slate-200 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>لاگ زنده وب‌سرویس‌های باربرگ (REST Activity Log)</span>
            </h4>
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-slate-300 min-h-64 max-h-80 overflow-y-auto space-y-1.5">
              {bolLog.length === 0 ? (
                <span className="text-slate-600">هنوز درخواستی ارسال نشده است...</span>
              ) : (
                bolLog.map((log, idx) => (
                  <div key={idx} className="leading-relaxed border-b border-slate-900 pb-1 text-emerald-400">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVER & FLEET INQUIRY (WS41 & WS42) */}
      {activeTab === 'DRIVER_FLEET' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>استعلام اصالت راننده و ناوگان (WS41_GetDriverInfo & WS42_GetFleetInfo)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                استعلام کارت هوشمند، سهمیه سوخت و معاینه فنی از طریق کد ملی در پایگاه داده مرکزی
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="کد ملی ۱۰ رقمی راننده (مثال: 0078192341)"
              value={searchNatId}
              onChange={e => setSearchNatId(e.target.value)}
              className="w-full sm:w-80 h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-xs font-mono text-slate-100"
            />
            <button
              onClick={handleSearchDriver}
              disabled={driverLoading}
              className="w-full sm:w-auto px-5 h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {driverLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>استعلام آنلاین از سپاد</span>
            </button>
          </div>

          {driverError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-300 text-xs">
              {driverError}
            </div>
          )}

          {driverData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Driver Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">مشخصات راننده (WS41)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">
                    احراز شده
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نام و نام خانوادگی:</span>
                  <span className="font-bold text-slate-100">{driverData.FirstName} {driverData.LastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">کد ملی:</span>
                  <span className="font-mono text-slate-200">{driverData.NationalCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">شماره تماس:</span>
                  <span className="font-mono text-slate-200">{driverData.MobileNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">کارت هوشمند راننده:</span>
                  <span className="font-mono text-amber-400 font-bold">{driverData.SmartCardNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">اعتبار گواهینامه:</span>
                  <span className="text-slate-300">{driverData.LicenseValidityDate}</span>
                </div>
              </div>

              {/* Fleet Card */}
              {fleetData && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-200">اطلاعات ناوگان (WS42)</span>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 text-[10px] font-bold">
                      پلاک فعال
                    </span>
                  </div>
                  {/* Plate Display */}
                  <div className="flex justify-center py-1">
                    <div className="flex items-center border border-slate-600 bg-amber-300 text-slate-950 font-bold px-3 py-1 rounded text-sm tracking-wider">
                      <span>ایران {fleetData.PlateProvince}</span>
                      <span className="mx-2">|</span>
                      <span>{fleetData.PlatePart2} {fleetData.PlateLetter} {fleetData.PlatePart1}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">نوع خودرو:</span>
                    <span className="font-bold text-slate-100">{fleetData.VehicleType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">حداکثر تناژ مجاز:</span>
                    <span className="text-slate-200">{toPersianDigits(fleetData.TonnageKg)} کیلوگرم</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">سهمیه سوخت پایه:</span>
                    <span className="font-mono text-emerald-400 font-bold">{toPersianDigits(fleetData.FuelQuotaLiters)} لیتر</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">معاینه فنی:</span>
                    <span className="text-emerald-400 font-semibold">دارای تاییدیه قانونی</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROVINCES & CITIES BASE INFO (WS11 & WS12) */}
      {activeTab === 'BASE_INFO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span>اطلاعات پایه استان و شهرهای کشور (WS11_GetProvinces & WS12_GetCities)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                کشینگ اطلاعات پایه به منظور جلوگیری از فراخوانی مکرر وب‌سرویس و تسریع بارگذاری فرم‌ها
              </p>
            </div>
            <button
              onClick={fetchProvinces}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بروزرسانی داده‌ها</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Provinces List */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-slate-300 block mb-1">
                استان‌ها ({toPersianDigits(provinces.length)})
              </span>
              <input
                type="text"
                placeholder="جستجوی استان..."
                value={provinceSearch}
                onChange={e => setProvinceSearch(e.target.value)}
                className="w-full h-8 bg-slate-900 border border-slate-800 rounded px-2 text-slate-200"
              />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {provinces
                  .filter(p => !provinceSearch || p.ProvinceName.includes(provinceSearch))
                  .map(p => (
                    <div
                      key={p.ProvinceCode}
                      onClick={() => fetchCities(p.ProvinceCode)}
                      className={`p-2 rounded cursor-pointer flex justify-between items-center transition-colors ${
                        selectedProvinceCode === p.ProvinceCode
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <span>{p.ProvinceName}</span>
                      <span className="text-[10px] font-mono opacity-60">کد: {p.ProvinceCode}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Cities List */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-slate-300 block mb-1">
                شهرهای استان انتخاب شده ({toPersianDigits(cities.length)})
              </span>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {cities.map(c => (
                  <div
                    key={c.CityCode}
                    className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex justify-between items-center text-slate-200"
                  >
                    <span>{c.CityName}</span>
                    <span className="font-mono text-emerald-400 text-[10px]">کد شهر: {c.CityCode}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & SHA-512 (Section 17) */}
      {activeTab === 'SECURITY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-sm text-slate-100">
                    الگوریتم امضای امنیتی (Section 17 GetSHA512Hash)
                  </h4>
                </div>
                <button
                  onClick={() => setTestSalt(generateRandomSalt())}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تولید Salt جدید</span>
                </button>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">کد شرکت (CompanyCode)</label>
                  <input
                    type="text"
                    value={testCompanyCode}
                    onChange={e => setTestCompanyCode(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded px-2.5 font-mono text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رمز عبور شرکت (Password)</label>
                  <input
                    type="password"
                    value={testPassword}
                    onChange={e => setTestPassword(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded px-2.5 font-mono text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">عدد تصادفی Salt (int)</label>
                  <input
                    type="number"
                    value={testSalt}
                    onChange={e => setTestSalt(Number(e.target.value))}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded px-2.5 font-mono text-amber-400"
                  />
                </div>
              </div>

              {/* Mathematical Output */}
              {hashResult && (
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                      <span>گام ۱: هش پسورد با SHA-512</span>
                      <button
                        onClick={() => handleCopy(hashResult.passwordSha512, 'p_hash')}
                        className="text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedKey === 'p_hash' ? 'کپی شد' : 'کپی'}</span>
                      </button>
                    </div>
                    <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-slate-300 break-all leading-relaxed">
                      {hashResult.passwordSha512}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                      <span>گام ۲: الحاق متنی (CompanyCode + SHA512(Password) + Salt)</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-indigo-300 break-all leading-relaxed">
                      {hashResult.rawStringBeforeFinalHash.slice(0, 30)}...
                      {hashResult.rawStringBeforeFinalHash.slice(-20)}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                      <span className="font-bold text-amber-400">
                        گام ۳: امضای نهایی هدر درخواست (HashedValue)
                      </span>
                      <button
                        onClick={() => handleCopy(hashResult.hashedValue, 'final_hash')}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedKey === 'final_hash' ? 'کپی شد' : 'کپی'}</span>
                      </button>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-amber-500/40 rounded font-mono text-[11px] text-emerald-400 font-bold break-all leading-relaxed">
                      {hashResult.hashedValue}
                    </div>
                  </div>
                </div>
              )}

              {/* Ping Connection Button */}
              <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-all"
                >
                  {isTestingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  <span>ارسال پینگ تایید وب‌سرویس</span>
                </button>
              </div>

              {testResult.message && (
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-2.5 ${
                    testResult.bolStatus === 'OK'
                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>

                  {testResult.serverIp && (
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-300">
                      <span>آی‌پی عمومی سرور شما (جهت وایت‌لیست در سپاد):</span>
                      <span className="font-mono text-amber-400 font-bold select-all">{testResult.serverIp}</span>
                    </div>
                  )}

                  {testResult.advice && (
                    <div className="text-[11px] text-amber-300/90 leading-relaxed bg-amber-950/30 p-2 rounded border border-amber-500/20">
                      💡 <strong>راهنما:</strong> {testResult.advice}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: JSON Null Rule */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Code2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm text-slate-100">قانون بحرانی JSON سامانه سپاد</h4>
                  <p className="text-[11px] text-slate-400">
                    فیلدهای اختیاری حتماً باید مقدار <code className="text-amber-400">null</code> داشته باشند.
                  </p>
                </div>
              </div>

              <pre
                dir="ltr"
                className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-96 leading-relaxed"
              >
                {rawJsonOutput}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ERROR CODES (Sealed Class Reference) */}
      {activeTab === 'ERROR_CODES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>کاتالوگ خطاهای اختصاصی سپاد و ترجمه فارسی در Sealed Class</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              مبتنی بر استانداردهای کدهای خطا در مستند رسمی UTCM-WS-BOL-GUIDE و نگاشت شده در کلاینت کاتلین
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-right">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">کد خطا (ErrorCode)</th>
                  <th className="p-2.5">عنوان فنی و سیستمی</th>
                  <th className="p-2.5">پیام ترجمه شده در UI اپلیکیشن</th>
                  <th className="p-2.5">اقدام پیشنهادی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-300">
                <tr>
                  <td className="p-2.5 font-mono font-bold text-amber-400">445001</td>
                  <td className="p-2.5 font-mono text-slate-400">AUTH_FAILED</td>
                  <td className="p-2.5 text-rose-300">نام کاربری، رمز عبور یا امضای امنیتی (هش SHA-512) نامعتبر است.</td>
                  <td className="p-2.5 text-slate-400">بررسی CompanyCode و رمز عبور</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono font-bold text-amber-400">445002</td>
                  <td className="p-2.5 font-mono text-slate-400">ACCOUNT_BLOCKED</td>
                  <td className="p-2.5 text-rose-300">حساب کاربری شرکت ترابری مسدود یا فاقد مجوز معتبر است.</td>
                  <td className="p-2.5 text-slate-400">تماس با پشتیبانی شهرداری/سپاد</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono font-bold text-amber-400">445010</td>
                  <td className="p-2.5 font-mono text-slate-400">BOL_NOT_FOUND</td>
                  <td className="p-2.5 text-rose-300">باربرگ با این شناسه یا کد رهگیری در سرور یافت نشد.</td>
                  <td className="p-2.5 text-slate-400">بررسی مجدد کد رهگیری</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono font-bold text-amber-400">445012</td>
                  <td className="p-2.5 font-mono text-slate-400">TIME_CONFLICT</td>
                  <td className="p-2.5 text-rose-300">تداخل زمانی در ثبت سفر؛ برای این ناوگان تردد همزمان وجود دارد.</td>
                  <td className="p-2.5 text-slate-400">اتمام باربرگ باز قبل از صدور جدید</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono font-bold text-amber-400">445013</td>
                  <td className="p-2.5 font-mono text-slate-400">QUOTA_EXCEEDED</td>
                  <td className="p-2.5 text-rose-300">سقف مجاز صدور باربرگ ۱۵ روزه برای این ناوگان تکمیل شده است.</td>
                  <td className="p-2.5 text-slate-400">انتظار تا دوره بعدی</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono font-bold text-amber-400">445031</td>
                  <td className="p-2.5 font-mono text-slate-400">VALIDATION_ERROR</td>
                  <td className="p-2.5 text-rose-300">خطای اعتبارسنجی مقادیر ورودی (مختصات GPS، وزن یا فیلدهای اجباری).</td>
                  <td className="p-2.5 text-slate-400">بررسی فیلدهای ناقص و مختصات</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono font-bold text-amber-400">445041</td>
                  <td className="p-2.5 font-mono text-slate-400">DRIVER_NOT_FOUND</td>
                  <td className="p-2.5 text-rose-300">راننده در سامانه مرکزی سپاد ثبت‌نام نشده یا رمز عبور ندارد.</td>
                  <td className="p-2.5 text-slate-400">تعریف راننده در بخش افزودن راننده</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
