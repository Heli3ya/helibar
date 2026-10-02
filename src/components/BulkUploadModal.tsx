import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { toPersianDigits } from '../lib/iranPlate';

export interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  showToastNotification?: (message: string) => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  showToastNotification,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPollingActive) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPollingActive]);

  if (!isOpen) return null;

  // A. Download Template Handler (calls GET /api/drivers/excel-template)
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await fetch('/api/drivers/excel-template');
      if (!response.ok) {
        throw new Error('خطا در دریافت قالب اکسل از سرور');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'helibar_drivers_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (showToastNotification) {
        showToastNotification('قالب استاندارد اکسل (۲ ستونه) با موفقیت دانلود شد.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در بارگیری فایل قالب');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setErrorMessage(null);
    setUploadMessage(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setErrorMessage('فرمت فایل نامعتبر است. لطفاً فقط فایل .xlsx یا .csv انتخاب نمایید.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // B. Bulk Upload & Register (calls POST /api/drivers/bulk-upload)
  const handleUploadAndRegister = async () => {
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    // Toast: "در حال اعتبارسنجی اطلاعات با سرور مرکزی... این عملیات ممکن است چند دقیقه طول بکشد."
    const loadingToastText =
      'در حال اعتبارسنجی اطلاعات با سرور مرکزی... این عملیات ممکن است چند دقیقه طول بکشد.';
    if (showToastNotification) {
      showToastNotification(loadingToastText);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token') || 'jwt_token_usr-sup-1';
      const response = await fetch('/api/drivers/bulk-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 202 || response.ok) {
        setUploadMessage(data.message || 'فایل دریافت شد و در حال پردازش است.');
        setIsPollingActive(true);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        throw new Error(data.detail || 'خطا در بارگذاری گروهی فایل');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setErrorMessage(null);
    setUploadMessage(null);
    setIsPollingActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between bg-gradient-to-r from-orange-500/5 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span>بارگذاری گروهی رانندگان (اکسل)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  قالب ۲ ستونه
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                اعتبارسنجی خودکار اطلاعات با سرور مرکزی UTCMS و ثبت در ناوگان
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="بازگشت به داشبورد"
            >
              <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
              <span>بازگشت</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title="بستن پنجره (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Section 1: Template Download Banner */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-gray-800 dark:text-gray-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>الگوی استاندارد دو ستونی (اکسل / CSV)</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                فایل اکسل باید دقیقاً دارای دو ستون{' '}
                <strong className="text-orange-600 dark:text-orange-400">«کد ملی»</strong> و{' '}
                <strong className="text-orange-600 dark:text-orange-400">«رمز عبور»</strong> باشد.
              </p>
            </div>

            {/* Button 1: Download Template */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 border border-gray-300 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isDownloadingTemplate ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : (
                <Download className="w-4 h-4 text-orange-500 stroke-[2.2]" />
              )}
              <span>دانلود قالب اکسل</span>
            </button>
          </div>

          {/* Section 2: Dropzone / File Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              بارگذاری فایل تکمیل شده:
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10'
                  : file
                  ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10'
                  : 'border-gray-300 dark:border-gray-700 hover:border-orange-500/70 hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <FileCheck className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900 dark:text-white" dir="ltr">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      حجم فایل: {toPersianDigits((file.size / 1024).toFixed(1))} کیلوبایت
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="mt-1 text-[11px] text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>تغییر یا حذف فایل</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <UploadCloud className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      فایل اکسل یا CSV را اینجا بکشید یا برای انتخاب کلیک کنید
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      فرمت‌های مجاز: XLSX, XLS, CSV (حداکثر ۲۰ مگابایت)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback & Status Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[2.2]" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {isUploading && (
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3 text-xs text-orange-700 dark:text-orange-300 animate-in fade-in">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">در حال ارسال فایل به سرور و راه‌اندازی فرآیند ناهمگام...</p>
                <p className="text-[11px] text-orange-600/90 dark:text-orange-400/90">
                  در حال اعتبارسنجی اطلاعات با سرور مرکزی... این عملیات ممکن است چند دقیقه طول بکشد.
                </p>
              </div>
            </div>
          )}

          {uploadMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 text-xs animate-in fade-in">
              <div className="flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 stroke-[2.2]" />
                <div className="space-y-1">
                  <p className="font-bold">{uploadMessage}</p>
                  <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed">
                    درخواست بارگذاری در نوبت اعتبارسنجی با وب‌سرویس UTCMS قرار گرفت. لیست پلاک‌های داشبورد به صورت لحظه‌ای هر ۵ ثانیه بروزرسانی می‌شود.
                  </p>
                </div>
              </div>

              {isPollingActive && (
                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1.5 font-mono">
                    <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                    <span>بروزرسانی لحظه‌ای ناوگان فعال است ({toPersianDigits(elapsedSeconds)} ثانیه)</span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">پلاک‌های تأییدشده در حال ثبت هستند</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
          >
            <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
            <span>بازگشت و بستن</span>
          </button>

          {/* Button 2: Upload & Register (Disabled if no file) */}
          <button
            type="button"
            onClick={handleUploadAndRegister}
            disabled={!file || isUploading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
              !file || isUploading
                ? 'bg-gray-400 dark:bg-gray-700 opacity-60 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 active:scale-98 shadow-orange-500/20'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>در حال پردازش و اعتبارسنجی...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 stroke-[2.2]" />
                <span>پردازش و ثبت گروهی</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
