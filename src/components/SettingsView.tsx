import React, { useState, useEffect, useRef } from 'react';
import { SipaadCredentials, CaptchaSettings } from '../types';
import { toPersianDigits } from '../lib/iranPlate';
import {
  ShieldCheck,
  Clock,
  Cpu,
  Server,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Plus,
  Minus,
  Bot,
  ArrowLeftRight,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SettingsViewProps {
  config: SipaadCredentials;
  onUpdateConfig: (newConfig: SipaadCredentials) => void;
}

const DEFAULT_CAPTCHA_SETTINGS: CaptchaSettings = {
  enabledForLogin: true,
  enabledForHighTonnage: true,
  enabledForBatchIssuance: false,
  difficulty: 'ALPHANUMERIC_5',
  expirySeconds: 90,
  caseSensitive: false,
};

type SettingsTab = 'SCHEDULE' | 'CONCURRENCY' | 'GATEWAY' | 'CAPTCHA';

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('SCHEDULE');

  // Local config copy
  const [localConfig, setLocalConfig] = useState<SipaadCredentials>({
    ...config,
    autoRegisterIntervalMinutes: config.autoRegisterIntervalMinutes || 15,
    roundTripModeEnabled: config.roundTripModeEnabled ?? true,
    registrationServer: config.registrationServer || 'MOBILE_API',
    captchaSettings: config.captchaSettings || DEFAULT_CAPTCHA_SETTINGS,
  });

  const [captchaSettings, setCaptchaSettings] = useState<CaptchaSettings>(
    config.captchaSettings || DEFAULT_CAPTCHA_SETTINGS
  );

  const [concurrencyWorkers, setConcurrencyWorkers] = useState<number>(4);
  const [requestDelayMs, setRequestDelayMs] = useState<number>(250);
  const [showPassword, setShowPassword] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Live Captcha Playground State
  const [captchaText, setCaptchaText] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [captchaTestResult, setCaptchaTestResult] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [captchaTimer, setCaptchaTimer] = useState<number>(captchaSettings.expirySeconds);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generateNewCaptcha = () => {
    let result = '';
    const digits = '23456789';
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

    if (captchaSettings.difficulty === 'NUMERIC_4') {
      for (let i = 0; i < 4; i++) {
        result += digits.charAt(Math.floor(Math.random() * digits.length));
      }
    } else if (captchaSettings.difficulty === 'MATH_SUM') {
      const num1 = Math.floor(Math.random() * 20) + 5;
      const num2 = Math.floor(Math.random() * 15) + 3;
      result = `${num1}+${num2}`;
    } else {
      const chars = digits + letters;
      for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    setCaptchaText(result);
    setUserCaptchaInput('');
    setCaptchaTestResult('IDLE');
    setCaptchaTimer(captchaSettings.expirySeconds);
  };

  useEffect(() => {
    if (activeTab !== 'CAPTCHA') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height
      );
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.15 + Math.random() * 0.25})`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.stroke();
    }

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = captchaText.split('');
    const startX = width / (chars.length + 1);

    chars.forEach((char, index) => {
      ctx.save();
      const x = startX * (index + 1);
      const y = height / 2 + (Math.random() * 6 - 3);
      const angle = (Math.random() * 24 - 12) * (Math.PI / 180);
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(char, 0, 0);

      ctx.restore();
    });
  }, [captchaText, activeTab]);

  useEffect(() => {
    generateNewCaptcha();
  }, [captchaSettings.difficulty]);

  useEffect(() => {
    if (activeTab !== 'CAPTCHA' || captchaTimer <= 0) return;
    const interval = setInterval(() => {
      setCaptchaTimer(prev => {
        if (prev <= 1) {
          generateNewCaptcha();
          return captchaSettings.expirySeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [captchaTimer, activeTab, captchaSettings.expirySeconds]);

  const handleVerifyCaptcha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCaptchaInput) return;

    if (captchaSettings.difficulty === 'MATH_SUM') {
      const parts = captchaText.split('+');
      const expected = parseInt(parts[0], 10) + parseInt(parts[1], 10);
      if (parseInt(userCaptchaInput.trim(), 10) === expected) {
        setCaptchaTestResult('SUCCESS');
      } else {
        setCaptchaTestResult('FAILED');
      }
    } else {
      const cmpA = captchaSettings.caseSensitive ? userCaptchaInput.trim() : userCaptchaInput.trim().toUpperCase();
      const cmpB = captchaSettings.caseSensitive ? captchaText : captchaText.toUpperCase();
      if (cmpA === cmpB) {
        setCaptchaTestResult('SUCCESS');
      } else {
        setCaptchaTestResult('FAILED');
      }
    }
  };

  const handleSaveAll = () => {
    const updated: SipaadCredentials = {
      ...localConfig,
      captchaSettings,
    };
    onUpdateConfig(updated);
    setSaveNotification('تمام تنظیمات سامانه با موفقیت ذخیره گردید.');
    setTimeout(() => setSaveNotification(null), 3500);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>تنظیمات یکپارچه سامانه بارنامه شهری و سپاد</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              پیکربندی دقیق زمان‌بندی، کنترل همزمانی صف‌ها، وب‌سرویس و سپر امنیتی کپچا
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره کلیه تنظیمات</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pt-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('SCHEDULE')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SCHEDULE'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>زمان‌بندی و ثبت خودکار</span>
          </button>

          <button
            onClick={() => setActiveTab('CONCURRENCY')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CONCURRENCY'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>کنترل همزمانی و کارگرها</span>
          </button>

          <button
            onClick={() => setActiveTab('GATEWAY')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'GATEWAY'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>وب‌سرویس و امنیت سپاد</span>
          </button>

          <button
            onClick={() => setActiveTab('CAPTCHA')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CAPTCHA'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>سپر کپچا و امنیت</span>
          </button>
        </div>
      </div>

      {saveNotification && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* TAB 1: SCHEDULE & AUTOMATION */}
      {activeTab === 'SCHEDULE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>پیکربندی زمان‌بندی و دوره‌های صدور خودکار</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              تنظیم فواصل زمانی بررسی ناوگان، سوئیچ صدور دوطرفه و انتخاب گیت‌وی سامانه شهرداری
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Setting 1: Interval with Stepper */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">بازه ثبت خودکار (دقیقه):</span>
                <span className="text-xs font-mono font-black text-amber-400">
                  {toPersianDigits(localConfig.autoRegisterIntervalMinutes || 15)} دقیقه
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                مدت‌زمان توقف میان هر چرخه بررسی و صدور باربرگ جدید برای خودروهای دارای سهمیه
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setLocalConfig(prev => ({
                      ...prev,
                      autoRegisterIntervalMinutes: Math.max(5, (prev.autoRegisterIntervalMinutes || 15) - 5),
                    }))
                  }
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-base font-bold text-white">
                  {toPersianDigits(localConfig.autoRegisterIntervalMinutes || 15)}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLocalConfig(prev => ({
                      ...prev,
                      autoRegisterIntervalMinutes: Math.min(120, (prev.autoRegisterIntervalMinutes || 15) + 5),
                    }))
                  }
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Setting 2: Round Trip Mode Toggle */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">حالت صدور رفت و برگشت:</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLocalConfig(prev => ({
                      ...prev,
                      roundTripModeEnabled: !prev.roundTripModeEnabled,
                    }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    localConfig.roundTripModeEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      localConfig.roundTripModeEnabled ? 'left-1' : 'right-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                در صورت فعال بودن، برای هر سفر به صورت خودکار باربرگ برگشت با مبدأ و مقصد معکوس و زمان‌بندی استاندارد تولید می‌گردد.
              </p>
              <div className="text-[11px] text-indigo-300 font-semibold">
                وضعیت: {localConfig.roundTripModeEnabled ? 'روشن (صدور ۲ طرفه)' : 'خاموش (تک مسیره)'}
              </div>
            </div>

            {/* Setting 3: Registration Server Choice */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 md:col-span-2">
              <span className="text-xs font-bold text-slate-200 block">
                سرور ثبت وب‌سرویس سپاد شهرداری (Mobile vs Web Endpoint):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setLocalConfig(prev => ({ ...prev, registrationServer: 'MOBILE_API' }))
                  }
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                    localConfig.registrationServer === 'MOBILE_API'
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">سرور وب‌سرویس موبایل (سریع‌تر)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      درگاه سبک API مخصوص کلاینت‌های همراه با اعتبارسنجی فوری و نرخ پاسخ بالا
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLocalConfig(prev => ({ ...prev, registrationServer: 'PORTAL_WEB' }))
                  }
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                    localConfig.registrationServer === 'PORTAL_WEB'
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Globe className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">سرور پورتال مرکزی وب سپاد</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      سامانه جامع تحت وب با لاگ کامل حسابداری و تاییدیه‌های رسمی شهرداری
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONCURRENCY & WORKERS */}
      {activeTab === 'CONCURRENCY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>کنترل همزمانی و کارگرهای پردازش موازی (Concurrency Control)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              تنظیم دقیق تعداد صف‌های فعال موازی با استپر بدون خطر افت سرعت یا بلاک شدن IP
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Stepper for Workers */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">تعداد کارگرهای همزمان (Workers):</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {toPersianDigits(concurrencyWorkers)} صف موازی
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                تعداد درخواست‌های همزمان به وب‌سرویس سپاد. مقادیر پیشنهادی: ۲ تا ۸ صف همزمان.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConcurrencyWorkers(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-base font-bold text-white">
                  {toPersianDigits(concurrencyWorkers)}
                </div>
                <button
                  type="button"
                  onClick={() => setConcurrencyWorkers(prev => Math.min(16, prev + 1))}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Delay Stepper */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">تاخیر محافظتی بین درخواست‌ها:</span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {toPersianDigits(requestDelayMs)} میلی‌ثانیه
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                جلوگیری از اعمال Rate Limit و مسدودسازی موقت توسط فایروال سرور شهرداری
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRequestDelayMs(prev => Math.max(100, prev - 50))}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-base font-bold text-white">
                  {toPersianDigits(requestDelayMs)} ms
                </div>
                <button
                  type="button"
                  onClick={() => setRequestDelayMs(prev => Math.min(2000, prev + 50))}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIPAAD GATEWAY & SECURITY */}
      {activeTab === 'GATEWAY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span>اطلاعات شرکت صادرکننده و وب‌سرویس سپاد</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">کد صادرکننده (Company Code):</label>
              <input
                type="text"
                value={localConfig.companyCode}
                onChange={e => setLocalConfig({ ...localConfig, companyCode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">نام شرکت یا صادرکننده:</label>
              <input
                type="text"
                value={localConfig.issuerTitle}
                onChange={e => setLocalConfig({ ...localConfig, issuerTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">نام کاربری وب‌سرویس:</label>
              <input
                type="text"
                value={localConfig.username}
                onChange={e => setLocalConfig({ ...localConfig, username: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">کلمه عبور وب‌سرویس:</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={localConfig.password}
                  onChange={e => setLocalConfig({ ...localConfig, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Official barname.utcms.ir Gateway Integration Info */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                آدرس‌های رسمی وب‌سرویس بارنامه شهری (barname.utcms.ir)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                پروتکل رسمی SOAP 1.1 / WCF
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400">وب‌سرویس صدور سند حمل بار (ITMBOL):</div>
                <div className="font-mono text-emerald-400 font-bold select-all text-xs" dir="ltr">
                  https://barname.utcms.ir/ITMBOL.asmx
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400">وب‌سرویس استعلام باربر و ناوگان (ITMFreighter):</div>
                <div className="font-mono text-amber-400 font-bold select-all text-xs" dir="ltr">
                  https://barname.utcms.ir/ITMFreighter.asmx
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
              <span className="font-bold">شرط برقراری اتصال زنده: </span>
              آی‌پی سرور سایت شما (helibar.ir) باید در پرتال مدیریت بارنامه شهری (barname.utcms.ir) در لیست سفید (Whitelist) قرار گرفته باشد و سرور در داخل ایران میزبانی شده باشد.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CAPTCHA & SECURITY */}
      {activeTab === 'CAPTCHA' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              <span>تنظیمات و تست تعاملی کپچا (Live Captcha Simulator)</span>
            </h3>
          </div>

          {/* Canvas & Live Simulator */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                <canvas ref={canvasRef} width={200} height={52} className="block cursor-pointer" />
              </div>
              <button
                onClick={generateNewCaptcha}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                title="تولید تصویر جدید"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="text-right sm:text-left text-xs space-y-1">
              <div className="text-slate-400">
                اعتبار کد امنیتی فعلی:
                <strong className="text-amber-400 font-mono mr-1.5">
                  {toPersianDigits(captchaTimer)} ثانیه
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block">
                دارای پارازیت نویز و اعوجاج استاندارد بانکی
              </span>
            </div>
          </div>

          {/* Test verification */}
          <form onSubmit={handleVerifyCaptcha} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              تست صحت‌سنجی کپچا:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={
                  captchaSettings.difficulty === 'MATH_SUM'
                    ? 'حاصل جمع دو عدد...'
                    : 'کد امنیتی بالا را وارد کنید...'
                }
                value={userCaptchaInput}
                onChange={e => {
                  setUserCaptchaInput(e.target.value);
                  setCaptchaTestResult('IDLE');
                }}
                className="flex-1 h-10 bg-slate-950 border border-slate-700 rounded-xl px-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500 tracking-widest text-center"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                بررسی اعتبار
              </button>
            </div>

            {captchaTestResult === 'SUCCESS' && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">کد امنیتی با موفقیت تایید شد. دسترسی مجاز است.</span>
              </div>
            )}

            {captchaTestResult === 'FAILED' && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-bold">کد امنیتی وارد شده نادرست است!</span>
              </div>
            )}
          </form>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-800">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">سطح دشواری کپچا:</label>
              <select
                value={captchaSettings.difficulty}
                onChange={e =>
                  setCaptchaSettings({
                    ...captchaSettings,
                    difficulty: e.target.value as CaptchaSettings['difficulty'],
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="ALPHANUMERIC_5">حروف و اعداد ترکیبی (۵ کاراکتر)</option>
                <option value="NUMERIC_4">فقط عددی ۴ رقمی</option>
                <option value="MATH_SUM">معادله ریاضی ساده (جمع دو عدد)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">زمان انقضا (ثانیه):</label>
              <input
                type="number"
                min={30}
                max={300}
                value={captchaSettings.expirySeconds}
                onChange={e =>
                  setCaptchaSettings({
                    ...captchaSettings,
                    expirySeconds: parseInt(e.target.value, 10) || 90,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
