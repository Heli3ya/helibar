import React, { useState } from 'react';
import {
  Users,
  Sliders,
  Copy,
  Check,
  Layers,
  Trash2,
  Headphones,
  Truck,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toPersianDigits } from '../../lib/iranPlate';
import { EditCapacityModal, SupportUserItem } from './EditCapacityModal';
import { DeleteUserModal } from './DeleteUserModal';

interface UserListProps {
  users: SupportUserItem[];
  onCapacityUpdated: (userId: string, newCapacity: number, message: string) => void;
  onUserDeleted: (userId: string, message: string) => void;
  onToggleAccess?: (userId: string, isActive: boolean, message: string) => void;
  isLoading?: boolean;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  onCapacityUpdated,
  onUserDeleted,
  onToggleAccess,
  isLoading = false,
}) => {
  const [selectedUserForCapacity, setSelectedUserForCapacity] = useState<SupportUserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<SupportUserItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleAccess = async (user: SupportUserItem) => {
    if (isTogglingId) return;
    setIsTogglingId(user.id);
    try {
      const token =
        localStorage.getItem('helibar_auth_token') ||
        localStorage.getItem('bargooo_auth_token') ||
        'jwt_token_admin';

      const res = await fetch(`/api/admin/users/${user.id}/toggle-access`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'خطا در تغییر وضعیت دسترسی کاربر.');
      }

      if (onToggleAccess) {
        onToggleAccess(user.id, data.is_active, data.message);
      }
    } catch (err: any) {
      alert(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsTogglingId(null);
    }
  };

  const renderRoleBadge = (role?: string) => {
    const normalizedRole = (role || 'SUPPORT').toUpperCase();
    if (normalizedRole === 'DRIVER') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <Truck className="w-3.5 h-3.5" />
          <span>راننده ناوگان</span>
        </span>
      );
    }
    if (normalizedRole === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/25">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>مدیر سیستم</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-orange-500/10 text-orange-400 border border-orange-500/25">
        <Headphones className="w-3.5 h-3.5" />
        <span>پشتیبان / صادرکننده</span>
      </span>
    );
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">مدیریت کاربران و پنل‌های سامانه</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              لیست کامل کاربران با تفکیک نقش کاربری، سقف ظرفیت پلاک و امکان ویرایش یا حذف اکانت
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold bg-neutral-800 text-orange-400 px-3 py-1 rounded-full border border-neutral-700">
          {toPersianDigits(users.length)} کاربر فعال
        </span>
      </div>

      {/* Users Table / List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-neutral-400">
          در حال بارگذاری لیست کاربران...
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500">
          هیچ حساب کاربری ثبت نشده است.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[11px] font-bold">
                <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                <th className="py-2.5 px-3">نام کاربری</th>
                <th className="py-2.5 px-3">نقش کاربری</th>
                <th className="py-2.5 px-3">شماره تماس</th>
                <th className="py-2.5 px-3">کد ملی / شهر</th>
                <th className="py-2.5 px-3 text-center">سقف ظرفیت پلاک</th>
                <th className="py-2.5 px-3 text-center">وضعیت دسترسی</th>
                <th className="py-2.5 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-800/40 transition">
                  {/* Full Name */}
                  <td className="py-3 px-3 font-bold text-white">
                    {u.full_name || u.username}
                  </td>

                  {/* Username with Copy */}
                  <td className="py-3 px-3">
                    <div className="inline-flex items-center gap-1.5 bg-neutral-800/80 px-2 py-1 rounded-lg border border-neutral-700/60">
                      <span className="font-mono text-orange-400 font-bold text-[11px]">
                        {u.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(u.username, u.id)}
                        className="text-neutral-400 hover:text-white transition cursor-pointer"
                        title="کپی نام کاربری"
                      >
                        {copiedId === u.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Role Badge Column */}
                  <td className="py-3 px-3">
                    {renderRoleBadge(u.role)}
                  </td>

                  {/* Mobile */}
                  <td className="py-3 px-3 text-neutral-300 font-mono text-[11px]">
                    {toPersianDigits(u.mobile)}
                  </td>

                  {/* National ID / City */}
                  <td className="py-3 px-3 text-neutral-400 text-[11px]">
                    <div>{u.national_id ? toPersianDigits(u.national_id) : '—'}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{u.province_city || '—'}</div>
                  </td>

                  {/* Plate Capacity */}
                  <td className="py-3 px-3 text-center">
                    {u.role === 'DRIVER' ? (
                      <span className="text-[11px] text-neutral-500 font-mono">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                        <Layers className="w-3 h-3" />
                        {toPersianDigits(u.plate_capacity || 50)} پلاک
                      </span>
                    )}
                  </td>

                  {/* Access Status: Active vs Suspended */}
                  <td className="py-3 px-3 text-center">
                    {u.is_active !== false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>فعال</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                        <Ban className="w-3 h-3" />
                        <span>مسدود (عدم دسترسی)</span>
                      </span>
                    )}
                  </td>

                  {/* Actions: Edit Capacity + Suspend Access + Delete Account */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
                      {/* Edit Capacity Button (for SUPPORT) */}
                      {u.role !== 'DRIVER' && (
                        <button
                          type="button"
                          onClick={() => setSelectedUserForCapacity(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-black font-bold text-xs border border-orange-500/40 transition cursor-pointer active:scale-95"
                          title="ویرایش سقف ظرفیت پلاک"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>ویرایش ظرفیت</span>
                        </button>
                      )}

                      {/* Suspend / Reactivate Button */}
                      {u.role !== 'DRIVER' && (
                        <button
                          type="button"
                          disabled={isTogglingId === u.id}
                          onClick={() => handleToggleAccess(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                            u.is_active !== false
                              ? 'bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border-amber-500/30'
                              : 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border-emerald-500/30'
                          }`}
                          title={u.is_active !== false ? 'عدم دسترسی صادرکننده (مسدودسازی پنل)' : 'فعال‌سازی مجدد دسترسی صادرکننده'}
                        >
                          {isTogglingId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : u.is_active !== false ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{u.is_active !== false ? 'عدم دسترسی صادرکننده' : 'فعال‌سازی دسترسی'}</span>
                        </button>
                      )}

                      {/* Delete Account Button */}
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs border border-rose-500/30 transition cursor-pointer active:scale-95"
                        title="حذف کامل اکانت و پنل کاربر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف اکانت</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Capacity Modal */}
      {selectedUserForCapacity && (
        <EditCapacityModal
          user={selectedUserForCapacity}
          isOpen={true}
          onClose={() => setSelectedUserForCapacity(null)}
          onSuccess={(userId, newCapacity, message) => {
            onCapacityUpdated(userId, newCapacity, message);
          }}
        />
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          isOpen={true}
          onClose={() => setUserToDelete(null)}
          onSuccess={(userId, message) => {
            onUserDeleted(userId, message);
          }}
        />
      )}
    </div>
  );
};
