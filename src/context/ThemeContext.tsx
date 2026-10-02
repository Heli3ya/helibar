import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light' | 'sepia' | 'midnight';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  badge: string;
  description: string;
  metaColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'تیره متالیک (Dark Slate)',
    badge: 'پیش‌فرض سازمانی',
    description: 'کنتراست استاندارد و بهینه برای شیفت‌های کاری',
    metaColor: '#090d16',
  },
  {
    id: 'light',
    name: 'روشن رسمی (Corporate Light)',
    badge: 'شفاف و پرنور',
    description: 'سطوح سفید با وضوح کامل فیلدها و پنل‌ها در نور روز',
    metaColor: '#f1f5f9',
  },
  {
    id: 'sepia',
    name: 'مراقبت چشم (High-Clarity Eye-Care)',
    badge: 'ضد خستگی و بدون نور آبی',
    description: 'رنگ‌آمیزی ماسه‌ای با خطوط کاملاً شارپ برای شیفت‌های طولانی',
    metaColor: '#f4eee3',
  },
  {
    id: 'midnight',
    name: 'شب عمیق (Midnight OLED)',
    badge: 'مشکی مطلق',
    description: 'حداکثر کاهش مصرف انرژی و دید بدون خیرگی در تاریکی مطلق',
    metaColor: '#000000',
  },
];

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
  themeLabel: string;
  isDark: boolean;
  themeOptions: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'tarabar_app_theme';

const THEME_META_COLORS: Record<AppTheme, string> = {
  dark: '#090d16',
  light: '#f1f5f9',
  sepia: '#f4eee3',
  midnight: '#000000',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
      if (saved && (saved === 'dark' || saved === 'light' || saved === 'sepia' || saved === 'midnight')) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'dark';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore
    }
  };

  const cycleTheme = () => {
    setThemeState(current => {
      const order: AppTheme[] = ['dark', 'light', 'sepia', 'midnight'];
      const nextIndex = (order.indexOf(current) + 1) % order.length;
      const nextTheme = order[nextIndex];
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore
      }
      return nextTheme;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Synchronize HTML classes for universal Tailwind compatibility
    root.classList.remove('dark', 'light', 'sepia', 'midnight');
    root.classList.add(theme);
    if (theme === 'dark' || theme === 'midnight') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Dynamic browser status bar color for PWA
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', THEME_META_COLORS[theme]);
  }, [theme]);

  const activeOption = THEME_OPTIONS.find(t => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        cycleTheme,
        themeLabel: activeOption.name,
        isDark: theme === 'dark' || theme === 'midnight',
        themeOptions: THEME_OPTIONS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
