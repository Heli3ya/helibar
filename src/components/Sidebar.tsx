import React from 'react';
import { NavTab } from './Navbar';
import { SipaadCredentials, AuthUser } from '../types';
import { toPersianDigits } from '../lib/iranPlate';
import {
  LayoutDashboard,
  ShieldAlert,
  KeyRound,
  Settings,
  Fuel,
  Layers,
  FileText,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Power,
  UserPlus,
} from 'lucide-react';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  config: SipaadCredentials;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  pendingOtpCount?: number;
  errorCount?: number;
  totalWaybillsCount?: number;
  autoRegisterEnabled?: boolean;
  onToggleAutoRegister?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  config,
  currentUser,
  onLogout,
  pendingOtpCount = 0,
  errorCount = 0,
  totalWaybillsCount = 0,
  autoRegisterEnabled = false,
  onToggleAutoRegister,
}) => {
  const primaryNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeType?: 'amber' | 'rose' | 'slate';
  }[] = [
    {
      id: 'DASHBOARD',
      label: 'داشبورد عملیاتی',
      icon: LayoutDashboard,
    },
    {
      id: 'REPORTS',
      label: 'نتایج عملکرد و لاگ‌ها',
      icon: ShieldAlert,
      badge: errorCount,
      badgeType: 'rose',
    },
    {
      id: 'OTP_MANAGER',
      label: 'مدیریت کد دوعاملی (2FA)',
      icon: KeyRound,
      badge: pendingOtpCount,
      badgeType: 'amber',
    },
    {
      id: 'FUEL_INQUIRY',
      label: 'استعلام سوخت',
      icon: Fuel,
    },
    ...(currentUser?.role === 'ADMIN'
      ? [
          {
            id: 'SETTINGS' as NavTab,
            label: 'تنظیمات سیستم',
            icon: Settings,
          },
          {
            id: 'ADMIN_CREATE_USER' as NavTab,
            label: 'ایجاد پنل کاربری',
            icon: UserPlus,
          },
        ]
      : []),
  ];

  const secondaryNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'ISSUE_SINGLE',
      label: 'افزودن راننده',
      icon: UserPlus,
    },
    {
      id: 'BATCH',
      label: 'پردازش گروهی',
      icon: Layers,
    },
    {
      id: 'ARCHIVE',
      label: 'آرشیو بارنامه‌ها',
      icon: FileText,
      badge: totalWaybillsCount,
    },
  ];

  return (
    <aside
      className={`no-print hidden lg:flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-200 z-30 shrink-0 sticky top-0 h-screen select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-black/30">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0 font-black text-xl">
              B
            </div>
            <div className="leading-tight truncate">
              <div className="font-black text-sm text-gray-900 dark:text-gray-100 tracking-wide truncate">
               helibar | هلی‌بار
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">
                سامانه هوشمند بارنامه و ناوگان
              </div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black text-xl">
              B
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title={isCollapsed ? 'باز کردن منو' : 'بستن منو'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Auto Issuance Quick Switch Bar in Sidebar */}
      {!isCollapsed && onToggleAutoRegister && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
          <button
            onClick={onToggleAutoRegister}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
              autoRegisterEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Power className={`w-3.5 h-3.5 ${autoRegisterEnabled ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
              <span>ثبت خودکار دوره:</span>
            </div>
            <span className={`text-[11px] font-black ${autoRegisterEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {autoRegisterEnabled ? 'فعال' : 'متوقف'}
            </span>
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-none">
        {/* Primary Essential Navigation */}
        <div className="space-y-1">
          {primaryNavItems
            .filter(item => !(currentUser?.role === 'SUPPORT' && item.id === 'SETTINGS'))
            .map(item => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer relative group ${
                    isActive
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20 font-bold'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                  title={item.label}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-500'
                    }`}
                  />

                  {!isCollapsed && <span className="truncate flex-1 text-right">{item.label}</span>}

                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-white text-orange-600'
                          : item.badgeType === 'rose'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : item.badgeType === 'amber'
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {toPersianDigits(item.badge)}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {/* Divider and Secondary Links */}
        {!isCollapsed && (
          <div className="pt-3 pb-1 px-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            ابزارهای تکمیلی
          </div>
        )}

        <div className="space-y-1 pt-1 border-t border-gray-200 dark:border-gray-800">
          {secondaryNavItems.map(item => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer relative group ${
                  isActive
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20 font-bold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-500'
                  }`}
                />

                {!isCollapsed && <span className="truncate flex-1 text-right">{item.label}</span>}

                {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {toPersianDigits(item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Profile & Logout Area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-black/30">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-right truncate">
                <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                  {currentUser?.companyName || config.issuerTitle}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                  کد: {toPersianDigits(currentUser?.companyCode || config.companyCode)}
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                  title="خروج از حساب صادرکننده"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>سپاد: برخط (OK)</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="وب‌سرویس سپاد متصل است" />
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                title="خروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
