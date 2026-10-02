import React from 'react';
import { Lock, CreditCard, ShieldAlert, PhoneCall, RefreshCw } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

export const BlockOverlay: React.FC = () => {
  const { isBlocked, setIsBillingOpen, refreshStatus } = useSubscription();

  if (!isBlocked) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] bg-neutral-950/96 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none"
      style={{ touchAction: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-lg bg-neutral-900 border border-orange-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-orange-950/50 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Glow ambient background */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-orange-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Lock Icon Badge */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-orange-500/10 border-2 border-orange-500/50 flex items-center justify-center text-orange-400 shadow-inner shadow-orange-500/20">
          <Lock className="w-10 h-10 text-orange-400 animate-pulse" />
        </div>

        {/* Header Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>مسدودسازی خودکار دسترسی پنل</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            پایان مهلت دوره اشتراک
          </h2>
        </div>

        {/* Polite but firm required message */}
        <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-neutral-300 text-sm sm:text-base leading-relaxed text-right space-y-2">
          <p className="font-semibold text-neutral-200">
            مدت زمان اشتراک شما به پایان رسیده است. لطفاً جهت تمدید و بازگشایی دسترسی، اقدام به پرداخت نموده و منتظر تایید ادمین بمانید.
          </p>
          <p className="text-xs text-neutral-400 font-normal">
            کلیه درخواست‌های ثبت بارنامه، استعلام پلاک و ارسال باربرگ تا زمان ثبت تأییدیه مالی توسط واحد مدیریت کل غیرفعال می‌باشند.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => setIsBillingOpen(true)}
            className="w-full py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-950/60 cursor-pointer active:scale-[0.98]"
          >
            <CreditCard className="w-5 h-5" />
            <span>مشاهده راهنمای پرداخت و ثبت فیش</span>
          </button>

          <button
            type="button"
            onClick={() => refreshStatus()}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-neutral-300 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بررسی وضعیت تایید ادمین (بروزرسانی)</span>
          </button>
        </div>

        {/* Support Contact Footer */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-center gap-2 text-xs text-neutral-500">
          <PhoneCall className="w-3.5 h-3.5 text-orange-400/80" />
          <span>پشتیبانی مرکزی هلی‌بار: ۰۲۱-۸۸۴۵۰۰۰۰ (داخلی ۳ مالی)</span>
        </div>
      </div>
    </div>
  );
};
