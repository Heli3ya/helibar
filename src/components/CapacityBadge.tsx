import React from 'react';
import { toPersianDigits } from '../lib/iranPlate';
import { ShieldAlert, AlertTriangle, Layers } from 'lucide-react';

export interface CapacityBadgeProps {
  currentCount?: number;
  maxCapacity?: number;
  className?: string;
  role?: string;
}

export const ALLOWED_CAPACITY_TIERS = [50, 150, 350, 550, 700] as const;

export const CapacityBadge: React.FC<CapacityBadgeProps> = ({
  currentCount = 0,
  maxCapacity = 150,
  className = '',
  role,
}) => {
  // If user is ADMIN, plate capacity restrictions & badges are completely omitted
  if (role === 'ADMIN') {
    return null;
  }

  // Deduct each registered plate from total capacity: remaining = maxCapacity - currentCount
  const remaining = Math.max(0, maxCapacity - currentCount);
  const isExhausted = remaining === 0;
  const isWarning = !isExhausted && remaining <= Math.max(5, Math.floor(maxCapacity * 0.15));

  // Styling based on capacity state
  const getBadgeStyle = () => {
    if (isExhausted) {
      return 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-xs shadow-rose-500/10 animate-pulse';
    }
    if (isWarning) {
      return 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs shadow-amber-500/10';
    }
    return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
  };

  const getIndicatorDot = () => {
    if (isExhausted) {
      return 'bg-rose-400';
    }
    if (isWarning) {
      return 'bg-amber-400';
    }
    return 'bg-emerald-400';
  };

  return (
    <div
      dir="rtl"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold select-none transition-all duration-200 ${getBadgeStyle()} ${className}`}
      title={`سقف ظرفیت پلاک: ${toPersianDigits(maxCapacity)} - ثبت‌شده: ${toPersianDigits(currentCount)} - باقی‌مانده: ${toPersianDigits(remaining)}`}
    >
      <span className="relative flex h-2 w-2">
        {isExhausted && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${getIndicatorDot()}`} />
      </span>

      <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />

      <span className="whitespace-nowrap font-mono text-[11px] font-bold">
        {isExhausted ? (
          <span className="text-rose-400 font-bold">تکمیل ظرفیت پلاک (۰ باقی‌مانده)</span>
        ) : (
          <span>
            ظرفیت باقی‌مانده: <strong className="text-white text-xs font-black">{toPersianDigits(remaining)}</strong> از {toPersianDigits(maxCapacity)} پلاک
          </span>
        )}
      </span>

      {isExhausted ? (
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      ) : isWarning ? (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      ) : null}
    </div>
  );
};
