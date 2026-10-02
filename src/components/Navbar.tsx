import React from 'react';
import { SipaadCredentials, AuthUser } from '../types';
import { toPersianDigits } from '../lib/iranPlate';
import { getPersianFirstName } from './Header';
import {
  Truck,
  Layers,
  FileText,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Building,
  Activity,
  Fuel,
  LogOut,
  UserCheck,
  Settings,
  UserPlus,
} from 'lucide-react';

export type NavTab =
  | 'DASHBOARD'
  | 'ISSUE_SINGLE'
  | 'BATCH'
  | 'OTP_MANAGER'
  | 'REPORTS'
  | 'FLEET'
  | 'FUEL_INQUIRY'
  | 'ARCHIVE'
  | 'LAB'
  | 'SETTINGS'
  | 'ADMIN_CREATE_USER';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  config: SipaadCredentials;
  totalWaybillsCount: number;
  activeBatchQueueCount: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  pendingOtpCount?: number;
  errorCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  config,
  totalWaybillsCount,
  activeBatchQueueCount,
  currentUser,
  onLogout,
  pendingOtpCount = 0,
  errorCount = 0,
}) => {
  return (
    <header className="no-print bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      {/* Top Issuer & Gateway Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <Building className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {currentUser?.username ? `${getPersianFirstName(currentUser.username)} خوش آمدید` : 'سامانه هلی‌بار'}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-500 dark:text-gray-400">کد شرکت صادرکننده:</span>
            <span className="font-mono font-bold text-orange-500">{toPersianDigits(currentUser?.companyCode || config.companyCode)}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-500 dark:text-gray-400">پروانه فعالیت:</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">{currentUser?.permitNumber || config.guildPermitNumber}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Sipaad gateway status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>اتصال وب‌سرویس سپاد: برخط (OK)</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mr-1">
              ({config.isSandboxMode ? 'Sandbox' : 'Live'})
            </span>
          </div>

          {activeBatchQueueCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/80 border border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 animate-pulse">
              <Activity className="w-3.5 h-3.5" />
              <span>صف فعال: {toPersianDigits(activeBatchQueueCount)}</span>
            </div>
          )}

          {/* User profile badge & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pr-2 border-r border-gray-200 dark:border-gray-700">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                <UserCheck className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-semibold text-[11px]">{currentUser.username}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">({currentUser.roleTitle})</span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-bold transition-colors cursor-pointer"
                  title="خروج از حساب کاربری صادرکننده"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base text-gray-900 dark:text-gray-100 tracking-tight">
                  سامانه هلی‌بار
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  UTCMS v2.4
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                پلتفرم صادرکنندگان بارنامه حمل بار و کالای درون‌شهری
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('DASHBOARD')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'DASHBOARD'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>داشبورد و آمار</span>
            </button>

            <button
              onClick={() => onSelectTab('ISSUE_SINGLE')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'ISSUE_SINGLE'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <UserPlus className="w-4 h-4 text-orange-500" />
              <span>افزودن راننده</span>
            </button>

            <button
              onClick={() => onSelectTab('BATCH')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'BATCH'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>پردازش گروهی</span>
            </button>

            <button
              onClick={() => onSelectTab('FLEET')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'FLEET'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>مدیریت ناوگان</span>
            </button>

            {/* Fuel Inquiry Nav Tab */}
            <button
              onClick={() => onSelectTab('FUEL_INQUIRY')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'FUEL_INQUIRY'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Fuel className="w-4 h-4 text-orange-500" />
              <span>استعلام سوخت</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                سپاد
              </span>
            </button>

            <button
              onClick={() => onSelectTab('OTP_MANAGER')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'OTP_MANAGER'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>کد دو عاملی</span>
              {pendingOtpCount !== undefined && pendingOtpCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                  {toPersianDigits(pendingOtpCount)}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('REPORTS')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'REPORTS'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>رهگیری خطا و لاگ‌ها</span>
              {errorCount !== undefined && errorCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                  {toPersianDigits(errorCount)}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('ARCHIVE')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentTab === 'ARCHIVE'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>آرشیو بارنامه‌ها</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {toPersianDigits(totalWaybillsCount)}
              </span>
            </button>

            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => onSelectTab('ADMIN_CREATE_USER')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentTab === 'ADMIN_CREATE_USER'
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <UserPlus className="w-4 h-4 text-orange-500" />
                <span>ایجاد پنل کاربری</span>
              </button>
            )}

            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => onSelectTab('SETTINGS')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentTab === 'SETTINGS'
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>تنظیمات</span>
              </button>
            )}
          </nav>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-gray-200 dark:border-gray-800 scrollbar-none">
          <button
            onClick={() => onSelectTab('DASHBOARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentTab === 'DASHBOARD' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            داشبورد
          </button>
          <button
            onClick={() => onSelectTab('ISSUE_SINGLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentTab === 'ISSUE_SINGLE' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            صدور تکی
          </button>
          <button
            onClick={() => onSelectTab('BATCH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentTab === 'BATCH' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            پردازش گروهی
          </button>
          <button
            onClick={() => onSelectTab('OTP_MANAGER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors ${
              currentTab === 'OTP_MANAGER' ? 'bg-orange-500 text-white shadow-xs' : 'text-orange-600 dark:text-orange-400'
            }`}
          >
            <KeyRound className="w-3 h-3" />
            <span>کد ۲عاملی</span>
            {pendingOtpCount !== undefined && pendingOtpCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
                {toPersianDigits(pendingOtpCount)}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('REPORTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors ${
              currentTab === 'REPORTS' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>لاگ خطا</span>
            {errorCount !== undefined && errorCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {toPersianDigits(errorCount)}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('FLEET')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentTab === 'FLEET' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            ناوگان
          </button>
          <button
            onClick={() => onSelectTab('FUEL_INQUIRY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors ${
              currentTab === 'FUEL_INQUIRY' ? 'bg-orange-500 text-white shadow-xs' : 'text-orange-600 dark:text-orange-400'
            }`}
          >
            <Fuel className="w-3 h-3" />
            <span>استعلام سوخت</span>
          </button>
          <button
            onClick={() => onSelectTab('ARCHIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentTab === 'ARCHIVE' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            آرشیو ({toPersianDigits(totalWaybillsCount)})
          </button>
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => onSelectTab('SETTINGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                currentTab === 'SETTINGS' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              تنظیمات
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
