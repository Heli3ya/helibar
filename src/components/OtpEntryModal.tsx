import React, { useState, useEffect } from 'react';
import { IranPlate, VehicleInfo, DriverInfo } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits } from '../lib/iranPlate';
import { KeyRound, X, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

interface OtpEntryModalProps {
  vehicle: VehicleInfo;
  driver: DriverInfo;
  onClose: () => void;
  onVerifySuccess: (plateStr: string, code: string) => void;
}

export const OtpEntryModal: React.FC<OtpEntryModalProps> = ({
  vehicle,
  driver,
  onClose,
  onVerifySuccess,
}) => {
  const [code, setCode] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(118);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${toPersianDigits(m)}:${s < 10 ? '۰' : ''}${toPersianDigits(s)}`;
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 4) {
      setErrorMessage('لطفاً کد تایید ۴ تا ۶ رقمی را وارد نمایید.');
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const plateStr = `${vehicle.plate.part1}${vehicle.plate.letter}${vehicle.plate.part2}`;
      onVerifySuccess(plateStr, code.trim());
      onClose();
    }, 600);
  };

  const handleResend = () => {
    setSecondsRemaining(120);
    setCode('');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">تأیید کد دوعاملی (OTP)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">احراز هویت راننده جهت صدور بارنامه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-5 space-y-4">
          {/* Plate & Driver brief */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between gap-3">
            <PlateBadge plate={vehicle.plate} size="sm" />
            <div className="text-right text-xs">
              <div className="text-gray-900 dark:text-gray-100 font-bold">{driver.fullName}</div>
              <div className="text-gray-500 dark:text-gray-400 font-mono text-[11px] dir-ltr text-right">
                {driver.mobile}
              </div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              کد اعتبارسنجی موقت به شماره همراه راننده پیامک شده است:
            </p>
            <p className="text-xs font-mono font-bold text-orange-500">
              {toPersianDigits(driver.mobile)}
            </p>
          </div>

          {/* OTP Input Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
              کد ۴ تا ۶ رقمی پیامک‌شده را وارد کنید:
            </label>
            <div className="flex justify-center">
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={code}
                onChange={e => {
                  setCode(e.target.value.replace(/[^0-9]/g, ''));
                  setErrorMessage('');
                }}
                placeholder="• • • • • •"
                className="w-48 py-3 text-center text-2xl font-mono tracking-[0.5em] bg-white dark:bg-gray-800 border-2 border-orange-500 focus:border-orange-600 rounded-xl text-gray-900 dark:text-white outline-none shadow-inner transition-all"
              />
            </div>
            {errorMessage && (
              <p className="text-[11px] text-rose-500 text-center font-medium">{errorMessage}</p>
            )}
          </div>

          {/* Countdown & Resend */}
          <div className="flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>اعتبار کد:</span>
              <span className="font-mono font-bold text-orange-500">{formatTime(secondsRemaining)}</span>
            </div>

            <button
              type="button"
              disabled={secondsRemaining > 0}
              onClick={handleResend}
              className={`flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                secondsRemaining === 0
                  ? 'text-orange-500 hover:text-orange-600 underline'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>ارسال مجدد پیامک</span>
            </button>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-orange-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>تأیید و اعمال کد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
