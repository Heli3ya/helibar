import React, { useState, useRef, useEffect } from 'react';
import { useTheme, AppTheme, THEME_OPTIONS } from '../context/ThemeContext';
import { Moon, Sun, Glasses, Sparkles, Check, ChevronDown } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, themeLabel } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (id: AppTheme, className = 'w-4 h-4') => {
    switch (id) {
      case 'light':
        return <Sun className={`${className} text-amber-500`} />;
      case 'sepia':
        return <Glasses className={`${className} text-amber-700`} />;
      case 'midnight':
        return <Sparkles className={`${className} text-indigo-400`} />;
      case 'dark':
      default:
        return <Moon className={`${className} text-amber-400`} />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button: Min 44x44px touch target on mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="تغییر پوسته کاربری و حالت نمایش"
        title={`پوسته فعال: ${themeLabel}`}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-10 sm:h-11 rounded-xl transition-all cursor-pointer border border-slate-800/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 select-none shadow-xs"
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-800/80 shrink-0">
          {getThemeIcon(theme, 'w-4 h-4')}
        </div>
        <span className="hidden md:inline text-xs font-bold truncate max-w-[120px]">
          {theme === 'dark'
            ? 'تیره متالیک'
            : theme === 'light'
            ? 'روشن سازمانی'
            : theme === 'sepia'
            ? 'مراقبت چشم'
            : 'شب عمیق'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Headless-Style Dropdown Menu */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-right"
        >
          <div className="px-3 py-2 border-b border-slate-800/80 mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              تنظیمات پوسته و بهینه‌سازی نور
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
              ۴ تم استاندارد
            </span>
          </div>

          <div className="space-y-1.5">
            {THEME_OPTIONS.map(opt => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start justify-between p-2.5 rounded-xl text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-xs'
                      : 'hover:bg-slate-800/70 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      {getThemeIcon(opt.id, 'w-4 h-4')}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{opt.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                          {opt.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {opt.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          {/* Eye-Care Guidance note */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 px-2.5 py-1 text-[10px] text-slate-400 leading-relaxed bg-slate-950/40 rounded-lg">
            نکته: در تمام حالت‌ها (به‌ویژه حالت روز و مراقبت چشم)، کنتراست خطوط، فیلدها و کادرهای جدول مطابق با استانداردهای رسمی طراحی وب بازمهندسی شده است.
          </div>
        </div>
      )}
    </div>
  );
};
