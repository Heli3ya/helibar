import React from 'react';
import { IranPlate } from '../types';
import { toPersianDigits } from '../lib/iranPlate';
import { Scale } from 'lucide-react';
import { BiweeklyStageStatsBadge } from './BiweeklyStageStatsBadge';

export { BiweeklyStageStatsBadge };

export interface TonnageBadgeProps {
  tonnageKg?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TonnageBadge: React.FC<TonnageBadgeProps> = ({
  tonnageKg,
  size = 'md',
  className = '',
}) => {
  if (!tonnageKg) return null;
  const tons = (tonnageKg / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 });
  const kgStr = toPersianDigits(tonnageKg.toLocaleString('fa-IR'));

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-300 select-none shadow-xs whitespace-nowrap ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[10px]'
          : size === 'lg'
          ? 'px-3 py-1.5 text-xs'
          : 'px-2.5 py-1 text-[11px]'
      } ${className}`}
      title={`ظرفیت مجاز حمل بار: ${toPersianDigits(tonnageKg)} کیلوگرم (${toPersianDigits(tons)} تن)`}
    >
      <Scale className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-amber-400 shrink-0`} />
      <span className="text-amber-200/90 font-medium">تناژ:</span>
      <span className="font-bold text-amber-300">{toPersianDigits(tons)} تن</span>
      <span className="text-[9px] text-amber-400/70 font-mono hidden sm:inline">({kgStr} ک‌گ)</span>
    </span>
  );
};

export interface BiweeklyCountBadgeProps {
  count?: number;
  stage1Count?: number;
  stage2Count?: number;
  limit?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  layout?: 'pill' | 'stacked' | 'divided';
}

export const BiweeklyCountBadge: React.FC<BiweeklyCountBadgeProps> = ({
  count,
  stage1Count,
  stage2Count,
  limit = 15,
  size = 'md',
  className = '',
  layout = 'divided',
}) => {
  return (
    <BiweeklyStageStatsBadge
      stage1Count={stage1Count}
      stage2Count={stage2Count}
      totalCount={count}
      quotaLimit={limit}
      layout={layout}
      size={size === 'lg' ? 'md' : 'sm'}
      className={className}
    />
  );
};

interface PlateBadgeProps {
  plate: IranPlate;
  tonnageKg?: number;
  biweeklyWaybillCount?: number;
  stage1Count?: number;
  stage2Count?: number;
  biweeklyQuotaLimit?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlateBadge: React.FC<PlateBadgeProps> = ({
  plate,
  tonnageKg,
  biweeklyWaybillCount,
  stage1Count,
  stage2Count,
  biweeklyQuotaLimit = 15,
  size = 'md',
  className = '',
}) => {
  const isPublic = plate.letter === 'ع' || plate.type === 'public';
  const bgClass = isPublic
    ? 'bg-amber-400 text-slate-950 border-amber-500'
    : 'bg-slate-100 text-slate-900 border-slate-300';

  const sizeStyles = {
    sm: {
      container: 'h-7 text-xs px-1 gap-1 min-w-[125px]',
      blueStrip: 'w-3 text-[7px]',
      flagH: 'h-1.5',
      letter: 'font-bold text-xs',
      province: 'text-[9px] min-w-[22px]',
    },
    md: {
      container: 'h-9 text-sm px-1.5 gap-1.5 min-w-[155px]',
      blueStrip: 'w-4 text-[8px]',
      flagH: 'h-2',
      letter: 'font-bold text-sm',
      province: 'text-[11px] min-w-[28px]',
    },
    lg: {
      container: 'h-12 text-lg px-2 gap-2 min-w-[210px]',
      blueStrip: 'w-5 text-[10px]',
      flagH: 'h-2.5',
      letter: 'font-extrabold text-base',
      province: 'text-sm min-w-[36px]',
    },
  }[size];

  const plateElement = (
    <div
      dir="ltr"
      className={`inline-flex items-center justify-between rounded border-2 shadow-sm font-mono select-none overflow-hidden ${bgClass} ${sizeStyles.container} ${className}`}
      title={`پلاک: ${plate.part1} ${plate.letter} ${plate.part2} ایران ${plate.provinceCode}`}
    >
      {/* Left blue IRI stripe */}
      <div className={`h-full bg-blue-700 text-white flex flex-col items-center justify-between py-0.5 rounded-l-xs ${sizeStyles.blueStrip}`}>
        <div className="flex flex-col items-center leading-none">
          <div className="w-full flex justify-center">
            <span className="block w-2 h-0.5 bg-green-500"></span>
          </div>
          <div className="w-full flex justify-center">
            <span className="block w-2 h-0.5 bg-white"></span>
          </div>
          <div className="w-full flex justify-center">
            <span className="block w-2 h-0.5 bg-red-500"></span>
          </div>
        </div>
        <div className="flex flex-col items-center leading-tight">
          <span className="font-sans font-bold tracking-tighter">I.R.</span>
          <span className="font-sans scale-90">IRAN</span>
        </div>
      </div>

      {/* Plate digits: part1 - Letter - part2 */}
      <div className="flex items-center justify-center gap-1.5 px-1 font-bold flex-1">
        <span className="tracking-widest">{toPersianDigits(plate.part1)}</span>
        <span
          className={`px-1 py-0.5 rounded ${
            isPublic ? 'bg-amber-500/40 text-slate-950' : 'bg-slate-200 text-slate-950'
          } ${sizeStyles.letter}`}
        >
          {plate.letter}
        </span>
        <span className="tracking-wider">{toPersianDigits(plate.part2)}</span>
      </div>

      {/* Right Iran Province Box */}
      <div
        className={`h-full border-l border-slate-950/30 flex flex-col items-center justify-center px-1 bg-black/5 ${sizeStyles.province}`}
      >
        <span className="text-[9px] font-sans leading-none opacity-85">ایران</span>
        <span className="font-black leading-none mt-0.5">{toPersianDigits(plate.provinceCode)}</span>
      </div>
    </div>
  );

  const hasStats =
    stage1Count !== undefined ||
    stage2Count !== undefined ||
    biweeklyWaybillCount !== undefined;

  if (tonnageKg || hasStats) {
    return (
      <div className="inline-flex items-center gap-2 flex-wrap">
        {plateElement}
        {tonnageKg && <TonnageBadge tonnageKg={tonnageKg} size={size} />}
        {hasStats && (
          <BiweeklyCountBadge
            count={biweeklyWaybillCount}
            stage1Count={stage1Count}
            stage2Count={stage2Count}
            limit={biweeklyQuotaLimit}
            size={size}
          />
        )}
      </div>
    );
  }

  return plateElement;
};
