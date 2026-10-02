import React, { useState } from 'react';
import { VehicleInfo, DriverInfo } from '../types';
import { PlateBadge } from './PlateBadge';
import { BiweeklyStageStatsBadge } from './BiweeklyStageStatsBadge';
import { PlateActionMenu } from './PlateActionMenu';
import {
  ShieldCheck,
  CheckCircle2,
  Wrench,
  RotateCw,
  Loader2,
  Phone,
  User,
} from 'lucide-react';
import { toPersianDigits } from '../lib/iranPlate';

export interface PlateCardProps {
  item: { vehicle: VehicleInfo; driver: DriverInfo };
  isSelected?: boolean;
  onToggleSelect?: (key: string) => void;
  onRegisterTransport: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => Promise<void>;
  onRegisterRoundTrip: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onFixError?: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onRetryWaybill?: (plateId: string) => Promise<void>;
  onDeletePlate: (plateId: string, itemKey: string) => Promise<void>;
  onToggleCarriageStatus?: (key: string) => void;
  isRetrying?: boolean;
  isRegisteringTransport?: boolean;
}

export const PlateCard: React.FC<PlateCardProps> = ({
  item,
  isSelected = false,
  onToggleSelect,
  onRegisterTransport,
  onRegisterRoundTrip,
  onFixError,
  onRetryWaybill,
  onDeletePlate,
  onToggleCarriageStatus,
  isRetrying = false,
  isRegisteringTransport = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const key = `${item.vehicle.plate.part1}-${item.vehicle.plate.letter}-${item.vehicle.plate.part2}-${item.vehicle.plate.provinceCode}`;
  const plateId = item.vehicle.id || key;
  const plateLabel = `${item.vehicle.plate.part1} ${item.vehicle.plate.letter} ${item.vehicle.plate.part2}`;

  const hasError =
    item.vehicle.permitStatus === 'ERROR' ||
    item.vehicle.lastIssuanceStatus === 'ERROR' ||
    Boolean(item.vehicle.lastErrorMessage);

  const handleRegisterClick = async () => {
    setInternalLoading(true);
    try {
      await onRegisterTransport(item);
    } finally {
      setInternalLoading(false);
    }
  };

  const isLoading = isRegisteringTransport || internalLoading;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white dark:bg-gray-900 ${
        isSelected
          ? 'border-orange-500 shadow-md shadow-orange-500/10'
          : hasError
          ? 'border-rose-300 dark:border-rose-900/50 hover:border-rose-500'
          : 'border-gray-200 dark:border-gray-800 hover:border-orange-500/50 hover:shadow-xs'
      }`}
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* Top: Plate Badge & Selection / Type */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(key)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
            )}
            <PlateBadge
              plate={item.vehicle.plate}
              tonnageKg={item.vehicle.maxLoadCapacityKg}
              biweeklyWaybillCount={item.vehicle.biweeklyWaybillCount}
              biweeklyQuotaLimit={item.vehicle.biweeklyQuotaLimit ?? 15}
              size="md"
            />
          </div>

          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
            {item.vehicle.vehicleType}
          </span>
        </div>

        {/* Driver Information */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>نام راننده:</span>
            </span>
            <span className="font-bold text-gray-900 dark:text-white">{item.driver.fullName}</span>
          </div>

          <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>موبایل:</span>
            </span>
            <span className="font-mono">{toPersianDigits(item.driver.mobile)}</span>
          </div>

          <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">وضعیت حمل:</span>
            <button
              type="button"
              onClick={() => onToggleCarriageStatus && onToggleCarriageStatus(key)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                item.vehicle.carriageStatus === 'IN_TRANSIT'
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {item.vehicle.carriageStatus === 'IN_TRANSIT' ? 'در حال حمل' : 'پایان حمل'}
            </button>
          </div>

          {/* Dual Stage Waybill Stats */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-[11px]">آمار تفکیکی:</span>
            <BiweeklyStageStatsBadge
              stage1Count={item.vehicle.stage1WaybillCount}
              stage2Count={item.vehicle.stage2WaybillCount}
              totalCount={item.vehicle.biweeklyWaybillCount}
              quotaLimit={item.vehicle.biweeklyQuotaLimit ?? 15}
              size="sm"
            />
          </div>
        </div>

        {/* Bottom Actions Bar (Zero Municipality Tolls below buttons) */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
          {hasError ? (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-rose-500 dark:text-rose-300 truncate max-w-[140px]">
                {item.vehicle.lastErrorMessage || item.vehicle.permitErrorMessage || 'خطای استعلام'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {onFixError && (
                  <button
                    type="button"
                    disabled={isRetrying}
                    onClick={() => onFixError(item)}
                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm disabled:opacity-50"
                  >
                    {isRetrying ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wrench className="w-3.5 h-3.5" />
                    )}
                    <span>رفع خطا</span>
                  </button>
                )}
                <PlateActionMenu
                  plateId={plateId}
                  plateLabel={plateLabel}
                  onRetry={onRetryWaybill || (async () => {})}
                  onDelete={() => onDeletePlate(plateId, key)}
                />
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>پروانه معتبر</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleRegisterClick}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="ثبت فوری باربرگ با حمل"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال ثبت...</span>
                    </>
                  ) : (
                    <span>ثبت با حمل</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRegisterRoundTrip(item)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                >
                  رفت و برگشت
                </button>

                <PlateActionMenu
                  plateId={plateId}
                  plateLabel={plateLabel}
                  onRetry={onRetryWaybill || (async () => {})}
                  onDelete={() => onDeletePlate(plateId, key)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlateCard;
