import React, { useState, useEffect } from 'react';
import { GlobalBackButton } from '../GlobalBackButton';
import {
  UserPlus,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { toPersianDigits } from '../../lib/iranPlate';
import { CreateUser } from './CreateUser';
import { UserList } from './UserList';
import { SupportUserItem } from './EditCapacityModal';

interface CreateUserPanelProps {
  onNavigateBack?: () => void;
  onUserCreated?: (user: { id: string; username: string; plate_capacity: number }) => void;
}

export const CreateUserPanel: React.FC<CreateUserPanelProps> = ({
  onNavigateBack,
  onUserCreated,
}) => {
  // Support Users List State
  const [registeredUsers, setRegisteredUsers] = useState<SupportUserItem[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState<boolean>(false);

  // Success Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch registered support clients
  const fetchSupports = async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users/supports');
      if (res.ok) {
        const data = await res.json();
        if (data.supports && Array.isArray(data.supports)) {
          setRegisteredUsers(data.supports);
        }
      }
    } catch (e) {
      console.warn('Error fetching support clients:', e);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchSupports();
  }, []);

  const handleUserCreated = (data: {
    user_id: string;
    username: string;
    plate_capacity: number;
    message: string;
  }) => {
    showToast(data.message || `پنل مشتری «${data.username}» با ظرفیت ${toPersianDigits(data.plate_capacity)} پلاک ایجاد شد.`);
    fetchSupports();
    if (onUserCreated) {
      onUserCreated({
        id: data.user_id,
        username: data.username,
        plate_capacity: data.plate_capacity,
      });
    }
  };

  const handleCapacityUpdated = (userId: string, newCapacity: number, message: string) => {
    showToast(message);
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, plate_capacity: newCapacity } : u))
    );
  };

  const handleUserDeleted = (userId: string, message: string) => {
    showToast(message);
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleToggleAccess = (userId: string, isActive: boolean, message: string) => {
    showToast(message);
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u))
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          dir="rtl"
          className="bg-neutral-900 border border-orange-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold leading-relaxed">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <GlobalBackButton onClick={onNavigateBack} />
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-orange-400 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به داشبورد ادمین</span>
          </button>
        )}
      </div>

      {/* Grid: Create User Form + Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create User Form (8 cols) */}
        <div className="lg:col-span-8">
          <CreateUser onSuccess={handleUserCreated} />
        </div>

        {/* Right Column: Info & Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Rules & Guidance Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3 text-gray-200">
            <div className="flex items-center gap-2 text-white font-bold text-xs pb-2 border-b border-neutral-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ضوابط ایجاد کاربر و امنیت اکانت</span>
            </div>
            <ul className="text-xs text-neutral-400 space-y-2.5 list-disc list-inside leading-relaxed text-[11px]">
              <li>
                <strong className="text-neutral-200">نام کاربری و رمز عبور:</strong> صرفاً شامل حروف انگلیسی و ارقام بدون فاصله.
              </li>
              <li>
                <strong className="text-neutral-200">سقف ظرفیت ناوگان:</strong> محدود به بسته‌های رسمی ۵۰، ۱۵۰، ۳۵۰، ۵۵۰ و ۷۰۰ پلاک.
              </li>
              <li>
                <strong className="text-neutral-200">ایزولاسیون کامل داده:</strong> این کاربر صرفاً به اطلاعات و ناوگان تعریف‌شده توسط خودش دسترسی دارد.
              </li>
              <li>
                <strong className="text-neutral-200">ویرایش ظرفیت:</strong> در هر زمان از طریق جدول زیر با دکمه «ویرایش ظرفیت» قابل ارتقا یا تنزیل است.
              </li>
            </ul>
          </div>

          {/* Quick Stats Summary Card */}
          {(() => {
            const supportUsers = registeredUsers.filter((u) => u.role === 'SUPPORT' || !u.role);
            const totalAllocatedPlates = supportUsers.reduce(
              (sum, u) => sum + (Number(u.plate_capacity) || 0),
              0
            );
            const activeCount = supportUsers.filter((u) => u.is_active !== false).length;

            return (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3 text-gray-200">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Layers className="w-4 h-4 text-orange-500" />
                    <span>خلاصه سقف‌های فعال</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-neutral-800 text-orange-400 px-2.5 py-0.5 rounded-full border border-neutral-700">
                    {toPersianDigits(supportUsers.length)} حساب
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50">
                    <div className="text-[11px] text-neutral-400">مجموع پلاک‌های تخصیصی</div>
                    <div className="text-sm font-black text-orange-400 font-mono mt-1">
                      {toPersianDigits(totalAllocatedPlates)}
                    </div>
                  </div>
                  <div className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50">
                    <div className="text-[11px] text-neutral-400">حساب‌های فعال</div>
                    <div className="text-sm font-black text-emerald-400 font-mono mt-1">
                      {toPersianDigits(activeCount)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* User Management Table with Edit Capacity Action & Delete User */}
      <UserList
        users={registeredUsers.filter((u) => u.role === 'SUPPORT' || !u.role)}
        onCapacityUpdated={handleCapacityUpdated}
        onUserDeleted={handleUserDeleted}
        onToggleAccess={handleToggleAccess}
        isLoading={isUsersLoading}
      />
    </div>
  );
};
