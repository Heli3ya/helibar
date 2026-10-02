import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface GlobalBackButtonProps {
  className?: string;
  onClick?: () => void;
  showText?: boolean;
  label?: string;
  title?: string;
  isAccent?: boolean;
}

/**
 * Universal Global Back Button component
 * Returns user to previous screen or dashboard via provided callback or browser history
 * Clean minimalist Orange/Black theme styling with prominent RTL arrow
 */
export const GlobalBackButton: React.FC<GlobalBackButtonProps> = ({
  className = '',
  onClick,
  showText = true,
  label = 'بازگشت',
  title = 'بازگشت به صفحه قبل / داشبورد',
  isAccent = false,
}) => {
  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback to dashboard route
        window.location.href = '/dashboard';
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      title={title}
      aria-label={title}
      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold select-none focus:outline-none active:scale-95 ${
        isAccent
          ? 'bg-orange-500/15 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 shadow-xs'
          : 'text-gray-600 hover:text-orange-600 dark:text-neutral-300 dark:hover:text-orange-400 bg-gray-100 hover:bg-orange-500/10 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700'
      } ${className}`}
    >
      <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
      {showText && <span>{label}</span>}
    </button>
  );
};
