import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
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
  const { warningType: contextWarning, daysLeft, isBlocked } = useSubscription();

  const activeWarning = overrideState !== undefined ? overrideState : contextWarning;

  // Retrieve current active user to enforce isolation
  const activeUser: AuthUser | null = propUser || (() => {
    try {
      const saved = localStorage.getItem('sipaad_issuer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  if (isBlocked || !activeUser || activeUser.role === 'ADMIN') {
    return null;
  }

  // Critical Warning: days_left <= 7
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
        </div>
      </div>
    );
  }

  // Medium Warning: 14_DAYS
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
        </div>
      </div>
    );
  }

  return null;
};
