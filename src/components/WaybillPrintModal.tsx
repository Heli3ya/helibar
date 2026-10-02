import React, { useState, useEffect, useRef } from 'react';
import { WaybillItem } from '../types';
import { PlateBadge } from './PlateBadge';
import { toPersianDigits, formatRials } from '../lib/iranPlate';
import {
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Download,
  ArrowRight,
  Loader2,
  Check,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface WaybillPrintModalProps {
  waybill: WaybillItem | null;
  onClose: () => void;
}

export const WaybillPrintModal: React.FC<WaybillPrintModalProps> = ({ waybill, onClose }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!waybill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-waybill');
    if (!element) return;

    setIsGeneratingPdf(true);
    setPdfSuccess(false);

    try {
      // Capture element as high-res canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `barberg_${waybill.waybillNumber || 'waybill'}_${waybill.vehicle.plate.part1}${waybill.vehicle.plate.letter}${waybill.vehicle.plate.part2}.pdf`;
      pdf.save(fileName);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Fallback: trigger print dialog allowing "Save as PDF"
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        // Close if backdrop clicked
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Inject Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-waybill, #printable-waybill * {
            visibility: visible !important;
          }
          #printable-waybill {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        ref={modalContentRef}
        className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 border border-slate-700/30 flex flex-col"
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-slate-950 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Primary Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 active:scale-95"
              title="بازگشت به صفحه قبلی (Esc)"
            >
              <ArrowRight className="w-4 h-4 text-orange-400" />
              <span>بازگشت به آرشیو</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 border-r border-slate-800 pr-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-100">نسخه رسمی بارنامه شهری (باربرگ)</h3>
                <p className="text-[11px] text-slate-400">
                  سریال: {toPersianDigits(waybill.waybillNumber)} | کد رهگیری سپاد: {toPersianDigits(waybill.trackingCode || 'در انتظار')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 ${
                pdfSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-black'
              }`}
              title="دانلود مستقیم سند باربرگ در قالب فایل PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ایجاد PDF...</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>دانلود شد!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>دانلود نسخه PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
              title="ارسال مستقیم به چاپگر (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">چاپ باربرگ</span>
              <span className="sm:hidden">چاپ</span>
            </button>

            {/* Close Button 'X' */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
              title="بستن (Esc)"
              aria-label="بستن باربرگ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="printable-waybill" className="p-4 sm:p-8 bg-white font-sans text-xs leading-relaxed">
          {/* Header */}
          <div className="border-2 border-slate-800 p-4 rounded-lg mb-4 bg-slate-50/50">
            <div className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-12 sm:col-span-3 text-right space-y-1">
                <p className="font-bold text-slate-900">شماره سریال: <span className="font-mono text-sm">{toPersianDigits(waybill.waybillNumber)}</span></p>
                <p className="text-slate-600">تاریخ صدور: {toPersianDigits(waybill.issueDateTime)}</p>
                <p className="text-slate-600">کد شرکت: <span className="font-mono font-bold">{toPersianDigits(waybill.companyCode)}</span></p>
              </div>

              <div className="col-span-12 sm:col-span-6 text-center space-y-1">
                <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-black text-sm mb-1">
                  باربرگ الکترونیکی حمل بار درون‌شهری
                </div>
                <h1 className="text-sm sm:text-base font-black text-slate-900">سامانه مرکزی مدیریت حمل و نقل بار درون‌شهری (سپاد - UTCMS)</h1>
                <p className="text-xs text-slate-900 font-black tracking-wide">helibar | هلیبار</p>
              </div>

              <div className="col-span-12 sm:col-span-3 flex flex-col items-center justify-center space-y-1">
                {/* Visual Barcode simulation */}
                <div className="h-10 w-36 bg-slate-900 flex items-center justify-between px-1 py-1 text-[7px] text-white font-mono tracking-widest">
                  ||||| | | || ||| || |||
                </div>
                <p className="font-mono font-bold text-[10px] text-slate-800">
                  {waybill.trackingCode ? toPersianDigits(waybill.trackingCode) : 'UTCMS-PENDING'}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3 h-3" /> اصالت تایید شده سپاد
                </span>
              </div>
            </div>
          </div>

          {/* Sender & Receiver Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Sender */}
            <div className="border border-slate-300 rounded-lg p-3 bg-white">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 flex justify-between">
                <span>مشخصات فرستنده (مبدا)</span>
                <span className="text-slate-500 font-normal">شهر: {waybill.senderCity}</span>
              </div>
              <div className="space-y-1 text-slate-700">
                <p><strong className="text-slate-900">نام فرستنده:</strong> {waybill.senderName}</p>
                <p><strong className="text-slate-900">کد/شناسه ملی:</strong> {toPersianDigits(waybill.senderNationalId)}</p>
                <p><strong className="text-slate-900">نشانی دقیق:</strong> {waybill.senderAddress}</p>
              </div>
            </div>

            {/* Receiver */}
            <div className="border border-slate-300 rounded-lg p-3 bg-white">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 flex justify-between">
                <span>مشخصات گیرنده (مقصد)</span>
                <span className="text-slate-500 font-normal">شهر: {waybill.receiverCity}</span>
              </div>
              <div className="space-y-1 text-slate-700">
                <p><strong className="text-slate-900">نام گیرنده:</strong> {waybill.receiverName}</p>
                <p><strong className="text-slate-900">کد/شناسه ملی:</strong> {toPersianDigits(waybill.receiverNationalId)}</p>
                <p><strong className="text-slate-900">نشانی دقیق:</strong> {waybill.receiverAddress}</p>
              </div>
            </div>
          </div>

          {/* Fleet & Driver Box */}
          <div className="border border-slate-300 rounded-lg p-3 mb-4 bg-white">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
              <span>مشخصات ناوگان حمل و راننده</span>
              <span className="text-emerald-700 font-semibold text-[11px]">وضعیت کارت هوشمند: فعال</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4 flex flex-col items-center justify-center gap-1.5">
                <PlateBadge
                  plate={waybill.vehicle.plate}
                  tonnageKg={waybill.vehicle.maxLoadCapacityKg}
                  size="md"
                />
              </div>
              <div className="md:col-span-4 space-y-1 text-slate-700">
                <p><strong className="text-slate-900">نوع ناوگان:</strong> {waybill.vehicle.vehicleType}</p>
                <p><strong className="text-slate-900">کارت هوشمند خودرو:</strong> {toPersianDigits(waybill.vehicle.smartCardNumber)}</p>
                <p><strong className="text-slate-900">اعتبار معاینه فنی:</strong> {toPersianDigits(waybill.vehicle.technicalInspectionExpiry)}</p>
                <p><strong className="text-slate-900">شماره بیمه‌نامه:</strong> {waybill.vehicle.insurancePolicyNumber}</p>
              </div>
              <div className="md:col-span-4 space-y-1 text-slate-700">
                <p><strong className="text-slate-900">نام و نام خانوادگی راننده:</strong> {waybill.driver.fullName}</p>
                <p><strong className="text-slate-900">کد ملی راننده:</strong> {toPersianDigits(waybill.driver.nationalCode)}</p>
                <p><strong className="text-slate-900">شماره موبایل:</strong> {toPersianDigits(waybill.driver.mobile)}</p>
                <p><strong className="text-slate-900">کارت هوشمند راننده:</strong> {toPersianDigits(waybill.driver.smartCardNumber)}</p>
              </div>
            </div>
          </div>

          {/* Cargo Info & Financial Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            {/* Cargo */}
            <div className="md:col-span-6 border border-slate-300 rounded-lg p-3 bg-white">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                مشخصات کالا و بار
              </div>
              <table className="w-full text-right text-[11px]">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-500">شرح محموله:</td>
                    <td className="py-1 font-bold text-slate-900">{waybill.cargoDescription}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-500">وزن بار:</td>
                    <td className="py-1 font-bold text-slate-900">{toPersianDigits(waybill.weightKg.toLocaleString())} کیلوگرم</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-500">نوع بسته‌بندی:</td>
                    <td className="py-1 font-bold text-slate-900">{waybill.packingType}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500">ارزش ریالی اظهار شده:</td>
                    <td className="py-1 font-bold text-slate-900">{formatRials(waybill.cargoValueRials)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financials */}
            <div className="md:col-span-6 border border-slate-300 rounded-lg p-3 bg-white">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                محاسبه مالی و عوارض قانونی
              </div>
              <table className="w-full text-right text-[11px]">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-500">کرایه خالص راننده:</td>
                    <td className="py-1 font-mono text-slate-900">{formatRials(waybill.freightCostRials)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-500">حق کمیسیون صادرکننده:</td>
                    <td className="py-1 font-mono text-slate-900">{formatRials(waybill.commissionRials)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-500">حق بیمه مسئولیت مدنی:</td>
                    <td className="py-1 font-mono text-slate-900">{formatRials(waybill.insuranceCostRials)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-500">عوارض شهرداری (۵٪):</td>
                    <td className="py-1 font-mono text-slate-900">{formatRials(waybill.municipalTollRials)}</td>
                  </tr>
                  <tr className="bg-amber-50 font-bold text-slate-950">
                    <td className="py-1.5 px-2">مجموع کل پرداختی:</td>
                    <td className="py-1.5 px-2 font-mono text-xs">{formatRials(waybill.totalCostRials)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sipaad Verification Footnote */}
          <div className="border border-dashed border-emerald-600/50 bg-emerald-50/50 p-2.5 rounded-lg mb-4 text-[10px] text-slate-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-900">تطبیق امنیتی سپاد: </span>
              کد اعتبارسنجی SHA-512 و شناسه Salt معتبر ثبت گردیده است.
              {waybill.sipaadResponse?.saltUsed && (
                <span className="font-mono mr-2 text-slate-600">
                  (Salt: {toPersianDigits(waybill.sipaadResponse.saltUsed)})
                </span>
              )}
            </div>
            <div className="font-mono text-slate-500 text-[9px] truncate max-w-xs" title={waybill.sipaadResponse?.hashedSignature}>
              Hash: {waybill.sipaadResponse?.hashedSignature?.slice(0, 24)}...
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-slate-800 text-center">
            <div className="h-20 flex flex-col justify-between">
              <span className="font-bold text-slate-800">امضا و اثر انگشت راننده</span>
              <span className="text-[10px] text-slate-400">صحت اطلاعات بار و کرایه تایید می‌شود</span>
            </div>
            <div className="h-20 flex flex-col justify-between">
              <span className="font-bold text-slate-800">مهر و امضای شرکت صادرکننده</span>
              <div className="w-16 h-16 border-2 border-dashed border-blue-600/40 rounded-full mx-auto flex items-center justify-center text-[9px] text-blue-700 font-bold">
                مهر رسمی
              </div>
            </div>
            <div className="h-20 flex flex-col justify-between">
              <span className="font-bold text-slate-800">امضا و تایید گیرنده کالا</span>
              <span className="text-[10px] text-slate-400">کالا صحیح و سالم تحویل گرفته شد</span>
            </div>
          </div>
        </div>

        {/* Bottom Control / Return Footer Bar (Hidden when printing) */}
        <div className="no-print bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300 dark:border-slate-700 active:scale-95"
            >
              <ArrowRight className="w-4 h-4 text-orange-500" />
              <span>بازگشت و بستن باربرگ</span>
            </button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              یا کلید Escape را فشار دهید
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>دانلود نسخه PDF باربرگ</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ رسمی پرینتر</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
