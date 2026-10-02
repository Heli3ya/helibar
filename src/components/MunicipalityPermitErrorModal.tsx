import React from 'react';
import { motion } from 'motion/react';
import { VehicleInfo, DriverInfo } from '../types';
import { PlateBadge } from './PlateBadge';
import { Building2, X, AlertTriangle, Clock } from 'lucide-react';

interface MunicipalityPermitErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  item: { vehicle: VehicleInfo; driver: DriverInfo } | null;
}

export const MunicipalityPermitErrorModal: React.FC<MunicipalityPermitErrorModalProps> = ({
  isOpen,
  onClose,
  onAcknowledge,
  item,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-gray-100">خطای پروانه شهرداری</h3>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
              نیازمند پیگیری در سامانه مدیریت بار و پایانه‌های شهرداری
            </span>
          </div>
        </div>

        {/* Vehicle & Plate Overview */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{item.driver.fullName}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.vehicle.vehicleType}</div>
          </div>
          <PlateBadge plate={item.vehicle.plate} size="sm" />
        </div>

        {/* Clean Stated Message Required */}
        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/25 mb-5 flex items-start gap-3 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed font-semibold">
            این خطا مربوط به اعتبار پروانه است. نیازمند مراجعه به شهرداری میباشید.
          </div>
        </div>

        {/* Action Button: Acknowledge and mark as pending */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-orange-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={() => {
              onAcknowledge(item);
              onClose();
            }}
            className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Clock className="w-4 h-4 stroke-[2.5]" />
            <span>متوجه شدم (ثبت به عنوان در انتظار بررسی)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
