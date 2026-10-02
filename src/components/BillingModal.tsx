import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  UploadCloud,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { toPersianDigits } from '../lib/iranPlate';

export const BillingModal: React.FC = () => {
  const { isBillingOpen, setIsBillingOpen, isBlocked, approvePayment, setDemoScenario } =
    useSubscription();

  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedSheba, setCopiedSheba] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [adminApproving, setAdminApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Close on Escape key (if not blocked)
  useEffect(() => {
    if (!isBillingOpen || isBlocked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBillingOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBillingOpen, isBlocked, setIsBillingOpen]);

  if (!isBillingOpen) return null;

  const cardNumber = '۶۰۳۷-۹۹۷۵-۱۸۹۲-۳۴۵۶';
  const shebaNumber = 'IR54-0170-0000-0018-9234-5601';

  const handleCopy = (text: string, type: 'card' | 'sheba') => {
    navigator.clipboard.writeText(text.replace(/-/g, ''));
    if (type === 'card') {
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2000);
    } else {
      setCopiedSheba(true);
      setTimeout(() => setCopiedSheba(false), 2000);
    }
  };

  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 900);
  };

  const handleAdminApproveClick = async () => {
    setAdminApproving(true);
    try {
      const res = await approvePayment('usr-90421');
      setApprovalMessage(res.message);
      setTimeout(() => {
        setIsBillingOpen(false);
        setApprovalMessage(null);
      }, 2000);
    } finally {
      setAdminApproving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => {
        // If not blocked, allow outside click dismiss
        if (!isBlocked) setIsBillingOpen(false);
      }}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-right animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100">
                راهنمای تمدید اشتراک و پرداخت دوره ۱ ماهه
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                پلتفرم هلی‌بار • حساب کاربری پشتیبان
              </p>
            </div>
          </div>
          {/* Close / Return button (only if not blocked) */}
          {!isBlocked ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBillingOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="بازگشت به داشبورد"
              >
                <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                <span>بازگشت</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBillingOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="بستن (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[11px] font-bold">
              دسترسی مسدود است
            </span>
          )}
        </div>

        {/* Current Plan Card */}
        <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/30 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              طرح فعال
            </span>
            <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
              اشتراک ماهانه نامحدود ماژول‌های هلی‌بار
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              دوره جلالی دقیق (۳۰ روز کاری) با امکان صدور همگام و ناهمگام بارنامه سپاد
            </p>
          </div>
          <div className="text-left shrink-0">
            <div className="text-lg font-black text-orange-600 dark:text-orange-400">
              {toPersianDigits('2,500,000')}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">تومان / ماهانه</span>
          </div>
        </div>

        {/* Banking Information */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-gray-800 dark:text-gray-200">
            مشخصات حساب بانکی جهت واریز وجه:
          </h5>
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">بانک مقصد:</span>
              <span className="font-bold text-gray-900 dark:text-white">بانک ملی ایران (شعبه مرکزی)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">صاحب حساب:</span>
              <span className="font-bold text-gray-900 dark:text-white">شرکت داده‌پردازی هلی‌بار پایتخت</span>
            </div>

            {/* Card Number */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">شماره کارت:</span>
                <span className="font-mono text-sm font-bold text-orange-600 dark:text-orange-300 tracking-wider">
                  {cardNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(cardNumber, 'card')}
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCard ? 'کپی شد' : 'کپی'}</span>
              </button>
            </div>

            {/* Sheba Number */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">شماره شبا:</span>
                <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200 tracking-wide">
                  {shebaNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(shebaNumber, 'sheba')}
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedSheba ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSheba ? 'کپی شد' : 'کپی'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Payment Receipt Submission Form */}
        {!submitSuccess ? (
          <form onSubmit={handleReceiptSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
              شماره پیگیری واریز / کد ارجاع فیش بانکی:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="مثال: ۸۹۰۲۳۴۱"
                className="flex-1 bg-white border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-mono text-left outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-orange-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ثبت...' : 'ارسال فیش'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>فیش واریزی شما با شماره پیگیری «{receiptNumber}» ثبت گردید و در صف بررسی واحد مالی ادمین قرار گرفت.</span>
          </div>
        )}

        {/* Admin Quick Action */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-orange-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
              <ShieldCheck className="w-4 h-4" />
              <span>عملیات ادمین سیستم (Admin Quick Approval)</span>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
              POST /api/admin/users/:id/approve-payment
            </span>
          </div>

          <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
            جهت تسریع تست سناریو، با کلیک بر روی دکمه زیر، درخواست تأیید ادمین ارسال شده و اشتراک دقیقاً به مدت ۱ ماه جلالی تمدید و قفل پنل بازگشایی می‌شود:
          </p>

          <button
            type="button"
            disabled={adminApproving}
            onClick={handleAdminApproveClick}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {adminApproving
                ? 'در حال تأیید ادمین...'
                : 'تأیید پرداخت توسط ادمین و تمدید ۱ ماه جلالی'}
            </span>
          </button>

          {approvalMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
              {approvalMessage}
            </div>
          )}
        </div>

        {/* Testing / Demo Scenario Controls */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block">
            آزمون سناریوهای اشتراک (تست سریع هشدارها و مسدودسازی):
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoScenario('14_days')}
              className="py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 text-[11px] font-medium border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors"
            >
              سناریو ۱۴ روز (نارنجی)
            </button>
            <button
              type="button"
              onClick={() => setDemoScenario('7_days')}
              className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 text-[11px] font-medium border border-rose-200 dark:border-rose-800/60 cursor-pointer transition-colors"
            >
              سناریو ۷ روز (چشمک‌زن)
            </button>
            <button
              type="button"
              onClick={() => setDemoScenario('blocked')}
              className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
            >
              سناریو انقضا (مسدود)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
