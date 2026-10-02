import React, { useState, useRef, useEffect } from 'react';
import { AuthUser } from '../types';
import { toPersianDigits } from '../lib/iranPlate';
import { CapacityBadge } from './CapacityBadge';
import { ThemeToggleMinimal } from './ThemeToggleMinimal';
import { useSubscription } from '../context/SubscriptionContext';
import { BillingModal } from './BillingModal';
import { getPersianFirstName } from './Header';
import { GlobalBackButton } from './GlobalBackButton';
import {
  Menu,
  Truck,
  User,
  ChevronDown,
  LogOut,
  CreditCard,
} from 'lucide-react';

interface AppHeaderProps {
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenMobileDrawer: () => void;
  onNavigateToSettings?: () => void;
  currentPlateCount?: number;
  maxPlateCapacity?: number;
  currentTab?: string;
  onNavigateBack?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  onLogout,
  onOpenMobileDrawer,
  currentPlateCount = 120,
  maxPlateCapacity = 150,
  currentTab = 'DASHBOARD',
  onNavigateBack,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { daysLeft } = useSubscription();

  // Dynamic 30-day Subscription calculation based on user creation date
  const calculatedDaysRemaining = React.useMemo(() => {
    if (currentUser?.days_left !== undefined) return currentUser.days_left;
    if (currentUser?.created_at) {
      const createdTime = new Date(currentUser.created_at).getTime();
      const diffDays = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
      return Math.max(0, 30 - diffDays);
    }
    return daysLeft ?? 30;
  }, [currentUser, daysLeft]);

  // Strict React state isolation for user profile name tied to active session token
  const [persianFirstName, setPersianFirstName] = useState<string>(() =>
    getPersianFirstName(currentUser?.username || '')
  );

  useEffect(() => {
    let isCancelled = false;
    const sessionToken =
      localStorage.getItem('access_token') ||
      localStorage.getItem('jwt_token') ||
      (currentUser?.id ? `session_${currentUser.id}` : 'active_session');

    const fetchUserProfile = async () => {
      try {
        const res = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'X-Session-Token': sessionToken,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            const rawName = data.full_name || data.username || currentUser?.username || '';
            setPersianFirstName(getPersianFirstName(rawName));
          }
        } else if (!isCancelled && currentUser?.username) {
          setPersianFirstName(getPersianFirstName(currentUser.username));
        }
      } catch {
        if (!isCancelled && currentUser?.username) {
          setPersianFirstName(getPersianFirstName(currentUser.username));
        }
      }
    };

    fetchUserProfile();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, currentUser?.username]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayDays = daysLeft !== null ? daysLeft : 30;

  return (
    <header className="sticky top-0 z-40 w-full border-b transition-colors duration-200 select-none bg-white/95 dark:bg-black/90 border-gray-200 dark:border-neutral-800 backdrop-blur-md">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        {/* RIGHT (RTL): Desktop Logo & Brand OR Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            aria-label="Menu"
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-colors cursor-pointer border border-gray-200 dark:border-neutral-800"
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Brand Identity: helibar | هلی‌بار */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-black font-black shadow-md shadow-orange-500/20 shrink-0">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-base text-gray-900 dark:text-white tracking-tight">
                  helibar
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  هلی‌بار
                </span>
              </div>
              <span className="hidden sm:inline text-[10px] text-gray-500 dark:text-neutral-400 font-medium mt-0.5">
                سامانه مدیریت بارنامه و ناوگان
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: Remaining Capacity & Dynamic Subscription Status - Shown for non-ADMIN users */}
        {currentUser?.role !== 'ADMIN' && (
          <div className="flex items-center gap-2 flex-wrap justify-center py-1 order-3 sm:order-2 w-full sm:w-auto">
            <CapacityBadge
              currentCount={currentPlateCount}
              maxCapacity={maxPlateCapacity}
              role={currentUser?.role}
            />

            {/* Dynamic Subscription Status Badge */}
            <button
              type="button"
              onClick={() => setIsBillingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold font-mono transition-all cursor-pointer shadow-xs select-none"
              title="مشاهده جزئیات و تمدید اشتراک ۱ ماهه"
            >
              <CreditCard className="w-3.5 h-3.5 text-orange-400" />
              <span>اشتراک: <strong className="text-white text-xs">{toPersianDigits(calculatedDaysRemaining)}</strong> روز</span>
            </button>
          </div>
        )}

        {/* LEFT (RTL): Dynamic Welcome Greeting & User Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-3">
          {/* Universal Global Back Button (Top Left) */}
          <GlobalBackButton
            onClick={currentTab !== 'DASHBOARD' ? onNavigateBack : undefined}
            isAccent={currentTab !== 'DASHBOARD'}
            label={currentTab !== 'DASHBOARD' ? 'بازگشت به داشبورد' : 'بازگشت'}
            title={currentTab !== 'DASHBOARD' ? 'بازگشت به داشبورد عملیاتی' : 'بازگشت به صفحه قبل'}
          />

          {/* Minimalist Theme Toggle */}
          <ThemeToggleMinimal />

          {/* User Profile Avatar & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-right transition-colors cursor-pointer group"
              aria-expanded={profileDropdownOpen}
              aria-haspopup="true"
            >
              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-black font-bold text-xs shadow-xs font-mono">
                {currentUser?.username ? (
                  currentUser.username.substring(0, 2).toUpperCase()
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              {/* Dynamic Welcome Greeting: Exactly [username] خوش آمدید */}
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors font-mono">
                  {currentUser?.username ? `${currentUser.username} خوش آمدید` : 'خوش آمدید'}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-neutral-400">
                  {currentUser?.role === 'ADMIN' ? 'مدیر ارشد سامانه' : 'پنل صادرکننده'}
                </span>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-500 dark:text-neutral-400 transition-transform duration-200 hidden sm:block ${
                  profileDropdownOpen ? 'rotate-180 text-orange-500' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-right space-y-1">
                {/* Logout Option */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>خروج از حساب کاربری</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Billing Modal */}
      <BillingModal
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
        currentUser={currentUser}
      />
    </header>
  );
};
