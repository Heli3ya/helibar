import React, { useEffect, useState } from 'react';
import { CreateUserPanel } from '../../src/components/admin/CreateUserPanel';
import { GlobalBackButton } from '../../src/components/GlobalBackButton';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function CreateUserPage() {
  const [role, setRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sipaad_issuer_user');
      if (saved) {
        const user = JSON.parse(saved);
        setRole(user.role || null);
        if (user.role === 'SUPPORT') {
          // Immediately redirect SUPPORT user to their dashboard
          window.location.replace('/dashboard');
          return;
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsChecking(false);
    }
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center p-4">
        <div className="text-xs text-gray-500 font-medium animate-pulse">در حال بررسی سطح دسترسی...</div>
      </div>
    );
  }

  // 403 Forbidden Screen for SUPPORT or non-ADMIN
  if (role === 'SUPPORT' || (role && role !== 'ADMIN')) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 mx-auto flex items-center justify-center font-black text-xl">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">خطای ۴۰۳ - دسترسی غیرمجاز</h1>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
              صفحه «ایجاد پنل کاربری» منحصراً برای نقش مدیر ارشد (ADMIN) در دسترس است. حساب کاربری پشتیبان اجازه دسترسی به این بخش را ندارد.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (window.location.href = '/dashboard')}
            className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
          >
            <span>انتقال به داشبورد پشتیبان</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <GlobalBackButton />
      </div>
      <CreateUserPanel />
    </div>
  );
}
