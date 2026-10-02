import React from 'react';
import { NavTab } from './Navbar';
import { toPersianDigits } from '../lib/iranPlate';
import {
  LayoutDashboard,
  KeyRound,
  ShieldAlert,
  Fuel,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobileMenu: () => void;
  pendingOtpCount?: number;
  errorCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMobileMenu,
  pendingOtpCount = 0,
  errorCount = 0,
}) => {
  return (
    <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 shadow-2xl safe-area-pb">
      <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto">
        {/* Tab 1: Main Dashboard */}
        <button
          onClick={() => onSelectTab('DASHBOARD')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            currentTab === 'DASHBOARD'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">پلاک‌ها</span>
        </button>

        {/* Tab 2: OTP Manager */}
        <button
          onClick={() => onSelectTab('OTP_MANAGER')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] relative ${
            currentTab === 'OTP_MANAGER'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">کد ۲عاملی</span>
          {pendingOtpCount > 0 && (
            <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
              {toPersianDigits(pendingOtpCount)}
            </span>
          )}
        </button>

        {/* Tab 3: Error Reports */}
        <button
          onClick={() => onSelectTab('REPORTS')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] relative ${
            currentTab === 'REPORTS'
              ? 'text-rose-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">لاگ خطا</span>
          {errorCount > 0 && (
            <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
              {toPersianDigits(errorCount)}
            </span>
          )}
        </button>

        {/* Tab 4: Fuel Quotas */}
        <button
          onClick={() => onSelectTab('FUEL_INQUIRY')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            currentTab === 'FUEL_INQUIRY'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fuel className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">سوخت</span>
        </button>

        {/* Tab 5: More Menu Button */}
        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer min-h-[48px]"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">بیشتر</span>
        </button>
      </div>
    </nav>
  );
};
