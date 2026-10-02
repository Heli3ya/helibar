import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  subscribeToSubscriptionEvents,
  notifyBlocked,
  notifyWarning,
  notifyUnblocked,
  apiClient,
} from '../lib/api';

export type SubscriptionWarningType = '14_DAYS' | '7_DAYS_BLINKING' | null;

interface SubscriptionContextType {
  warningType: SubscriptionWarningType;
  daysLeft: number | null;
  isBlocked: boolean;
  isBillingOpen: boolean;
  setIsBillingOpen: (open: boolean) => void;
  setWarningType: (type: SubscriptionWarningType) => void;
  setDaysLeft: (days: number | null) => void;
  setIsBlocked: (blocked: boolean) => void;
  refreshStatus: () => Promise<void>;
  approvePayment: (userId?: string) => Promise<{ success: boolean; message: string }>;
  setDemoScenario: (
    scenario: 'normal' | '14_days' | '7_days' | 'blocked'
  ) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [warningType, setWarningType] = useState<SubscriptionWarningType>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [isBillingOpen, setIsBillingOpen] = useState<boolean>(false);

  // Subscribe to Axios & Fetch Interceptor events
  useEffect(() => {
    const unsubscribe = subscribeToSubscriptionEvents({
      onWarning: (warning, days) => {
        setWarningType(warning);
        if (days !== null) {
          setDaysLeft(days);
        }
      },
      onBlocked: () => {
        setIsBlocked(true);
        setWarningType(null);
      },
      onUnblocked: () => {
        setIsBlocked(false);
      },
    });

    return () => unsubscribe();
  }, []);

  // Fetch initial status from server
  const refreshStatus = useCallback(async () => {
    try {
      const token =
        localStorage.getItem('helibar_auth_token') ||
        localStorage.getItem('bargooo_auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('jwt_token') ||
        '';

      const res = await fetch('/api/subscription/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDaysLeft(data.days_left);

        if (data.days_left <= 0 && data.is_payment_approved === false) {
          setIsBlocked(true);
          setWarningType(null);
        } else {
          setIsBlocked(false);
          if (data.warning_header === '14_DAYS') {
            setWarningType('14_DAYS');
          } else if (data.warning_header === '7_DAYS_BLINKING') {
            setWarningType('7_DAYS_BLINKING');
          } else {
            setWarningType(null);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch subscription status:', e);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Admin Approve Payment
  const approvePayment = async (
    userId: string = 'usr-90421'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/approve-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'خطا در تأیید پرداخت');
      }

      const data = await res.json();
      setIsBlocked(false);
      setWarningType(null);
      setDaysLeft(data.days_left || 30);
      notifyUnblocked();

      return {
        success: true,
        message: data.message || 'پرداخت با موفقیت تأیید و اشتراک ۱ ماه جلالی تمدید شد.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'خطا در اتصال به سرور جهت تأیید پرداخت',
      };
    }
  };

  // Demo simulator for testing scenarios
  const setDemoScenario = async (
    scenario: 'normal' | '14_days' | '7_days' | 'blocked'
  ) => {
    let targetDays = 30;
    let targetApproved = true;

    if (scenario === '14_days') {
      targetDays = 12;
      targetApproved = true;
    } else if (scenario === '7_days') {
      targetDays = 5;
      targetApproved = true;
    } else if (scenario === 'blocked') {
      targetDays = 0;
      targetApproved = false;
    }

    try {
      await fetch('/api/subscription/set-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysLeft: targetDays, isApproved: targetApproved }),
      });
    } catch (e) {}

    setDaysLeft(targetDays);
    if (scenario === 'blocked') {
      setIsBlocked(true);
      setWarningType(null);
      notifyBlocked();
    } else {
      setIsBlocked(false);
      notifyUnblocked();
      if (scenario === '14_days') {
        setWarningType('14_DAYS');
      } else if (scenario === '7_days') {
        setWarningType('7_DAYS_BLINKING');
      } else {
        setWarningType(null);
      }
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        warningType,
        daysLeft,
        isBlocked,
        isBillingOpen,
        setIsBillingOpen,
        setWarningType,
        setDaysLeft,
        setIsBlocked,
        refreshStatus,
        approvePayment,
        setDemoScenario,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
