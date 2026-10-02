import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggleMinimal: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || theme === 'midnight';

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle Theme"
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border border-slate-800/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white shadow-xs"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
};
