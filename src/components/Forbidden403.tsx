import React from 'react';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';

interface Forbidden403Props {
  onBackToDashboard?: () => void;
  message?: string;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  onBackToDashboard,
  message = 'شما دسترسی لازم برای مشاهده این بخش مدیریتی را ندارید (HTTP 403 Forbidden).',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-inner text-rose-500">
        <ShieldAlert className="w-10 h-10 stroke-[1.75]" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold mb-4">
        <Lock className="w-3.5 h-3.5" />
        <span>HTTP 403 FORBIDDEN - ACCESS DENIED</span>
      </div>

      <h1 className="text-2xl font-black text-slate-100 mb-2">
        محدودیت دسترسی مدیریتی (RBAC)
      </h1>

      <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">
        {message}
      </p>

      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-right text-xs text-slate-300 max-w-lg w-full mb-6 space-y-1.5">
        <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/80">
          <span>سیاست امنیتی سامانه هلی‌بار:</span>
          <span className="font-mono text-amber-400">ISOLATED_TENANT_POLICY</span>
        </div>
        <p className="text-slate-400">
          • کاربران نقش <span className="text-emerald-400 font-semibold">SUPPORT</span> صرفاً به داشبورد و داده‌های ناوگان تحت مالکیت خود دسترسی دارند.
        </p>
        <p className="text-slate-400">
          • ماژول‌های تنظیمات سیستمی، نظارت کلان و تغییرات زیرساختی منحصراً در اختیار مدیر ارشد (<span className="text-indigo-400 font-semibold">ADMIN</span>) می‌باشد.
        </p>
      </div>

      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-900/30"
        >
          <span>بازگشت به داشبورد اختصاصی</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
