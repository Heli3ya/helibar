import React, { useState, useEffect } from 'react';
import {
  WaybillItem,
  VehicleInfo,
  DriverInfo,
  SipaadCredentials,
  FuelQuotaRecord,
  AuthUser,
} from './types';
import {
  INITIAL_FLEET,
  INITIAL_WAYBILLS,
  INITIAL_SIPAAD_CONFIG,
  INITIAL_FUEL_QUOTAS,
} from './lib/mockData';
import { Navbar, NavTab } from './components/Navbar';
import { AppLayout } from './components/AppLayout';
import { OperationalDashboard } from './components/OperationalDashboard';
import { OtpManagerView } from './components/OtpManagerView';
import { ErrorReportsView } from './components/ErrorReportsView';
import { WaybillForm } from './components/WaybillForm';
import { BatchProcessingView } from './components/BatchProcessingView';
import { FleetManager } from './components/FleetManager';
import { WaybillList } from './components/WaybillList';
import { SipaadIntegrationLab } from './components/SipaadIntegrationLab';
import { WaybillPrintModal } from './components/WaybillPrintModal';
import { RegisterWithCarriageModal } from './components/RegisterWithCarriageModal';
import { FuelInquiryView } from './components/FuelInquiryView';
import { FuelInquiry } from './components/FuelInquiry';
import { LoginPage } from './components/LoginPage';
import { DriverOtpPortal } from './components/DriverOtpPortal';
import { RoundTripWaybillModal } from './components/RoundTripWaybillModal';
import { SettingsView } from './components/SettingsView';
import { AddDriver } from './components/AddDriver';
import { BlockOverlay } from './components/BlockOverlay';
import { CreateUserPanel } from './components/admin/CreateUserPanel';
import { toPersianDigits } from './lib/iranPlate';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedStr = localStorage.getItem('sipaad_issuer_user');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        // Security check: ONLY heliya can hold the ADMIN role.
        // If an old or unauthorized admin session (like username 'admin' or 'royaghafoori') exists, purge it.
        if (saved.role === 'ADMIN' && saved.username !== 'heliya') {
          localStorage.removeItem('sipaad_issuer_user');
          localStorage.removeItem('helibar_auth_token');
          return null;
        }
        return saved;
      }
    } catch (e) {}
    return null; // Require login; no automatic bypass
  });

  const [currentTab, setCurrentTab] = useState<NavTab>('DASHBOARD');

  const [config, setConfig] = useState<SipaadCredentials>(INITIAL_SIPAAD_CONFIG);
  const [fleet, setFleet] = useState<{ vehicle: VehicleInfo; driver: DriverInfo }[]>(() => {
    try {
      const savedUserStr = localStorage.getItem('sipaad_issuer_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        if (u.username) {
          const cachedFleet =
            localStorage.getItem(`helibar_fleet_${u.username}`) ||
            localStorage.getItem(`bargooo_fleet_${u.username}`);
          if (cachedFleet) {
            const parsed = JSON.parse(cachedFleet);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
        if (u.role === 'ADMIN') return INITIAL_FLEET;
        return [];
      }
    } catch {}
    return INITIAL_FLEET;
  });
  const [waybills, setWaybills] = useState<WaybillItem[]>(INITIAL_WAYBILLS);
  const [fuelQuotas, setFuelQuotas] = useState<FuelQuotaRecord[]>(INITIAL_FUEL_QUOTAS);
  const [printWaybill, setPrintWaybill] = useState<WaybillItem | null>(null);
  const [activeQueueCount, setActiveQueueCount] = useState<number>(0);

  // Auto-register toggle state
  const [autoRegisterEnabled, setAutoRegisterEnabled] = useState<boolean>(true);

  // Register with Carriage modal state
  const [carriageModalItem, setCarriageModalItem] = useState<{
    vehicle: VehicleInfo;
    driver: DriverInfo;
  } | null>(null);

  // Register Round-Trip (رفت و برگشت) modal state
  const [roundTripModalItem, setRoundTripModalItem] = useState<{
    vehicle: VehicleInfo;
    driver: DriverInfo;
  } | null>(null);

  // Capacity state (Allowed values: 50, 150, 350, 550, 700)
  const [maxPlateCapacity, setMaxPlateCapacity] = useState<number>(() => {
    try {
      const savedStr = localStorage.getItem('sipaad_issuer_user');
      if (savedStr) {
        const u = JSON.parse(savedStr);
        if (u.plateCapacity) return Number(u.plateCapacity);
      }
    } catch {}
    return 150;
  });

  // Track user's actual registered distinct plates count (deducts exactly 1 per actual plate)
  const distinctPlatesCount = React.useMemo(() => {
    if (currentUser?.role === 'ADMIN') return fleet.length;
    const seen = new Set<string>();
    let count = 0;
    for (const f of fleet) {
      const p = f.vehicle?.plate;
      if (!p) continue;
      const key = `${p.part1}${p.letter}${p.part2}${p.provinceCode || ''}`.replace(/\s+/g, '');
      const nat = f.driver?.nationalCode ? `nat_${f.driver.nationalCode}` : '';
      if (seen.has(key) || (nat && seen.has(nat))) continue;
      seen.add(key);
      if (nat) seen.add(nat);
      count++;
    }
    return count;
  }, [fleet, currentUser?.role]);
  const currentPlateCount = distinctPlatesCount;

  // Badges counters
  const pendingOtpCount = fleet.filter(f => f.vehicle.otpStatus === 'PENDING_OTP').length;
  const errorCount = fleet.filter(
    f => f.vehicle.permitStatus === 'ERROR' || f.vehicle.lastIssuanceStatus === 'ERROR'
  ).length;

  // Global Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Role security guard: Non-admin users must NEVER see or access System Settings or Create User Panel
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && (currentTab === 'SETTINGS' || currentTab === 'ADMIN_CREATE_USER')) {
      setCurrentTab('DASHBOARD');
    }
  }, [currentUser?.role, currentTab]);

  // Subscription expiration alert for Issuer when countdown reaches 0
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      const createdTime = currentUser.created_at ? new Date(currentUser.created_at).getTime() : Date.now();
      const elapsedDays = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
      const daysRemaining = currentUser.days_left !== undefined ? currentUser.days_left : Math.max(0, 30 - elapsedDays);
      if (daysRemaining <= 0) {
        showToast('هشدار: مدت زمان اشتراک ۳۰ روزه شما به پایان رسیده است. جهت تمدید و ادامه دسترسی، اقدام فرمایید.');
      }
    }
  }, [currentUser?.id, currentUser?.days_left]);

  // Automatically sync fleet changes to localStorage
  useEffect(() => {
    if (currentUser?.username && fleet) {
      try {
        localStorage.setItem(`helibar_fleet_${currentUser.username}`, JSON.stringify(fleet));
        localStorage.setItem(`bargooo_fleet_${currentUser.username}`, JSON.stringify(fleet));
      } catch {}
    }
  }, [fleet, currentUser?.username]);

  const handleDriverAdded = (newDriverItem: { vehicle: VehicleInfo; driver: DriverInfo }) => {
    const p = newDriverItem.vehicle.plate;
    const key = `${p.part1}${p.letter}${p.part2}${p.provinceCode || ''}`.replace(/\s+/g, '');
    const nat = newDriverItem.driver?.nationalCode;

    setFleet(prev => {
      // Check if already in fleet to prevent duplicate state
      const exists = prev.some(item => {
        const ip = item.vehicle.plate;
        const itemKey = `${ip.part1}${ip.letter}${ip.part2}${ip.provinceCode || ''}`.replace(/\s+/g, '');
        return itemKey === key || (nat && item.driver.nationalCode && item.driver.nationalCode === nat);
      });
      if (exists) return prev;

      const updated = [newDriverItem, ...prev];
      if (currentUser?.username) {
        try {
          localStorage.setItem(`helibar_fleet_${currentUser.username}`, JSON.stringify(updated));
          localStorage.setItem(`bargooo_fleet_${currentUser.username}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    showToast(`راننده «${newDriverItem.driver.fullName}» با موفقیت افزوده شد و به لیست پلاک‌های داشبورد اضافه گردید.`);
  };

  // Sync user profile & plate count with backend on session changes
  useEffect(() => {
    if (!currentUser) return;
    const token =
      localStorage.getItem('helibar_auth_token') ||
      localStorage.getItem('bargooo_auth_token') ||
      localStorage.getItem('token') ||
      `jwt_token_${currentUser.id}_${currentUser.username}`;

    // 1. Fetch latest plate capacity & status from server (in case admin updated it or suspended user)
    fetch('/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          if (data.plate_capacity) {
            setMaxPlateCapacity(Number(data.plate_capacity));
          }
          if (data.is_active !== undefined) {
            setCurrentUser(prev =>
              prev
                ? {
                    ...prev,
                    is_active: data.is_active,
                    plateCapacity: data.plate_capacity ? Number(data.plate_capacity) : prev.plateCapacity,
                    days_left: data.days_left !== undefined ? data.days_left : prev.days_left,
                  }
                : null
            );
          }
        }
      })
      .catch(() => {});

    // 2. Fetch user's registered plates count and sync isolated fleet
    fetch('/api/plates', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(plates => {
        if (Array.isArray(plates)) {
          const mappedFleet: { vehicle: VehicleInfo; driver: DriverInfo }[] = plates.map(p => ({
            vehicle: {
              id: p.id,
              plate: {
                part1: p.plate_part1 || '58',
                letter: (p.plate_letter as any) || 'ع',
                part2: p.plate_part2 || '412',
                provinceCode: p.plate_province || '11',
                type: 'public',
              },
              vehicleType: p.vehicle_type || 'وانت نیسان',
              smartCardNumber: p.smart_card_number || '3910000',
              technicalInspectionExpiry: '1404/11/30',
              insurancePolicyNumber: 'INS-8421',
              maxLoadCapacityKg: p.max_load_capacity_kg || 2200,
              fuelType: 'بنزین',
              permitStatus: 'VALID',
              permitErrorCode: 'NONE',
              permitErrorMessage: 'مجاز در سپاد',
              biweeklyWaybillCount: 0,
              biweeklyQuotaLimit: 15,
              fuelQuotaLiters: 400,
              isActive: p.is_active ?? true,
              isAutoRegisterEnabled: (p as any).is_auto_register_enabled !== false,
              carriageStatus: 'IDLE',
              otpStatus: 'VERIFIED',
              lastIssuanceStatus: 'NONE',
            },
            driver: {
              fullName: p.driver_name || 'راننده ثبت‌شده',
              nationalCode: p.driver_national_id || '0078192341',
              mobile: p.driver_mobile || '09124451092',
              smartCardNumber: p.smart_card_number || 'DRV-881923',
              licenseNumber: 'B1-998811',
            },
          }));

          // Strict Data Isolation & Distinct Filtering:
          // Issuers ONLY see their own distinct plates returned from /api/plates!
          const seenPlates = new Set<string>();
          const dedupedFleet = mappedFleet.filter(item => {
            const p = item.vehicle.plate;
            const key = `${p.part1}${p.letter}${p.part2}${p.provinceCode}`.replace(/\s+/g, '');
            const nat = item.driver.nationalCode ? `nat_${item.driver.nationalCode}` : '';
            if (seenPlates.has(key) || (nat && seenPlates.has(nat))) return false;
            seenPlates.add(key);
            if (nat) seenPlates.add(nat);
            return true;
          });

          if (currentUser.role !== 'ADMIN') {
            setFleet(dedupedFleet);
            try {
              localStorage.setItem(`helibar_fleet_${currentUser.username}`, JSON.stringify(dedupedFleet));
              localStorage.setItem(`bargooo_fleet_${currentUser.username}`, JSON.stringify(dedupedFleet));
            } catch {}
          } else {
            // ADMIN panel only manages admin's own plates
            if (dedupedFleet.length > 0) {
              setFleet(dedupedFleet);
            }
          }
        }
      })
      .catch(() => {});
  }, [currentUser?.id, currentUser?.username]);

  // Periodic polling & synchronization for Auto-Register status & Coded Plates
  useEffect(() => {
    if (!currentUser) return;
    const token =
      localStorage.getItem('helibar_auth_token') ||
      localStorage.getItem('bargooo_auth_token') ||
      localStorage.getItem('token') ||
      `jwt_token_${currentUser.id}_${currentUser.username}`;

    const syncAutoRegister = () => {
      fetch('/api/issuer/auto-register-status', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data && typeof data.isAutoRegisterActive === 'boolean') {
            setAutoRegisterEnabled(data.isAutoRegisterActive);
          }
        })
        .catch(() => {});
    };

    syncAutoRegister();
    const interval = setInterval(syncAutoRegister, 6000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.username]);

  const handleToggleAutoRegister = () => {
    const nextState = !autoRegisterEnabled;
    setAutoRegisterEnabled(nextState);

    if (currentUser) {
      const token =
        localStorage.getItem('helibar_auth_token') ||
        localStorage.getItem('bargooo_auth_token') ||
        localStorage.getItem('token') ||
        `jwt_token_${currentUser.id}_${currentUser.username}`;

      fetch('/api/issuer/auto-register-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: nextState }),
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.message) {
            showToast(data.message);
          }
        })
        .catch(() => {});
    }
  };

  // Handle successful login
  const handleLoginSuccess = (user: AuthUser, isSandbox: boolean) => {
    setCurrentUser(user);
    if (user.plateCapacity) {
      setMaxPlateCapacity(Number(user.plateCapacity));
    }
    // Load cached fleet for this specific user
    try {
      const cached =
        localStorage.getItem(`helibar_fleet_${user.username}`) ||
        localStorage.getItem(`bargooo_fleet_${user.username}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setFleet(parsed);
        } else {
          setFleet(user.role === 'ADMIN' ? INITIAL_FLEET : []);
        }
      } else {
        setFleet(user.role === 'ADMIN' ? INITIAL_FLEET : []);
      }
    } catch {
      setFleet(user.role === 'ADMIN' ? INITIAL_FLEET : []);
    }
    setConfig(prev => ({
      ...prev,
      companyCode: user.companyCode,
      issuerTitle: user.companyName,
      guildPermitNumber: user.permitNumber,
      isSandboxMode: isSandbox,
    }));
    try {
      localStorage.setItem('sipaad_issuer_user', JSON.stringify(user));
    } catch (e) {}

    // Post-Login Routing Logic:
    // - If role === 'ADMIN', redirect to /admin/dashboard
    // - If role === 'SUPPORT', redirect to the support dashboard (/dashboard)
    // - If role === 'DRIVER', redirect to the 2FA/OTP screen
    if (user.role === 'ADMIN') {
      setCurrentTab('DASHBOARD');
      if (typeof window !== 'undefined') {
        window.history.pushState({ role: 'ADMIN' }, '', '/admin/dashboard');
      }
    } else if (user.role === 'SUPPORT') {
      setCurrentTab('DASHBOARD');
      if (typeof window !== 'undefined') {
        window.history.pushState({ role: 'SUPPORT' }, '', '/dashboard');
      }
    } else if (user.role === 'DRIVER') {
      if (typeof window !== 'undefined') {
        window.history.pushState({ role: 'DRIVER' }, '', '/otp/driver-input');
      }
    }
  };

  // Sync URL routes on mount and history navigation
  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path === '/admin/create-user') {
          if (currentUser?.role === 'SUPPORT') {
            window.history.replaceState({ role: 'SUPPORT' }, '', '/dashboard');
            setCurrentTab('DASHBOARD');
            return;
          }
          if (currentUser?.role === 'ADMIN' && currentUser?.username === 'heliya') {
            setCurrentTab('ADMIN_CREATE_USER');
          } else {
            window.history.replaceState({}, '', '/dashboard');
            setCurrentTab('DASHBOARD');
          }
        } else if (path === '/admin/dashboard' || path === '/dashboard') {
          setCurrentTab('DASHBOARD');
        }
      }
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sipaad_issuer_user');
      localStorage.removeItem('helibar_auth_token');
      localStorage.removeItem('bargooo_auth_token');
    } catch (e) {}
  };

  // Fetch initial waybills from server if available (authenticated)
  useEffect(() => {
    const token =
      localStorage.getItem('helibar_auth_token') ||
      localStorage.getItem('bargooo_auth_token') ||
      '';

    fetch('/api/waybills', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.waybills && Array.isArray(data.waybills)) {
          setWaybills(data.waybills);
        }
      })
      .catch(() => {
        // use local initial mock
      });
  }, [currentUser?.id, currentUser?.username]);

  // Strict Tenancy Data Isolation for Waybills:
  // Non-ADMIN users (Issuers) only see waybills belonging to their plates or registered by their account
  const isolatedWaybills = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'ADMIN') return waybills;
    const userPlates = new Set(
      fleet.map(f => `${f.vehicle.plate.part1}${f.vehicle.plate.letter}${f.vehicle.plate.part2}`.replace(/\s+/g, ''))
    );
    return waybills.filter(w => {
      if ((w as any).owner_id && (w as any).owner_id === currentUser.id) return true;
      if ((w as any).issuerUserName && (w as any).issuerUserName === currentUser.username) return true;
      if (w.vehicle?.plate) {
        const key = `${w.vehicle.plate.part1}${w.vehicle.plate.letter}${w.vehicle.plate.part2}`.replace(/\s+/g, '');
        return userPlates.has(key);
      }
      return false;
    });
  }, [waybills, fleet, currentUser]);

  const handleWaybillIssued = (newWb: WaybillItem) => {
    setWaybills(prev => [newWb, ...prev]);
  };

  const handleAddVehicle = (newItem: { vehicle: VehicleInfo; driver: DriverInfo }) => {
    handleDriverAdded(newItem);
  };

  const handleSelectFleetForIssuance = (idx: number) => {
    setCurrentTab('ISSUE_SINGLE');
  };

  const handleRegisterWithCarriageSuccess = (newWb: WaybillItem) => {
    setWaybills(prev => [newWb, ...prev]);

    const plateStr = `${newWb.vehicle.plate.part1}${newWb.vehicle.plate.letter}${newWb.vehicle.plate.part2}`;
    setFleet(prev =>
      prev.map(item => {
        const itemPlateStr = `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}`;
        if (itemPlateStr === plateStr) {
          const currentCount = item.vehicle.biweeklyWaybillCount || 0;
          return {
            ...item,
            vehicle: {
              ...item.vehicle,
              biweeklyWaybillCount: currentCount + 1,
              carriageStatus: 'IN_TRANSIT',
              lastIssuanceStatus: 'SUCCESS',
            },
          };
        }
        return item;
      })
    );

    setFuelQuotas(prev =>
      prev.map(q => {
        const qPlateStr = `${q.plate.part1}${q.plate.letter}${q.plate.part2}`;
        if (qPlateStr === plateStr) {
          const addedLiters = q.fuelType === 'بنزین' ? 25 : 50;
          return {
            ...q,
            biweeklyWaybillCount: q.biweeklyWaybillCount + 1,
            performanceQuotaLiters: q.performanceQuotaLiters + addedLiters,
            totalCurrentQuotaLiters: q.totalCurrentQuotaLiters + addedLiters,
          };
        }
        return q;
      })
    );

    setCarriageModalItem(null);
  };

  const handleRoundTripSuccess = (outboundWb: WaybillItem, returnWb: WaybillItem) => {
    setWaybills(prev => [outboundWb, returnWb, ...prev]);

    const plateStr = `${outboundWb.vehicle.plate.part1}${outboundWb.vehicle.plate.letter}${outboundWb.vehicle.plate.part2}`;
    setFleet(prev =>
      prev.map(item => {
        const itemPlateStr = `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}`;
        if (itemPlateStr === plateStr) {
          const currentCount = item.vehicle.biweeklyWaybillCount || 0;
          return {
            ...item,
            vehicle: {
              ...item.vehicle,
              biweeklyWaybillCount: currentCount + 2,
              carriageStatus: 'IN_TRANSIT',
              lastIssuanceStatus: 'SUCCESS',
            },
          };
        }
        return item;
      })
    );

    setFuelQuotas(prev =>
      prev.map(q => {
        const qPlateStr = `${q.plate.part1}${q.plate.letter}${q.plate.part2}`;
        if (qPlateStr === plateStr) {
          const addedLiters = q.fuelType === 'بنزین' ? 50 : 100;
          return {
            ...q,
            biweeklyWaybillCount: q.biweeklyWaybillCount + 2,
            performanceQuotaLiters: q.performanceQuotaLiters + addedLiters,
            totalCurrentQuotaLiters: q.totalCurrentQuotaLiters + addedLiters,
          };
        }
        return q;
      })
    );

    setRoundTripModalItem(null);
  };

  const handleBatchWaybillsGenerated = (count: number) => {
    fetch('/api/waybills')
      .then(res => res.json())
      .then(data => {
        if (data.waybills && Array.isArray(data.waybills)) {
          setWaybills(data.waybills);
        }
      })
      .catch(() => {});
  };

  // If user is not authenticated, render Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        initialConfig={config}
        currentPlateCount={currentPlateCount}
        maxPlateCapacity={maxPlateCapacity}
      />
    );
  }

  // Requirement 7: Block access for suspended Issuer (عدم دسترسی صادرکننده)
  if (currentUser.is_active === false) {
    return (
      <div dir="rtl" className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-rose-500/50 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-rose-950/50 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-rose-500/10 border-2 border-rose-500/50 flex items-center justify-center text-rose-400">
            <span className="text-3xl">⛔</span>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
              <span>مسدودسازی دسترسی صادرکننده</span>
            </div>
            <h2 className="text-xl font-black text-white">عدم دسترسی صادرکننده</h2>
            <p className="text-xs text-neutral-400">
              کاربر گرامی «{currentUser.fullName || currentUser.username}»، پنل کاربری شما توسط مدیر ارشد سامانه مسدود گردیده است.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs sm:text-sm leading-relaxed text-right">
            امکان صدور بارنامه، ثبت راننده، استعلام ناوگان و مشاهده اطلاعات تا زمان بازگشایی توسط مدیریت سیستم غیرفعال می‌باشد.
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition cursor-pointer"
          >
            خروج از حساب کاربری
          </button>
        </div>
      </div>
    );
  }

  // Task 1: DRIVER Role is strictly restricted to the 2FA/OTP Input screen!
  if (currentUser.role === 'DRIVER') {
    return (
      <DriverOtpPortal
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // Task 1: SUPPORT Role cannot access Settings
  const safeTab = currentUser.role === 'SUPPORT' && currentTab === 'SETTINGS' ? 'DASHBOARD' : currentTab;

  return (
    <>
      <BlockOverlay />
      <AppLayout
        currentTab={safeTab}
        onSelectTab={tab => {
          if (currentUser.role !== 'ADMIN' && tab === 'ADMIN_CREATE_USER') {
            return;
          }
          if (currentUser.role !== 'ADMIN' && tab === 'SETTINGS') {
            return;
          }
          if (typeof window !== 'undefined') {
            if (tab === 'ADMIN_CREATE_USER') {
              window.history.pushState({}, '', '/admin/create-user');
            } else if (tab === 'DASHBOARD') {
              window.history.pushState({}, '', currentUser.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
            }
          }
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        config={config}
        pendingOtpCount={pendingOtpCount}
        errorCount={errorCount}
        totalWaybillsCount={isolatedWaybills.length}
        autoRegisterEnabled={autoRegisterEnabled}
        onToggleAutoRegister={handleToggleAutoRegister}
        currentPlateCount={currentPlateCount}
        maxPlateCapacity={maxPlateCapacity}
      >
        {/* TAB 1: MAIN DASHBOARD */}
          {currentTab === 'DASHBOARD' && (
            <OperationalDashboard
              fleet={fleet}
              waybills={isolatedWaybills}
              config={config}
              autoRegisterEnabled={autoRegisterEnabled}
              onToggleAutoRegister={handleToggleAutoRegister}
              onUpdateFleet={setFleet}
              onRegisterWithCarriage={item => setCarriageModalItem(item)}
              onRegisterRoundTrip={item => setRoundTripModalItem(item)}
              onNavigateToTab={tab => setCurrentTab(tab as NavTab)}
              currentUser={currentUser}
              onPlateAdded={() => {}}
              currentPlateCount={currentPlateCount}
              maxPlateCapacity={maxPlateCapacity}
            />
          )}

          {/* TAB 2: OTP MANAGER */}
          {currentTab === 'OTP_MANAGER' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">مدیریت کدهای تایید دوعاملی (2FA / OTP)</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    تزریق خودکار و دستی پیامک‌های تایید رانندگان و تطبیق پلاک‌های کُدی
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <OtpManagerView
                fleet={fleet}
                onUpdateFleet={setFleet}
                currentOperatorName={currentUser?.roleTitle || currentUser?.username}
                isSupportRole={currentUser?.role === 'SUPPORT'}
              />
            </div>
          )}

          {/* TAB 3: ERROR REPORTS & LOGS */}
          {currentTab === 'REPORTS' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">گزارش خطاها و لاگ‌های سیستمی سپاد</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    بررسی خطاهای ثبت بارنامه، تطبیق شهرداری و عدم احراز هویت
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <ErrorReportsView fleet={fleet} waybills={isolatedWaybills} />
            </div>
          )}

          {/* TAB 4: ADD DRIVER (REFACTORED 2-STEP ONBOARDING MODULE) */}
          {currentTab === 'ISSUE_SINGLE' && (
            <AddDriver
              onDriverAdded={handleDriverAdded}
              showToastNotification={showToast}
              onNavigateBack={() => setCurrentTab('DASHBOARD')}
              currentPlateCount={currentPlateCount}
              maxPlateCapacity={maxPlateCapacity}
            />
          )}

          {/* TAB 5: BATCH PROCESSING */}
          {currentTab === 'BATCH' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">عملیات و پردازش گروهی پلاک‌ها</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    آزمون بار تا سقف ۳۰۰ پلاک، ایزولاسیون کامل خطا و ثبت ناهمگام در سامانه سپاد
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <BatchProcessingView
                config={config}
                fleet={fleet}
                isSupportRole={currentUser?.role === 'SUPPORT'}
                onWaybillsGenerated={handleBatchWaybillsGenerated}
              />
            </div>
          )}

          {/* TAB 6: FLEET MANAGER */}
          {currentTab === 'FLEET' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">مدیریت ناوگان و کارت هوشمند</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    کنترل وضعیت فعال‌سازی پلاک‌ها، سهمیه‌ها و اعتبارسنجی ناوگان
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <FleetManager
                fleet={fleet}
                onAddVehicle={handleAddVehicle}
                onSelectForIssuance={handleSelectFleetForIssuance}
                onRegisterWithCarriage={item => setCarriageModalItem(item)}
                onRegisterRoundTrip={item => setRoundTripModalItem(item)}
                onUpdateFleet={setFleet}
                onNavigateToOtp={() => setCurrentTab('OTP_MANAGER')}
                currentOperatorName={currentUser?.roleTitle || currentUser?.username}
                isSupportRole={currentUser?.role === 'SUPPORT'}
                currentPlateCount={currentPlateCount}
                maxPlateCapacity={maxPlateCapacity}
              />
            </div>
          )}

          {/* TAB 7: FUEL QUOTA INQUIRY */}
          {currentTab === 'FUEL_INQUIRY' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">استعلام سهمیه سوخت ناوگان (سپاد)</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    محاسبه تخصیص سهمیه عملکردی بر پایه باربرگ‌های تایید شده
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <FuelInquiry fleet={fleet} />
            </div>
          )}

          {/* TAB 8: ARCHIVE */}
          {currentTab === 'ARCHIVE' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">آرشیو جامع بارنامه‌های صادر شده (باربرگ‌ها)</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    جستجو بر اساس پلاک، کد رهگیری سپاد، راننده، تاریخ و امکان چاپ رسمی و دانلود نسخه PDF
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <WaybillList
                waybills={isolatedWaybills}
                onSelectPrint={setPrintWaybill}
                onNavigateBack={() => setCurrentTab('DASHBOARD')}
              />
            </div>
          )}

          {/* TAB 9: LAB */}
          {currentTab === 'LAB' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">آزمایشگاه تست تعاملی API سپاد</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    شبیه‌سازی و اعتبارسنجی پاسخ‌های وب‌سرویس و ارسال درخواست‌های مستقیم
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <SipaadIntegrationLab config={config} onUpdateConfig={setConfig} />
            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {currentTab === 'SETTINGS' && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">تنظیمات اتصال و وب‌سرویس سپاد</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    پیکربندی کلید رمزنگاری SHA-512، کد شرکت و مجوزهای فعال
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>بازگشت به داشبورد</span>
                </button>
              </div>
              <SettingsView config={config} onUpdateConfig={setConfig} />
            </div>
          )}

          {/* TAB 11: CREATE USER PANEL (ADMIN ONLY) */}
          {currentTab === 'ADMIN_CREATE_USER' && (
            currentUser.role === 'ADMIN' ? (
              <CreateUserPanel
                onNavigateBack={() => {
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/admin/dashboard');
                  }
                  setCurrentTab('DASHBOARD');
                }}
                onUserCreated={({ username, plate_capacity }) => {
                  showToast(`پنل مشتری «${username}» با سقف ${toPersianDigits(plate_capacity)} پلاک با موفقیت ایجاد شد.`);
                }}
              />
            ) : (
              <div className="p-8 text-center text-xs text-gray-500 space-y-3">
                <p>دسترسی غیرمجاز: این صفحه فقط برای مدیر ارشد سامانه در دسترس است.</p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('DASHBOARD')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  بازگشت به داشبورد
                </button>
              </div>
            )
          )}
        </AppLayout>

      {/* Register With Carriage Modal */}
      {carriageModalItem && (
        <RegisterWithCarriageModal
          item={carriageModalItem}
          config={config}
          onClose={() => setCarriageModalItem(null)}
          onIssued={handleRegisterWithCarriageSuccess}
        />
      )}

      {/* Register Round-Trip Modal (رفت و برگشت) */}
      {roundTripModalItem && (
        <RoundTripWaybillModal
          vehicle={roundTripModalItem.vehicle}
          driver={roundTripModalItem.driver}
          config={config}
          onClose={() => setRoundTripModalItem(null)}
          onSuccess={handleRoundTripSuccess}
        />
      )}

      {/* Official Waybill Printable Modal */}
      <WaybillPrintModal
        waybill={printWaybill}
        onClose={() => setPrintWaybill(null)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          dir="rtl"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-orange-500 text-orange-200 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl shadow-orange-950/40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
