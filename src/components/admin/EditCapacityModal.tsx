import React, { useState } from 'react';
import { Layers, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { toPersianDigits } from '../../lib/iranPlate';

export const ALLOWED_PLATE_CAPACITIES = [50, 150, 350, 550, 700] as const;
export type PlateCapacityOption = (typeof ALLOWED_PLATE_CAPACITIES)[number];

export interface SupportUserItem {
  id: string;
  username: string;
  full_name: string;
  mobile: string;
  role?: string;
  plate_capacity: number;
  national_id?: string;
  address?: string;
  province_city?: string;
  is_active: boolean;
  created_at?: string;
}

interface EditCapacityModalProps {
  user: SupportUserItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userId: string, newCapacity: number, message: string) => void;
}

export const EditCapacityModal: React.FC<EditCapacityModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedCapacity, setSelectedCapacity] = useState<PlateCapacityOption>(
    (ALLOWED_PLATE_CAPACITIES.includes(user.plate_capacity as PlateCapacityOption)
      ? user.plate_capacity
      : 150) as PlateCapacityOption
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token') || 'jwt_token_00000000-0000-0000-0000-000000000000_heliya';
      const response = await fetch(`/api/admin/users/${user.id}/capacity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_capacity: selectedCapacity }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'خطا در بروزرسانی سقف ظرفیت پلاک کاربر.');
      }

      onSuccess(
        user.id,
        selectedCapacity,
        data.message || `سقف ظرفیت پلاک مشتری به ${toPersianDigits(selectedCapacity)} ارتقا یافت.`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'خطای شبکه در ارتباط با سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 text-gray-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">ویرایش سقف ظرفیت پلاک</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                مشتری:{' '}
                <span className="text-orange-400 font-bold">
                  {user.full_name || user.username}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/40 border border-rose-900 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300">
              انتخاب ظرفیت جدید ناوگان:
            </label>
            <select
              value={selectedCapacity}
              onChange={(e) => setSelectedCapacity(Number(e.target.value) as PlateCapacityOption)}
              className="w-full h-11 px-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition cursor-pointer"
              disabled={isLoading}
            >
              {ALLOWED_PLATE_CAPACITIES.map((cap) => (
                <option key={cap} value={cap}>
                  ظرفیت {toPersianDigits(cap)} پلاک اختصاصی
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500">
              سقف قبلی: {toPersianDigits(user.plate_capacity || 50)} پلاک
            </p>
          </div>

          {/* Quick Click Badges */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-neutral-500">گزینه‌های مجاز:</span>
            {ALLOWED_PLATE_CAPACITIES.map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => setSelectedCapacity(cap)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  cap === selectedCapacity
                    ? 'bg-orange-500 text-black shadow-xs'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                {toPersianDigits(cap)}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ثبت...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>ذخیره تغییرات</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
