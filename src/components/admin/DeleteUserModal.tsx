import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { SupportUserItem } from './EditCapacityModal';

interface DeleteUserModalProps {
  user: SupportUserItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userId: string, message: string) => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token') || 'jwt_token_00000000-0000-0000-0000-000000000000_heliya';
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'خطا در حذف حساب کاربری.');
      }

      onSuccess(
        user.id,
        data.message || `حساب کاربری «${user.full_name || user.username}» با موفقیت حذف گردید.`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'خطای شبکه در اتصال به سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleText =
    user.role === 'DRIVER'
      ? 'راننده ناوگان'
      : user.role === 'ADMIN'
      ? 'مدیر سیستم'
      : 'پشتیبان / صادرکننده';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 text-gray-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">حذف کامل پنل کاربری</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">عملیات مدیریتی برگشت‌ناپذیر</p>
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

        {/* User Card */}
        <div className="p-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">نام و نام خانوادگی:</span>
            <span className="font-bold text-white">{user.full_name || user.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">نام کاربری:</span>
            <span className="font-mono text-orange-400 font-bold">{user.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">نقش کاربری:</span>
            <span className="font-bold text-neutral-300">{roleText}</span>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            آیا از حذف کامل حساب کاربری این فرد اطمینان دارید؟ دسترسی کاربر به سیستم قطع شده و
            تمامی پلاک‌های متصل به این پنل غیرفعال خواهند شد.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/50 border border-rose-900 text-rose-300 rounded-xl text-xs">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال حذف...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>تایید و حذف اکانت</span>
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
      </div>
    </div>
  );
};
