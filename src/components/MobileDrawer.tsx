import React, { useEffect } from 'react';
import { NavTab } from './Navbar';
import { AuthUser } from '../types';
import { toPersianDigits } from '../lib/iranPlate';
import {
  X,
  LayoutDashboard,
  ShieldAlert,
  KeyRound,
  Settings,
  Fuel,
  FilePlus2,
  Layers,
  FileText,
  Truck,
  LogOut,
  Building,
  UserPlus,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  pendingOtpCount?: number;
  errorCount?: number;
  totalWaybillsCount?: number;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  pendingOtpCount = 0,
  errorCount = 0,
  totalWaybillsCount = 0,
}) => {
  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // The 5 primary essential navigation items
  const primaryNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeType?: 'amber' | 'rose';
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

  // Secondary tools (Exact parity with desktop Sidebar)
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
      id: 'FLEET',
      label: 'مدیریت ناوگان',
      icon: Truck,
    },
    {
      id: 'ARCHIVE',
      label: 'آرشیو بارنامه‌ها',
      icon: FileText,
      badge: totalWaybillsCount,
    },
  ];

  const handleItemClick = (id: NavTab) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
        isOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop Overlay with Smooth Blur */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-over Drawer (RTL: Slides from the Right) */}
      <aside
        className={`absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col justify-between transform transition-transform ease-in-out duration-300 z-10 select-none overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/80 dark:bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-sm text-gray-900 dark:text-gray-100 tracking-tight block">
               helibar | هلی‌بار
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                سامانه هوشمند بارنامه و ناوگان
              </span>
            </div>
          </div>

          {/* Close Button (44x44px touch target) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن منو"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
          {/* Section 1: Primary Essential Items */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-3 uppercase tracking-wider">
              بخش‌های اصلی عملیاتی
            </div>

            {primaryNavItems.map(item => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {/* Optional Badges */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white text-orange-600'
                          : item.badgeType === 'rose'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-orange-500 text-white'
                      }`}
                    >
                      {toPersianDigits(item.badge)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section 2: Supplementary Tools */}
          <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-3 uppercase tracking-wider">
              ابزارهای صدور و آرشیو
            </div>

            {secondaryNavItems.map(item => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className="flex-1 text-right">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {toPersianDigits(item.badge)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer: User Info & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-black/40 space-y-3">
          {currentUser && (
            <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
              <Building className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="truncate">
                <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{currentUser.companyName}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                  کد صادرکننده: {toPersianDigits(currentUser.companyCode)}
                </div>
              </div>
            </div>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج از حساب</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
