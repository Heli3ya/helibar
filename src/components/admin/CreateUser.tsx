import React, { useState } from 'react';
import {
  UserPlus,
  User,
  Phone,
  CreditCard,
  MapPin,
  FileText,
  Layers,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toPersianDigits } from '../../lib/iranPlate';
import { ALLOWED_PLATE_CAPACITIES, PlateCapacityOption } from './EditCapacityModal';

interface CreateUserProps {
  onSuccess: (data: {
    user_id: string;
    username: string;
    plate_capacity: number;
    message: string;
  }) => void;
  disabled?: boolean;
}

export const CreateUser: React.FC<CreateUserProps> = ({ onSuccess, disabled = false }) => {
  // Form States
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');
  const [provinceCity, setProvinceCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [plateCapacity, setPlateCapacity] = useState<PlateCapacityOption>(150);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time Input Validation: English letters, numbers, and underscore only
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/[\u0600-\u06FF]/.test(val)) {
      setErrorMessage('لطفاً برای نام کاربری کیبورد خود را انگلیسی کنید.');
    } else if (errorMessage?.includes('کیبورد خود را انگلیسی کنید')) {
      setErrorMessage(null);
    }
    const sanitized = val.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(sanitized);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/[\u0600-\u06FF]/.test(val)) {
      setErrorMessage('لطفاً برای رمز عبور کیبورد خود را انگلیسی کنید.');
    } else if (errorMessage?.includes('کیبورد خود را انگلیسی کنید')) {
      setErrorMessage(null);
    }
    const sanitized = val.replace(/[^a-zA-Z0-9_]/g, '');
    setPassword(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanFullName = fullName.trim();
    const cleanPhone = phoneNumber.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanFullName) {
      setErrorMessage('نام و نام خانوادگی الزامی است.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('شماره تماس معتبر وارد کنید (حداقل ۱۰ رقم).');
      return;
    }
    if (!cleanUsername) {
      setErrorMessage('نام کاربری الزامی است.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setErrorMessage('رمز عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }

    const englishRegex = /^[a-zA-Z0-9_]+$/;
    if (!englishRegex.test(cleanUsername) || !englishRegex.test(cleanPassword)) {
      setErrorMessage('نام کاربری و رمز عبور صرفاً می‌توانند شامل حروف انگلیسی و اعداد باشند.');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token') || 'jwt_token_00000000-0000-0000-0000-000000000000_heliya';
      const response = await fetch('/api/admin/users/create-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: cleanFullName,
          phone_number: cleanPhone,
          national_id: nationalId.trim() || undefined,
          province_city: provinceCity.trim() || undefined,
          address: address.trim() || undefined,
          plate_capacity: plateCapacity,
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'خطا در ثبت کاربر جدید.');
      }

      // Reset form
      setFullName('');
      setPhoneNumber('');
      setNationalId('');
      setProvinceCity('');
      setAddress('');
      setPlateCapacity(150);
      setUsername('');
      setPassword('');

      onSuccess({
        user_id: data.user_id,
        username: data.username,
        plate_capacity: data.plate_capacity || plateCapacity,
        message: data.message || 'پنل کاربر با موفقیت ایجاد شد.',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'خطای شبکه در اتصال به سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
        <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shrink-0">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-white">ایجاد پنل کاربر (پشتیبان / صادرکننده)</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-black shadow-xs">
              مخصوص ادمین
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            ثبت اطلاعات و فعال‌سازی فوری حساب کاربری پشتیبان همراه با تعیین سقف ظرفیت ناوگان
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-900 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Fields: Exactly the 8 required fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. نام و نام خانوادگی (Full Name) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-200">
              ۱. نام و نام خانوادگی <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: شرکت ترابری سپهر بار (حمید رضایی)"
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                disabled={isLoading || disabled}
              />
            </div>
          </div>

          {/* 2. شماره تماس (Phone Number) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-200">
              ۲. شماره تماس <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                dir="ltr"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09121234567"
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs font-mono text-left placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                disabled={isLoading || disabled}
              />
            </div>
          </div>

          {/* 3. کد ملی (National ID) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-200">
              ۳. کد ملی
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                dir="ltr"
                maxLength={10}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                placeholder="0012345678"
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs font-mono text-left placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                disabled={isLoading || disabled}
              />
            </div>
          </div>

          {/* 4. استان و شهر (Province & City) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-200">
              ۴. استان و شهر
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={provinceCity}
                onChange={(e) => setProvinceCity(e.target.value)}
                placeholder="مثال: تهران، شهریار"
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                disabled={isLoading || disabled}
              />
            </div>
          </div>
        </div>

        {/* 5. آدرس (Address - Textarea) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-neutral-200">
            ۵. آدرس پستی
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3.5" />
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="آدرس دقیق دفتر یا محل باربری مشتری..."
              className="w-full p-3 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition resize-none"
              disabled={isLoading || disabled}
            />
          </div>
        </div>

        {/* 6. ظرفیت پلاک (Plate Capacity - Select Dropdown) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-neutral-200">
            ۶. سقف ظرفیت پلاک (پکیج خریداری‌شده) <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <Layers className="w-4 h-4 text-orange-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={plateCapacity}
              onChange={(e) => setPlateCapacity(Number(e.target.value) as PlateCapacityOption)}
              className="w-full h-11 px-3.5 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition cursor-pointer"
              disabled={isLoading || disabled}
            >
              {ALLOWED_PLATE_CAPACITIES.map((cap) => (
                <option key={cap} value={cap}>
                  ظرفیت {toPersianDigits(cap)} پلاک ناوگان
                </option>
              ))}
            </select>
          </div>
          {/* Quick Buttons */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <span className="text-[11px] text-neutral-500">سقف‌های مجاز:</span>
            {ALLOWED_PLATE_CAPACITIES.map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => setPlateCapacity(cap)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  cap === plateCapacity
                    ? 'bg-orange-500 text-black shadow-xs'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {toPersianDigits(cap)}
              </button>
            ))}
          </div>
        </div>

        {/* 7 & 8: نام کاربری و رمز عبور (English only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
          {/* 7. نام کاربری (Username - English only) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-200">
              ۷. نام کاربری (صرفاً حروف و اعداد انگلیسی) <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-orange-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={handleUsernameChange}
                placeholder="username_example"
                autoComplete="off"
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs font-mono text-left placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                disabled={isLoading || disabled}
              />
            </div>
            <p className="text-[10px] text-neutral-500">حروف انگلیسی، اعداد و خط تیره زیرین (_) مجاز است.</p>
          </div>

          {/* 8. رمز عبور (Password - English only) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-200">
              ۸. رمز عبور (صرفاً حروف و اعداد انگلیسی) <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-orange-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                dir="ltr"
                value={password}
                onChange={handlePasswordChange}
                placeholder="pass1234"
                autoComplete="new-password"
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs font-mono text-left placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                disabled={isLoading || disabled}
              />
            </div>
            <p className="text-[10px] text-neutral-500">حداقل ۴ کاراکتر انگلیسی و ارقام.</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isLoading || disabled}
          className="w-full h-12 mt-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>در حال ثبت و فعال‌سازی پنل مشتری...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>ثبت و ایجاد حساب کاربری مشتری</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
