import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, RotateCcw, Trash2, Loader2, Power } from 'lucide-react';

export interface PlateActionMenuProps {
  plateId: string;
  plateLabel?: string;
  isAutoRegisterEnabled?: boolean;
  onToggleAutoRegister?: (plateId: string) => void;
  onRetry: (plateId: string) => Promise<void>;
  onDelete: (plateId: string) => Promise<void>;
  className?: string;
}

/**
 * PlateActionMenu:
 * Clean minimalist 3-Dot Action Menu for Vehicle/Plate rows:
 * - High-contrast Light Mode and Dark Mode support
 * - Hover: hover:bg-gray-100 dark:hover:bg-gray-800 (never turns dark in Light Mode)
 * - Actions: فعال/غیرفعال کردن ثبت خودکار, ثبت مجدد, حذف پلاک
 */
export const PlateActionMenu: React.FC<PlateActionMenuProps> = ({
  plateId,
  plateLabel,
  isAutoRegisterEnabled = true,
  onToggleAutoRegister,
  onRetry,
  onDelete,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleRetryClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRetrying || isDeleting) return;
    setIsRetrying(true);
    try {
      await onRetry(plateId);
      setIsOpen(false);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRetrying || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete(plateId);
      setIsOpen(false);
    } catch (err: any) {
      console.error('Error deleting plate:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusy = isRetrying || isDeleting;

  return (
    <div className={`relative inline-block text-right ${className}`} ref={menuRef}>
      {/* 3-Dot Trigger Button */}
      <button
        type="button"
        disabled={isBusy}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="عملیات پلاک"
        title="منوی عملیات پلاک"
        className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 border-orange-300 dark:border-gray-700 shadow-xs'
            : 'bg-white dark:bg-gray-900 text-gray-500 hover:text-orange-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800'
        } ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        ) : (
          <MoreVertical className="w-4 h-4" />
        )}
      </button>

      {/* Minimalist Dropdown Menu */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1 z-50 text-right animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100 dark:divide-gray-800"
        >
          {/* Action 1: فعال/غیرفعال کردن ثبت خودکار */}
          {onToggleAutoRegister && (
            <div className="p-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAutoRegister(plateId);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer text-right"
              >
                <Power
                  className={`w-4 h-4 ${
                    isAutoRegisterEnabled ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'
                  } shrink-0`}
                />
                <span>فعال/غیرفعال کردن ثبت خودکار</span>
              </button>
            </div>
          )}

          {/* Action 2: ثبت مجدد */}
          <div className="p-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleRetryClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-right"
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500 shrink-0" />
              ) : (
                <RotateCcw className="w-4 h-4 text-orange-500 shrink-0" />
              )}
              <span>ثبت مجدد</span>
            </button>
          </div>

          {/* Action 3: حذف پلاک (Destructive) */}
          <div className="p-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleDeleteClick}
              data-testid="delete-plate-button"
              title="حذف پلاک از سیستم"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-right"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600 shrink-0" />
              ) : (
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>حذف پلاک</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
