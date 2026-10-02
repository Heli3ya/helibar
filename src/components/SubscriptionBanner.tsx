import React from 'react';
import { AlertTriangle, Clock, CreditCard, ChevronLeft } from 'lucide-react';
import { useSubscription, SubscriptionWarningType } from '../context/SubscriptionContext';
import { toPersianDigits } from '../lib/iranPlate';
import { AuthUser } from '../types';

export type { SubscriptionWarningType };

export const triggerSubscriptionWarning = (_type: any) => {
  // Compatibility helper for legacy callers
};

export interface SubscriptionBannerProps {
  overrideState?: SubscriptionWarningType;
  currentUser?: AuthUser | null;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  overrideState,
  currentUser: propUser,
}) => {
  const { warningType: contextWarning, daysLeft, isBlocked, setIsBillingOpen } = useSubscription();

  const activeWarning = overrideState !== undefined ? overrideState : contextWarning;

  // Retrieve current active user to enforce isolation (only show for user whose subscription is expiring)
  const activeUser: AuthUser | null = propUser || (() => {
    try {
      const saved = localStorage.getItem('sipaad_issuer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  // If panel is completely blocked, full-screen BlockOverlay handles it.
  // Admins do NOT have expiring subscriptions. Banner only shows for SUPPORT / Client accounts.
  if (isBlocked || !activeUser || activeUser.role === 'ADMIN') {
    return null;
  }

  // 1. Critical Warning: days_left <= 7 (Orange/Red alert banner at absolute top of dashboard)
  // Required exact copy: "کاربر گرامی، کمتر از یک هفته تا پایان اشتراک شما باقی مانده است. لطفا جهت تمدید اقدام نمایید."
  const isExpiringWithin7Days = (daysLeft !== null && daysLeft <= 7) || activeWarning === '7_DAYS_BLINKING';

  if (isExpiringWithin7Days) {
    const daysText = daysLeft !== null ? toPersianDigits(daysLeft) : '۷';
    return (
      <div
        dir="rtl"
        role="alert"
        className="relative z-40 w-full bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white border-b-2 border-orange-500 shadow-md animate-pulse"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="p-1.5 rounded-lg bg-black/20 border border-white/30 text-white shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-200 animate-bounce" />
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-white">
                کاربر گرامی، کمتر از یک هفته تا پایان اشتراک شما باقی مانده است. لطفا جهت تمدید اقدام نمایید.
              </span>
              {daysLeft !== null && (
                <span className="px-2 py-0.5 rounded-md bg-black/30 text-amber-200 text-xs font-mono font-bold">
                  ({daysText} روز باقی‌مانده)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mr-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsBillingOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-900 text-amber-300 border border-amber-400/40 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-xs"
            >
              <CreditCard className="w-4 h-4 text-orange-400" />
              <span>تمدید فوری اشتراک</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Medium Warning: 14_DAYS (Static, elegant orange banner)
  if (activeWarning === '14_DAYS' || (daysLeft !== null && daysLeft <= 14 && daysLeft > 7)) {
    return (
      <div
        dir="rtl"
        role="alert"
        className="relative z-40 w-full bg-orange-500 text-black border-b border-orange-600 shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-black/10 border border-black/20 text-black shrink-0">
              <Clock className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-black">
                کاربر گرامی، کمتر از دو هفته تا پایان اشتراک شما باقی مانده است.
              </span>
              {daysLeft !== null && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-black text-orange-400 font-mono text-[11px] font-bold">
                  {toPersianDigits(daysLeft)} روز باقی‌مانده
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mr-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsBillingOpen(true)}
              className="px-3 py-1 rounded-lg bg-black hover:bg-neutral-900 text-orange-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <span>مشاهده صورت‌حساب</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
