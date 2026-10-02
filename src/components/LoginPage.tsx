import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, AuthUser, SipaadCredentials } from '../types';
import { ThemeToggleMinimal } from './ThemeToggleMinimal';
import { CapacityBadge } from './CapacityBadge';
import { toEnglishDigits } from '../lib/iranPlate';
import {
  ShieldCheck,
  Headphones,
  Truck,
  RotateCw,
  Eye,
  EyeOff,
  LogIn,
  Zap,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, isSandbox: boolean) => void;
  initialConfig?: SipaadCredentials;
  currentPlateCount?: number;
  maxPlateCapacity?: number;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  initialConfig,
  currentPlateCount = 120,
  maxPlateCapacity = 150,
}) => {
  // Roles: ادمین (Admin), پشتیبان (Support), راننده (Driver)
  const [selectedRole, setSelectedRole] = useState<UserRole>('SUPPORT');

  // Exactly 3 inputs - Clean and empty for real user entry
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('8429');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate random 4-digit captcha
  const refreshCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
    setCaptchaInput('');
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  // Change role without altering user credentials
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleUsernameChange = (val: string) => {
    if (/[\u0600-\u06FF]/.test(val)) {
      setErrorMessage('لطفاً کیبورد خود را انگلیسی کنید.');
    } else if (errorMessage === 'لطفاً کیبورد خود را انگلیسی کنید.') {
      setErrorMessage(null);
    }
    const filtered = val.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(filtered);
  };

  const handlePasswordChange = (val: string) => {
    if (/[\u0600-\u06FF]/.test(val)) {
      setErrorMessage('لطفاً کیبورد خود را انگلیسی کنید.');
    } else if (errorMessage === 'لطفاً کیبورد خود را انگلیسی کنید.') {
      setErrorMessage(null);
    }
    const filtered = val.replace(/[^a-zA-Z0-9_]/g, '');
    setPassword(filtered);
  };

  // Login handler with strict Admin enforcement
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = toEnglishDigits(username).trim();
    const cleanPass = toEnglishDigits(password).trim();
    const cleanCaptcha = toEnglishDigits(captchaInput).trim();
    const cleanTargetCaptcha = toEnglishDigits(captchaCode).trim();

    if (!cleanUser) {
      setErrorMessage('نامعتبر');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('نامعتبر');
      return;
    }

    // STRICT ANTI-IDOR & ADMIN RESTRICTION:
    // 1. If username is 'admin', strictly block it!
    if (cleanUser.toLowerCase() === 'admin') {
      setErrorMessage('نامعتبر');
      refreshCaptcha();
      return;
    }

    // 2. If trying to log in as heliya (ADMIN):
    if (cleanUser.toLowerCase() === 'heliya') {
      if (cleanPass !== 'heliya84') {
        setErrorMessage('نامعتبر');
        refreshCaptcha();
        return;
      }
    }

    if (cleanCaptcha !== cleanTargetCaptcha) {
      setErrorMessage('نامعتبر');
      refreshCaptcha();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass,
          captcha_code: cleanCaptcha,
          captcha_id: 'local',
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        setIsLoading(false);
        setErrorMessage(resData.detail || 'نامعتبر');
        refreshCaptcha();
        return;
      }

      // Security check on the returned user role:
      const authUser = resData.user;
      if (authUser.role === 'ADMIN' && authUser.username !== 'heliya') {
        setIsLoading(false);
        setErrorMessage('نامعتبر');
        refreshCaptcha();
        return;
      }

      // Save token
      if (resData.access_token) {
        localStorage.setItem('helibar_auth_token', resData.access_token);
      }

      let roleTitle = 'مدیر ارشد صدور بارنامه';
      let companyName = 'سامانه هلی‌بار';
      let permitNumber = 'TEH-994821';
      let companyCode = initialConfig?.companyCode || '90421';

      if (authUser.role === 'SUPPORT') {
        roleTitle = 'پشتیبان عملیاتی صدور (واحد تهران)';
      } else if (authUser.role === 'DRIVER') {
        roleTitle = 'راننده ناوگان ترابری';
        companyName = 'ناوگان حمل شهری';
        permitNumber = 'DRV-881923';
      }

      const user: AuthUser = {
        id: authUser.id || `usr-${Date.now()}`,
        companyCode,
        companyName,
        nationalId: '10103849102',
        username: authUser.username,
        fullName: authUser.full_name || authUser.fullName || authUser.username,
        mobile: authUser.mobile || (authUser.role === 'DRIVER' ? authUser.username : '09121111111'),
        permitNumber,
        role: authUser.role as UserRole,
        roleTitle,
        plateCapacity: authUser.plate_capacity || authUser.plateCapacity || 150,
        is_active: authUser.is_active ?? true,
        days_left: authUser.days_left,
        created_at: authUser.created_at,
        lastLoginAt:
          new Date().toLocaleDateString('fa-IR') +
          ' ' +
          new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };

      if (typeof window !== 'undefined') {
        if (authUser.role === 'ADMIN') {
          window.history.pushState({ role: 'ADMIN' }, '', '/admin/dashboard');
        } else if (authUser.role === 'SUPPORT') {
          window.history.pushState({ role: 'SUPPORT' }, '', '/dashboard');
        } else if (authUser.role === 'DRIVER') {
          window.history.pushState({ role: 'DRIVER' }, '', '/otp/driver-input');
        }
      }

      setIsLoading(false);
      onLoginSuccess(user, false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور.');
      refreshCaptcha();
    }
  };

  const roleOptions: { role: UserRole; title: string; icon: React.ReactNode }[] = [
    {
      role: 'ADMIN',
      title: 'ادمین',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      role: 'SUPPORT',
      title: 'صادر کننده',
      icon: <Headphones className="w-5 h-5" />,
    },
    {
      role: 'DRIVER',
      title: 'راننده',
      icon: <Truck className="w-5 h-5" />,
    },
  ];

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full flex flex-col justify-between bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white selection:bg-orange-500 selection:text-black transition-colors duration-200 font-sans"
    >
      {/* Global Header */}
      <header className="w-full border-b border-gray-200 dark:border-neutral-800 bg-white/90 dark:bg-black/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand: helibar | هلی‌بار */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-black font-black shadow-md shadow-orange-500/20">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white">
                helibar | هلی‌بار
              </span>
              <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md">
               
              </span>
            </div>
          </div>

          {/* Center: System Header Subtitle */}
          <div className="hidden sm:flex items-center text-xs text-neutral-400 font-medium">
            <span>درگاه امن ورود به سامانه  هلی‌بار </span>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center">
            <ThemeToggleMinimal />
          </div>
        </div>
      </header>

      {/* Main Centered Minimalist Login Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-sm space-y-3"
        >
          {/* Login Form Container */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selector: 3 minimalist cards */}
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((item) => {
                  const isSelected = selectedRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleRoleChange(item.role)}
                      className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                          : 'bg-gray-50 dark:bg-[#121212] border-gray-200 dark:border-neutral-800 text-gray-500 dark:text-neutral-400 hover:border-gray-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className={isSelected ? 'text-orange-500' : 'text-gray-400'}>
                        {item.icon}
                      </div>
                      <span className="text-xs">{item.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-3 py-2 rounded-xl text-center font-medium overflow-hidden"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input 1: Username with strict English alphanumeric constraint */}
              <div>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="نام کاربری (حروف انگلیسی)"
                  autoComplete="username"
                  className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-neutral-800 focus:border-orange-500 focus:outline-none text-gray-900 dark:text-white text-sm placeholder:text-gray-400 font-mono transition-colors text-left"
                />
              </div>

              {/* Input 2: Password with ENFORCED dir="ltr" */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full h-11 pr-3.5 pl-10 rounded-xl bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-neutral-800 focus:border-orange-500 focus:outline-none text-gray-900 dark:text-white text-sm placeholder:text-gray-400 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Input 3: Captcha */}
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  maxLength={4}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="کد امنیتی"
                  className="flex-1 h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-neutral-800 focus:border-orange-500 focus:outline-none text-gray-900 dark:text-white text-sm text-center font-mono tracking-widest transition-colors"
                />

                <div className="flex items-center gap-1.5 px-3 h-11 rounded-xl bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-neutral-800 select-none shrink-0">
                  <span className="font-mono text-base font-black tracking-widest text-orange-500 select-none line-through decoration-gray-400">
                    {captchaCode}
                  </span>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 transition-colors"
                    title="تازه سازی کد"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-98 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                    <span>ورود به سامانه  هلی‌بار</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3 text-center text-xs text-gray-400 dark:text-neutral-500">
        سامانه هوشمند helibar | هلی‌بار - متصل به سپاد
      </footer>
    </div>
  );
};
