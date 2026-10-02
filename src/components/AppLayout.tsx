import React, { useState } from 'react';
import { AppHeader } from './AppHeader';
import { MobileDrawer } from './MobileDrawer';
import { Sidebar } from './Sidebar';
import { NavTab } from './Navbar';
import { SipaadCredentials, AuthUser } from '../types';
import { useTheme } from '../context/ThemeContext';
import { SubscriptionBanner } from './SubscriptionBanner';

export interface AppLayoutProps {
  children: React.ReactNode;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  config: SipaadCredentials;
  pendingOtpCount?: number;
  errorCount?: number;
  totalWaybillsCount?: number;
  autoRegisterEnabled?: boolean;
  onToggleAutoRegister?: () => void;
  currentPlateCount?: number;
  maxPlateCapacity?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  config,
  pendingOtpCount = 0,
  errorCount = 0,
  totalWaybillsCount = 0,
  autoRegisterEnabled = false,
  onToggleAutoRegister,
  currentPlateCount = 120,
  maxPlateCapacity = 150,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme } = useTheme();

  // Background and text classes per theme
  const getLayoutThemeClasses = () => {
    if (theme === 'light') {
      return 'bg-gray-50 text-gray-900';
    }
    if (theme === 'sepia') {
      return 'bg-[#f5eee1] text-[#1c150c]';
    }
    if (theme === 'midnight') {
      return 'bg-black text-white';
    }
    return 'bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-100';
  };

  const getMainContentThemeClasses = () => {
    if (theme === 'light') {
      return 'bg-gray-50';
    }
    if (theme === 'sepia') {
      return 'bg-[#f5eee1]';
    }
    if (theme === 'midnight') {
      return 'bg-black';
    }
    return 'bg-gray-50 dark:bg-[#121212]';
  };

  return (
    <div
      dir="rtl"
      className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-200 overflow-x-hidden selection:bg-orange-500 selection:text-white ${getLayoutThemeClasses()}`}
    >
      {/* Global Subscription Warning Banner (Expiring alert for active user) */}
      <SubscriptionBanner currentUser={currentUser} />

      {/* 1. Minimal De-cluttered PWA Header */}
      <AppHeader
        currentUser={currentUser}
        onLogout={onLogout}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        onNavigateToSettings={() => onSelectTab('SETTINGS')}
        currentPlateCount={currentPlateCount}
        maxPlateCapacity={maxPlateCapacity}
        currentTab={currentTab}
        onNavigateBack={() => onSelectTab('DASHBOARD')}
      />

      {/* Main Structural Body: Static Sidebar (lg:) on the Right (RTL) + Main Content */}
      <div className="flex-1 flex w-full min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar (lg: and up) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          config={config}
          currentUser={currentUser}
          onLogout={onLogout}
          pendingOtpCount={pendingOtpCount}
          errorCount={errorCount}
          totalWaybillsCount={totalWaybillsCount}
          autoRegisterEnabled={autoRegisterEnabled}
          onToggleAutoRegister={onToggleAutoRegister}
        />

        {/* Dynamic Main Content Container */}
        <main
          className={`flex-1 flex flex-col min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-16 transition-colors ${getMainContentThemeClasses()}`}
        >
          <div className="w-full max-w-7xl mx-auto flex-1">
            {children}
          </div>
        </main>
      </div>

      {/* 2. Responsive Mobile Drawer (Screen < lg) with zero clutter */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        currentUser={currentUser}
        onLogout={onLogout}
        pendingOtpCount={pendingOtpCount}
        errorCount={errorCount}
        totalWaybillsCount={totalWaybillsCount}
      />
    </div>
  );
};
