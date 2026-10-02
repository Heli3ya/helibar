import React from 'react';
import { toPersianDigits } from '../lib/iranPlate';

export interface BiweeklyStageStatsBadgeProps {
  stage1Count?: number;
  stage2Count?: number;
  totalCount?: number;
  quotaLimit?: number;
  layout?: 'pill' | 'stacked' | 'divided';
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * BiweeklyStageStatsBadge:
 * Displays the 15-Day Waybill Statistics split into two strictly defined Persian (Jalali) periods:
 *  - Item 1: مرحله اول (۸ تا ۲۳): [stage1_count]
 *  - Item 2: مرحله دوم (۲۳ تا ۸): [stage2_count]
 *
 * Theme: Minimalist Orange/Black with subtle neutral-800/900 background and orange-500 numbers.
 */
export const BiweeklyStageStatsBadge: React.FC<BiweeklyStageStatsBadgeProps> = ({
  stage1Count = 0,
  stage2Count = 0,
  totalCount,
  quotaLimit = 15,
  layout = 'divided',
  className = '',
  size = 'sm',
}) => {
  // If only totalCount is provided, gracefully derive stage counts
  const s1 = stage1Count !== undefined ? stage1Count : Math.ceil((totalCount || 0) * 0.6);
  const s2 = stage2Count !== undefined ? stage2Count : Math.floor((totalCount || 0) * 0.4);

  // Stacked variant (Two neat stacked rows for cards or tables)
  if (layout === 'stacked') {
    return (
      <div
        className={`bg-neutral-900/95 border border-neutral-800 rounded-xl px-2.5 py-1.5 space-y-1 select-none shadow-xs ${className}`}
        title={`آمار ثبت باربرگ در دو مرحله جلالی: مرحله ۱ (${toPersianDigits(s1)}) - مرحله ۲ (${toPersianDigits(s2)})`}
      >
        {/* Item 1 */}
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-neutral-400 font-medium whitespace-nowrap">
            مرحله اول (۸ تا ۲۳):
          </span>
          <span className="font-mono font-bold text-orange-500 text-xs">
            {toPersianDigits(s1)}
          </span>
        </div>

        <div className="h-px bg-neutral-800/80 w-full" />

        {/* Item 2 */}
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-neutral-400 font-medium whitespace-nowrap">
            مرحله دوم (۲۳ تا ۸):
          </span>
          <span className="font-mono font-bold text-orange-500 text-xs">
            {toPersianDigits(s2)}
          </span>
        </div>
      </div>
    );
  }

  // Divided pill badge (Single line with subtle divider)
  const isSm = size === 'sm';
  return (
    <div
      dir="rtl"
      className={`inline-flex items-center bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 select-none shadow-xs text-neutral-300 ${
        isSm ? 'text-[10px] gap-2' : 'text-xs gap-2.5 px-3 py-1.5'
      } ${className}`}
      title="تفکیک ثبت باربرگ بر اساس تقویم جلالی (مرحله اول: ۸ تا ۲۲ ماه جاری / مرحله دوم: ۲۳ جاری تا ۷ ماه بعد)"
    >
      {/* Item 1: مرحله اول (۸ تا ۲۳) */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-neutral-400 font-medium">مرحله اول (۸ تا ۲۳):</span>
        <span className="font-mono font-bold text-orange-500 text-[11px]">
          {toPersianDigits(s1)}
        </span>
      </div>

      {/* Subtle vertical divider */}
      <span className="w-px h-3 bg-neutral-800 shrink-0" aria-hidden="true" />

      {/* Item 2: مرحله دوم (۲۳ تا ۸) */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-neutral-400 font-medium">مرحله دوم (۲۳ تا ۸):</span>
        <span className="font-mono font-bold text-orange-500 text-[11px]">
          {toPersianDigits(s2)}
        </span>
      </div>
    </div>
  );
};
