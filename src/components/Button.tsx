import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-bold rounded-xl transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs sm:text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm sm:text-base gap-2.5',
    icon: 'p-2 text-xs',
  }[size];

  const variantClasses = {
    // Standard Brand Orange Button: high contrast text-white, hover:bg-orange-600
    primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs active:scale-[0.98]',
    // Secondary/Ghost Button
    secondary:
      'bg-gray-100 dark:bg-gray-800 text-gray-700 hover:bg-gray-200 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-700',
    ghost:
      'text-gray-700 hover:bg-gray-100 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-gray-800',
    outline:
      'border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-orange-500 dark:hover:text-orange-400',
    destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs active:scale-[0.98]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
