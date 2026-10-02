import React, { useState } from 'react';
import { NavTab } from './Navbar';
import { AuthUser, SipaadCredentials } from '../types';
import { SubscriptionBanner, SubscriptionWarningType, triggerSubscriptionWarning } from './SubscriptionBanner';
import { ThemeToggleMinimal } from './ThemeToggleMinimal';
import { GlobalBackButton } from './GlobalBackButton';
import {
  Truck,
  LayoutDashboard,
  Layers,
  Fuel,
  FilePlus2,
  KeyRound,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

export interface LayoutProps {
  children: React.ReactNode;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  config?: SipaadCredentials;
  subscriptionWarning?: SubscriptionWarningType;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  subscriptionWarning,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSubSimulator, setShowSubSimulator] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'DASHBOARD', label: 'پیشخوان', icon: LayoutDashboard },
    { id: 'FLEET', label: 'پلاک‌ها و ناوگان', icon: Truck },
    { id: 'FUEL_INQUIRY', label: 'استعلام سوخت', icon: Fuel },
    { id: 'ISSUE_SINGLE', label: 'صدور بارنامه', icon: FilePlus2 },
    { id: 'BATCH', label: 'صدور گروهی', icon: Layers },
    { id: 'OTP_MANAGER', label: 'تایید ۲FA', icon: KeyRound },
    { id: 'REPORTS', label: 'گزارش‌ها و خطا', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-150">
      {/* 1. Subscription Warning Banner at the very top */}
      <SubscriptionBanner overrideState={subscriptionWarning} />

      {/* 2. Sleek Modern Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand: helibar | هلی‌بار */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => onSelectTab('DASHBOARD')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-black text-lg tracking-tight text-gray-900 dark:text-gray-100">
                    helibar
                  </span>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-md">
                   هلی‌بار
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                  سامانه مدیریت بارنامه و ناوگان
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Header Actions: Theme Toggle, User Info, Logout */}
          <div className="flex items-center gap-2">
            {/* Universal Global Back Button (Top Left) */}
            <GlobalBackButton />

            {/* Quick Warning Simulator (for developer inspection) */}
            <div className="relative hidden xl:block">
              <button
                onClick={() => setShowSubSimulator(!showSubSimulator)}
                className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition-colors"
                title="تست وضعیت اشتراک"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <span>اشتراک</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showSubSimulator && (
                <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-2 z-50 text-xs space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-2 py-1">
                    شبیه‌سازی هشدار اشتراک:
                  </div>
                  <button
                    onClick={() => {
                      triggerSubscriptionWarning('14_DAYS');
                      setShowSubSimulator(false);
                    }}
                    className="w-full text-right px-2 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold"
                  >
                    ۱۴ روز تا پایان (بنر هشدار)
                  </button>
                  <button
                    onClick={() => {
                      triggerSubscriptionWarning('7_DAYS_BLINKING');
                      setShowSubSimulator(false);
                    }}
                    className="w-full text-right px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-bold"
                  >
                    ۷ روز تا پایان (چشمک‌زن)
                  </button>
                  <button
                    onClick={() => {
                      triggerSubscriptionWarning('EXPIRED');
                      setShowSubSimulator(false);
                    }}
                    className="w-full text-right px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-bold"
                  >
                    منقضی شده (مسدودسازی)
                  </button>
                  <button
                    onClick={() => {
                      triggerSubscriptionWarning(null);
                      setShowSubSimulator(false);
                    }}
                    className="w-full text-right px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    حالت عادی (بدون هشدار)
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle Minimal */}
            <ThemeToggleMinimal />

            {/* User Profile Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-r border-gray-200 dark:border-gray-800 pr-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-xs">
                  {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {currentUser.username || 'کاربر سیستم'}
                  </div>
                  <div className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                    {currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN'
                      ? 'مدیر ارشد'
                      : currentUser.role === 'SUPPORT'
                      ? 'پشتیبان عملیاتی'
                      : 'راننده ناوگان'}
                  </div>
                </div>
              </div>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title="خروج از حساب"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-1 animate-in slide-in-from-top-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* 3. Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>

      {/* 4. Minimalist Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 py-3 text-center text-[11px] text-gray-500 dark:text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>helibar | هلی‌بار - متصل به وب‌سرویس‌های سپاد (UTCMS)</span>
          <span className="font-mono text-gray-400 dark:text-gray-500">نسخه ۳.۴.۰ عملیاتی</span>
        </div>
      </footer>
    </div>
  );
};
