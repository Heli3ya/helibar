import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VehicleInfo, DriverInfo, WaybillItem, SipaadCredentials, AuthUser } from '../types';
import { PlateBadge } from './PlateBadge';
import { BiweeklyStageStatsBadge } from './BiweeklyStageStatsBadge';
import { toPersianDigits } from '../lib/iranPlate';
import { OtpActionQueue, OtpActionQueueItem } from './OtpActionQueue';
import { MunicipalityPermitErrorModal } from './MunicipalityPermitErrorModal';
import { ErrorDetailsModal } from './ErrorDetailsModal';
import { OtpEntryModal } from './OtpEntryModal';
import { ExcelImportModal } from './ExcelImportModal';
import { BulkUploadModal } from './BulkUploadModal';
import { AddDriverModal } from './AddDriverModal';
import { PlateActionMenu } from './PlateActionMenu';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Power,
  Upload,
  Download,
  Search,
  Filter,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  PackageCheck,
  ArrowLeftRight,
  ShieldCheck,
  KeyRound,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  CheckSquare,
  Square,
  AlertCircle,
  Play,
  SquareSlash,
  MoreVertical,
  Wrench,
  RotateCw,
  UserPlus,
  Loader2,
} from 'lucide-react';

interface OperationalDashboardProps {
  fleet: { vehicle: VehicleInfo; driver: DriverInfo }[];
  waybills: WaybillItem[];
  config: SipaadCredentials;
  autoRegisterEnabled: boolean;
  onToggleAutoRegister: () => void;
  onUpdateFleet: React.Dispatch<React.SetStateAction<{ vehicle: VehicleInfo; driver: DriverInfo }[]>>;
  onRegisterWithCarriage: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onRegisterRoundTrip: (item: { vehicle: VehicleInfo; driver: DriverInfo }) => void;
  onNavigateToTab?: (tab: string) => void;
  currentUser?: AuthUser;
  onPlateAdded?: (count?: number) => void;
  currentPlateCount?: number;
  maxPlateCapacity?: number;
}

type FilterStatus = 'ALL' | 'ACTIVE' | 'IN_TRANSIT' | 'OTP_VERIFIED' | 'OTP_PENDING' | 'ERROR';

export const OperationalDashboard: React.FC<OperationalDashboardProps> = ({
  fleet,
  waybills,
  config,
  autoRegisterEnabled,
  onToggleAutoRegister,
  onUpdateFleet,
  onRegisterWithCarriage,
  onRegisterRoundTrip,
  onNavigateToTab,
  currentUser,
  onPlateAdded,
  currentPlateCount,
  maxPlateCapacity,
}) => {
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [viewMode, setViewMode] = useState<'AUTO' | 'CARDS' | 'TABLE'>('AUTO');

  // Multi-selection state
  const [selectedPlateKeys, setSelectedPlateKeys] = useState<string[]>([]);

  // Modals state
  const [errorModalItem, setErrorModalItem] = useState<{ vehicle: VehicleInfo; driver: DriverInfo } | null>(null);
  const [municipalityErrorItem, setMunicipalityErrorItem] = useState<{ vehicle: VehicleInfo; driver: DriverInfo } | null>(null);
  const [otpModalItem, setOtpModalItem] = useState<{ vehicle: VehicleInfo; driver: DriverInfo } | null>(null);
  const [showExcelImport, setShowExcelImport] = useState<boolean>(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState<boolean>(false);
  const [batchMenuOpen, setBatchMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [retryingKeys, setRetryingKeys] = useState<Record<string, boolean>>({});
  const [isBulkProcessingActive, setIsBulkProcessingActive] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-Refresh: Polling mechanism (every 6s) refreshing Plate List while bulk upload processes
  useEffect(() => {
    if (!isBulkProcessingActive) return;

    const pollFleetFromBackend = async () => {
      try {
        const token = localStorage.getItem('token') || 'jwt_token_usr-sup-1';
        const res = await fetch('/api/auth/my-drivers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const serverDrivers: any[] = await res.json();
        if (Array.isArray(serverDrivers)) {
          let newlyAddedCount = 0;
          onUpdateFleet(prevFleet => {
            const existingIds = new Set(prevFleet.map(f => f.driver.nationalCode));
            const newItems: { vehicle: VehicleInfo; driver: DriverInfo }[] = [];

            for (const d of serverDrivers) {
              if (!existingIds.has(d.username) && d.role === 'DRIVER') {
                const rawPlate = d.plate || '43 ع 789 ایران 77';
                const parts = rawPlate.replace(/ایران\s*/, '').trim().split(/\s+/);
                const newDriverItem: { vehicle: VehicleInfo; driver: DriverInfo } = {
                  vehicle: {
                    plate: {
                      part1: parts[0] || '43',
                      letter: (parts[1] as any) || 'ع',
                      part2: parts[2] || '789',
                      provinceCode: parts[3] || '77',
                      type: 'public',
                    },
                    vehicleType: 'وانت نیسان',
                    maxLoadCapacityKg: 2200,
                    smartCardNumber: `DRV-${d.username.slice(-6)}`,
                    insurancePolicyNumber: 'INS-99021',
                    technicalInspectionExpiry: '1404/12/29',
                    permitStatus: 'VALID',
                    lastIssuanceStatus: 'SUCCESS',
                    otpStatus: 'VERIFIED',
                    biweeklyWaybillCount: 0,
                    stage1WaybillCount: 0,
                    stage2WaybillCount: 0,
                  },
                  driver: {
                    fullName: d.full_name || d.username,
                    nationalCode: d.username,
                    mobile: d.mobile || '09120000000',
                    licenseNumber: `LIC-${d.username.slice(-6)}`,
                    smartCardNumber: `DRV-${d.username.slice(-6)}`,
                  },
                };
                newItems.push(newDriverItem);
              }
            }

            if (newItems.length > 0) {
              newlyAddedCount = newItems.length;
              return [...newItems, ...prevFleet];
            }
            return prevFleet;
          });

          if (newlyAddedCount > 0) {
            showToast(`پلاک‌های جدید به صورت خودکار ثبت و دریافت شدند (${toPersianDigits(newlyAddedCount)} پلاک).`);
          }
        }
      } catch (err) {
        console.error('Error polling fleet from backend:', err);
      }
    };

    const intervalId = setInterval(pollFleetFromBackend, 6000);
    pollFleetFromBackend();

    return () => clearInterval(intervalId);
  }, [isBulkProcessingActive, onUpdateFleet]);

  // Helper to identify unique plate key
  const getPlateKey = (item: { vehicle: VehicleInfo }) =>
    `${item.vehicle.plate.part1}${item.vehicle.plate.letter}${item.vehicle.plate.part2}-${item.vehicle.plate.provinceCode}`;

  // Real-time backend 2FA OTP status polling and synchronization
  useEffect(() => {
    const token =
      localStorage.getItem('helibar_auth_token') ||
      localStorage.getItem('bargooo_auth_token') ||
      localStorage.getItem('token') ||
      '';

    const syncTwoFactorState = async () => {
      try {
        const [pendingOtpRes, waybillsRes] = await Promise.all([
          fetch('/api/otp/pending', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null),
          fetch('/api/waybills', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null),
        ]);

        let pendingOtps: any[] = [];
        if (pendingOtpRes && pendingOtpRes.ok) {
          pendingOtps = await pendingOtpRes.json().catch(() => []);
        }

        let recentWaybills: any[] = [];
        if (waybillsRes && waybillsRes.ok) {
          const wbData = await waybillsRes.json().catch(() => ({}));
          recentWaybills = Array.isArray(wbData) ? wbData : (wbData.waybills || []);
        }

        const pendingMobiles = new Set(
          (Array.isArray(pendingOtps) ? pendingOtps : [])
            .filter((o: any) => o.status === 'PENDING')
            .map((o: any) => String(o.driverMobile || '').replace(/\D/g, '').slice(-10))
        );

        const verifiedWaybillMobiles = new Set(
          recentWaybills
            .filter((w: any) => w.driver?.mobile)
            .map((w: any) => String(w.driver.mobile).replace(/\D/g, '').slice(-10))
        );

        onUpdateFleet(prevFleet => {
          let hasChange = false;
          const nextFleet = prevFleet.map(item => {
            const cleanMobile = String(item.driver.mobile || '').replace(/\D/g, '').slice(-10);
            const isPendingFromBackend = cleanMobile ? pendingMobiles.has(cleanMobile) : false;
            const isVerifiedFromBackend = cleanMobile ? verifiedWaybillMobiles.has(cleanMobile) : false;

            // 1. Pending State (نیازمند کد): If backend marks OTP pending, force otpStatus = 'PENDING_OTP' and auto-register toggle (isActive) = false
            if (isPendingFromBackend && item.vehicle.otpStatus !== 'PENDING_OTP') {
              hasChange = true;
              return {
                ...item,
                vehicle: {
                  ...item.vehicle,
                  otpStatus: 'PENDING_OTP' as const,
                  isActive: false, // Auto-register toggle switched to OFF
                  otpRemainingSeconds: item.vehicle.otpRemainingSeconds || 120,
                },
              };
            }

            // 2. Success State (تأیید شده): If SMS Panel Webhook verified and completed waybill registration, update to 'VERIFIED'
            if (!isPendingFromBackend && (isVerifiedFromBackend || item.vehicle.otpStatus === 'PENDING_OTP' && pendingMobiles.size === 0) && item.vehicle.otpStatus !== 'VERIFIED') {
              hasChange = true;
              return {
                ...item,
                vehicle: {
                  ...item.vehicle,
                  otpStatus: 'VERIFIED' as const,
                  pendingOtpCode: undefined,
                  lastActiveTime: 'هم‌اکنون',
                },
              };
            }

            return item;
          });

          return hasChange ? nextFleet : prevFleet;
        });
      } catch (err) {
        console.error('Error syncing 2FA state from backend:', err);
      }
    };

    const intervalId = setInterval(syncTwoFactorState, 3500);
    syncTwoFactorState();

    return () => clearInterval(intervalId);
  }, [onUpdateFleet]);

  // Handler for retrying waybill registration (Async Celery queue)
  const handleRetryWaybill = async (plateId: string) => {
    try {
      const res = await fetch(`/api/plates/${encodeURIComponent(plateId)}/retry-waybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || errData?.message || 'خطا در ثبت مجدد');
      }

      const data = await res.json();
      showToast(data.message || 'درخواست ثبت مجدد به صف ارسال شد');
    } catch (err: any) {
      showToast(`خطا در ثبت مجدد: ${err.message || 'خطای شبکه'}`);
    }
  };

  // Loading state for "ثبت با حمل"
  const [registeringTransportPlateId, setRegisteringTransportPlateId] = useState<string | null>(null);

  // Handler for "ثبت با حمل" (Register with Transport)
  const handleRegisterTransport = async (item: { vehicle: VehicleInfo; driver: DriverInfo }) => {
    const plateId = item.vehicle.id || getPlateKey(item);
    setRegisteringTransportPlateId(plateId);

    try {
      const res = await fetch('/api/waybills/register-transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate_id: plateId,
          plateId,
          vehicle: item.vehicle,
          driver: item.driver,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || errData?.message || 'خطا در ثبت حمل');
      }

      // Exact Toast notification required by specification:
      showToast('با موفقیت ثبت حمل انجام شد');

      // Update fleet state locally
      onUpdateFleet(prev =>
        prev.map(f => {
          if (getPlateKey(f) === getPlateKey(item)) {
            return {
              ...f,
              vehicle: {
                ...f.vehicle,
                carriageStatus: 'IN_TRANSIT',
                biweeklyWaybillCount: (f.vehicle.biweeklyWaybillCount || 0) + 1,
              },
            };
          }
          return f;
        })
      );
    } catch (err: any) {
      showToast(`خطا در ثبت حمل: ${err.message || 'خطای شبکه'}`);
    } finally {
      setRegisteringTransportPlateId(null);
    }
  };

  // Handler for deleting plate (disassociating and stopping bot)
  const handleDeletePlate = async (plateId: string, itemKey?: string, vehicleId?: string) => {
    const targetKey = itemKey || plateId;
    try {
      const token =
        localStorage.getItem('helibar_auth_token') ||
        localStorage.getItem('bargooo_auth_token') ||
        '';

      const res = await fetch(`/api/plates/${encodeURIComponent(vehicleId || plateId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok && res.status !== 204 && res.status !== 200) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || errData?.message || 'خطا در حذف پلاک');
      }

      // Remove plate from current fleet state strictly targeting this plate
      onUpdateFleet((prev) => {
        const cleanTarget = targetKey.replace(/\s+/g, '').replace(/-/g, '');
        const cleanPlateId = plateId.replace(/\s+/g, '').replace(/-/g, '');

        const nextFleet = prev.filter((item) => {
          const k = getPlateKey(item);
          const vid = item.vehicle.id;
          const p = item.vehicle.plate;
          const altKey = `${p.part1}${p.letter}${p.part2}-${p.provinceCode}`;
          const simpleKey = `${p.part1}${p.letter}${p.part2}`;
          const cleanK = k.replace(/\s+/g, '').replace(/-/g, '');

          // If vehicleId is matched
          if (vehicleId && vid && vid === vehicleId) return false;
          if (plateId && vid && vid === plateId) return false;

          // If plate key is matched
          if (
            k === targetKey ||
            k === plateId ||
            altKey === targetKey ||
            altKey === plateId ||
            simpleKey === targetKey ||
            simpleKey === plateId ||
            cleanK === cleanTarget ||
            cleanK === cleanPlateId
          ) {
            return false;
          }

          return true;
        });

        // Sync to local storage immediately
        const savedUserStr = localStorage.getItem('sipaad_issuer_user');
        if (savedUserStr) {
          try {
            const u = JSON.parse(savedUserStr);
            if (u.username) {
              localStorage.setItem(`helibar_fleet_${u.username}`, JSON.stringify(nextFleet));
              localStorage.setItem(`bargooo_fleet_${u.username}`, JSON.stringify(nextFleet));
            }
          } catch {}
        }

        return nextFleet;
      });

      // Deselect if selected
      setSelectedPlateKeys((prev) => prev.filter((k) => k !== targetKey && k !== plateId));
      showToast('پلاک با موفقیت حذف گردید.');
    } catch (err: any) {
      showToast(`خطا در حذف پلاک: ${err.message || 'خطای سرور'}`);
    }
  };

  // Summary Metrics calculations
  const totalCount = fleet.length;
  const pendingOtpVehiclesCount = fleet.filter(f => f.vehicle.otpStatus === 'PENDING_OTP').length;
  const activeCount = fleet.filter(f => f.vehicle.otpStatus !== 'PENDING_OTP' && (f.vehicle.isActive ?? true)).length;
  const inTransitCount = fleet.filter(f => f.vehicle.carriageStatus === 'IN_TRANSIT').length;
  const errorCount = fleet.filter(
    f => f.vehicle.permitStatus === 'ERROR' || f.vehicle.lastIssuanceStatus === 'ERROR'
  ).length;
  const queuedCount = fleet.filter(
    f => f.vehicle.carriageStatus === 'IN_TRANSIT' || f.vehicle.lastIssuanceStatus === 'QUEUED'
  ).length;

  // OTP Action Queue items (پلاک‌های کُدی)
  const otpQueueItems: OtpActionQueueItem[] = useMemo(() => {
    return fleet
      .filter(item => item.vehicle.otpStatus === 'PENDING_OTP')
      .map(item => ({
        id: getPlateKey(item),
        plate: item.vehicle.plate,
        driverName: item.driver.fullName,
        driverNationalCode: item.driver.nationalCode,
        driverMobile: item.driver.mobile,
        status: 'PENDING_OTP',
        expiresInSeconds: item.vehicle.otpRemainingSeconds || 120,
        tonnageKg: item.vehicle.maxLoadCapacityKg,
        biweeklyWaybillCount: item.vehicle.biweeklyWaybillCount ?? 0,
        biweeklyQuotaLimit: item.vehicle.biweeklyQuotaLimit ?? 15,
      }));
  }, [fleet]);

  // Handle Quick OTP injection from OtpActionQueue
  const handleInjectOtp = (queueItem: OtpActionQueueItem, otpCode: string) => {
    onUpdateFleet(prev =>
      prev.map(item => {
        if (getPlateKey(item) === queueItem.id) {
          return {
            ...item,
            vehicle: {
              ...item.vehicle,
              otpStatus: 'VERIFIED',
              pendingOtpCode: undefined,
              otpRemainingSeconds: 0,
            },
          };
        }
        return item;
      })
    );
    showToast(`کد دوعاملی برای پلاک «${queueItem.plate.part1} ${queueItem.plate.letter} ${queueItem.plate.part2}» ثبت و تایید گردید.`);
  };

  // Smart Error Handling:
  // - If relating to "Municipality Permits" (ERR_PERMIT_EXPIRED or contains PERMIT/پروانه): Open clean modal
  // - If standard glitches (TIMEOUT, NETWORK, RATE_LIMIT, ERR_INSPECTION_LAPSED, etc.): Trigger retry
  const handleFixError = (item: { vehicle: VehicleInfo; driver: DriverInfo }) => {
    const key = getPlateKey(item);
    const errorCode = item.vehicle.lastErrorCode || item.vehicle.permitErrorCode || '';
    const errorMsg = item.vehicle.lastErrorMessage || item.vehicle.permitErrorMessage || '';

    const isMunicipalityPermit =
      errorCode === 'ERR_PERMIT_EXPIRED' ||
      errorCode.toUpperCase().includes('PERMIT') ||
      errorMsg.includes('پروانه') ||
      errorMsg.includes('شهرداری');

    if (isMunicipalityPermit) {
      setMunicipalityErrorItem(item);
    } else {
      // Standard system glitch -> Trigger simulated retry
      setRetryingKeys(prev => ({ ...prev, [key]: true }));
      showToast('در حال تلاش مجدد و رفع خطای ارتباط با وب‌سرویس...');

      setTimeout(() => {
        setRetryingKeys(prev => ({ ...prev, [key]: false }));
        onUpdateFleet(prev =>
          prev.map(f => {
            if (getPlateKey(f) === key) {
              return {
                ...f,
                vehicle: {
                  ...f.vehicle,
                  permitStatus: 'VALID',
                  permitErrorCode: 'NONE',
                  permitErrorMessage: 'فاقد خطای فعال - پروانه معتبر',
                  lastIssuanceStatus: 'SUCCESS',
                  lastErrorCode: undefined,
                  lastErrorMessage: undefined,
                },
              };
            }
            return f;
          })
        );
        showToast('خطای پلاک با موفقیت برطرف و وضعیت آن مجاز شد.');
      }, 1200);
    }
  };

  // Acknowledge municipality error
  const handleAcknowledgeMunicipalityError = (item: { vehicle: VehicleInfo; driver: DriverInfo }) => {
    const key = getPlateKey(item);
    onUpdateFleet(prev =>
      prev.map(f => {
        if (getPlateKey(f) === key) {
          return {
            ...f,
            vehicle: {
              ...f.vehicle,
              permitErrorMessage: 'در انتظار مراجعه به شهرداری و تمدید پروانه',
            },
          };
        }
        return f;
      })
    );
    showToast('وضعیت پلاک به عنوان «در انتظار بررسی شهرداری» علامت‌گذاری شد.');
  };

  // Filtered fleet based on search and status (with strict deduplication)
  const filteredFleet = useMemo(() => {
    const seenKeys = new Set<string>();

    return fleet.filter(item => {
      const key = getPlateKey(item);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);

      // 1. Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const p = item.vehicle.plate;
        const plateStr = `${p.part1}${p.letter}${p.part2}${p.provinceCode}`.toLowerCase();
        const driverName = item.driver.fullName.toLowerCase();
        const nationalCode = item.driver.nationalCode.toLowerCase();
        const mobile = item.driver.mobile.toLowerCase();

        const matches =
          plateStr.includes(query) ||
          driverName.includes(query) ||
          nationalCode.includes(query) ||
          mobile.includes(query);

        if (!matches) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'ACTIVE') return item.vehicle.isActive ?? true;
      if (statusFilter === 'IN_TRANSIT') return item.vehicle.carriageStatus === 'IN_TRANSIT';
      if (statusFilter === 'OTP_VERIFIED') return item.vehicle.otpStatus === 'VERIFIED';
      if (statusFilter === 'OTP_PENDING') return item.vehicle.otpStatus === 'PENDING_OTP';
      if (statusFilter === 'ERROR')
        return (
          item.vehicle.permitStatus === 'ERROR' || item.vehicle.lastIssuanceStatus === 'ERROR'
        );

      return true;
    });
  }, [fleet, searchTerm, statusFilter]);

  // Selection handlers
  const allFilteredSelected =
    filteredFleet.length > 0 &&
    filteredFleet.every(item => selectedPlateKeys.includes(getPlateKey(item)));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedPlateKeys([]);
    } else {
      setSelectedPlateKeys(filteredFleet.map(item => getPlateKey(item)));
    }
  };

  const handleToggleSelectRow = (key: string) => {
    setSelectedPlateKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Connection Toggle Switch handler (فعال / غیرفعال)
  const handleToggleActive = (key: string) => {
    const targetItem = fleet.find(item => getPlateKey(item) === key);
    if (targetItem && targetItem.vehicle.otpStatus === 'PENDING_OTP') {
      showToast('این پلاک در وضعیت «نیازمند کد» است و اتصال خودکار تا زمان تایید رمز دوعاملی خاموش می‌ماند.');
      return;
    }

    onUpdateFleet(prev =>
      prev.map(item => {
        if (getPlateKey(item) === key) {
          const current = item.vehicle.isActive ?? true;
          return {
            ...item,
            vehicle: {
              ...item.vehicle,
              isActive: !current,
            },
          };
        }
        return item;
      })
    );
  };

  // Carriage Status Toggle handler (در حال حمل / پایان حمل)
  const handleToggleCarriageStatus = (key: string) => {
    onUpdateFleet(prev =>
      prev.map(item => {
        if (getPlateKey(item) === key) {
          const current = item.vehicle.carriageStatus;
          const next = current === 'IN_TRANSIT' ? 'COMPLETED' : 'IN_TRANSIT';
          return {
            ...item,
            vehicle: {
              ...item.vehicle,
              carriageStatus: next,
            },
          };
        }
        return item;
      })
    );
    showToast('وضعیت حمل پلاک تغییر یافت.');
  };

  // Requirement 1: Per-Plate Auto-Register Toggle (فعال/غیرفعال کردن ثبت خودکار)
  const handleTogglePlateAutoRegister = (targetKeyOrId: string) => {
    const targetItem = fleet.find(item => {
      const k = getPlateKey(item);
      const vid = item.vehicle.id;
      return k === targetKeyOrId || vid === targetKeyOrId;
    });

    if (targetItem) {
      const current = targetItem.vehicle.isAutoRegisterEnabled !== false;
      const next = !current;
      showToast(
        next
          ? `ثبت خودکار پلاک ${targetItem.vehicle.plate.part1} ${targetItem.vehicle.plate.letter} ${targetItem.vehicle.plate.part2} فعال گردید.`
          : `ثبت خودکار پلاک ${targetItem.vehicle.plate.part1} ${targetItem.vehicle.plate.letter} ${targetItem.vehicle.plate.part2} غیرفعال شد.`
      );

      const vid = targetItem.vehicle.id;
      const k = getPlateKey(targetItem);
      fetch(`/api/plates/${encodeURIComponent(vid || k)}/toggle-auto-register`, {
        method: 'PATCH',
      }).catch(() => {});
    }

    onUpdateFleet(prev =>
      prev.map(item => {
        const k = getPlateKey(item);
        const vid = item.vehicle.id;
        if (k === targetKeyOrId || vid === targetKeyOrId) {
          const current = item.vehicle.isAutoRegisterEnabled !== false;
          const next = !current;
          return {
            ...item,
            vehicle: {
              ...item.vehicle,
              isAutoRegisterEnabled: next,
            },
          };
        }
        return item;
      })
    );
  };

  // Requirement 2, 3, 4: Global Auto-Register Continuous Loop Engine
  // - Master switch runs continuously when ON, pauses when OFF.
  // - Evaluates isAutoRegisterEnabled (skips if false).
  // - Runs asynchronous CodeBreaker flow for Coded plates without blocking the main loop.
  const activeCodeBreakersRef = useRef<Set<string>>(new Set());
  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;

  useEffect(() => {
    if (!autoRegisterEnabled) return;

    let isCancelled = false;

    const runAutoRegisterCycle = async () => {
      const currentList = fleetRef.current;
      for (const item of currentList) {
        if (isCancelled || !autoRegisterEnabled) break;

        const key = getPlateKey(item);

        // Requirement 3: Skip Logic for Disabled Plates
        if (item.vehicle.isAutoRegisterEnabled === false) {
          continue; // Immediately skip processing and continue to next plate
        }

        // Requirement 4: Asynchronous CodeBreaker Flow for Coded Plates
        if (item.vehicle.otpStatus === 'PENDING_OTP') {
          if (!activeCodeBreakersRef.current.has(key)) {
            activeCodeBreakersRef.current.add(key);
            // Non-blocking background asynchronous execution
            (async () => {
              try {
                // Await simulated SMS Panel OTP verification in background
                await new Promise(r => setTimeout(r, 4500));
                if (!isCancelled) {
                  const mockIncomingOtp = Math.floor(100000 + Math.random() * 900000).toString();
                  onUpdateFleet(prev =>
                    prev.map(f => {
                      if (getPlateKey(f) === key && f.vehicle.otpStatus === 'PENDING_OTP') {
                        return {
                          ...f,
                          vehicle: {
                            ...f.vehicle,
                            otpStatus: 'VERIFIED',
                            pendingOtpCode: undefined,
                            lastTraceCode: `UTCMS-OTP-${mockIncomingOtp}`,
                            lastActiveTime: 'هم‌اکنون',
                          },
                        };
                      }
                      return f;
                    })
                  );
                }
              } catch (e) {
                console.error('Async CodeBreaker error:', e);
              } finally {
                activeCodeBreakersRef.current.delete(key);
              }
            })();
          }
          // Continue to next plate immediately without blocking or halting the loop!
          continue;
        }

        // If ready, allow short pacing
        if (
          item.vehicle.carriageStatus === 'IDLE' &&
          item.vehicle.permitStatus !== 'ERROR' &&
          (item.vehicle.isActive ?? true)
        ) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    };

    const intervalId = setInterval(() => {
      runAutoRegisterCycle();
    }, 7000);

    runAutoRegisterCycle();

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [autoRegisterEnabled, onUpdateFleet]);

  // Batch actions
  const handleBatchAction = (action: 'START_CARRIAGE' | 'END_CARRIAGE' | 'ACTIVATE' | 'DEACTIVATE') => {
    setBatchMenuOpen(false);
    if (selectedPlateKeys.length === 0) {
      showToast('لطفاً حداقل یک پلاک را از جدول یا کارت‌ها انتخاب کنید.');
      return;
    }

    onUpdateFleet(prev =>
      prev.map(item => {
        const key = getPlateKey(item);
        if (!selectedPlateKeys.includes(key)) return item;

        if (action === 'START_CARRIAGE') {
          return {
            ...item,
            vehicle: { ...item.vehicle, carriageStatus: 'IN_TRANSIT' },
          };
        }
        if (action === 'END_CARRIAGE') {
          return {
            ...item,
            vehicle: { ...item.vehicle, carriageStatus: 'COMPLETED' },
          };
        }
        if (action === 'ACTIVATE') {
          return {
            ...item,
            vehicle: { ...item.vehicle, isActive: true },
          };
        }
        if (action === 'DEACTIVATE') {
          return {
            ...item,
            vehicle: { ...item.vehicle, isActive: false },
          };
        }
        return item;
      })
    );
    showToast(`عملیات گروهی روی ${toPersianDigits(selectedPlateKeys.length)} پلاک اعمال شد.`);
    setSelectedPlateKeys([]);
  };

  const handleExportExcel = () => {
    const headers = [
      'شماره پلاک',
      'نوع خودرو',
      'ظرفیت بار (کیلوگرم)',
      'نام راننده',
      'کد ملی',
      'شماره موبایل',
      'کارت هوشمند ناوگان',
      'وضعیت اتصال',
      'وضعیت حمل',
      'وضعیت رمز دوعاملی',
      'وضعیت پروانه سپاد',
      'کد رهگیری سپاد',
    ];

    const rows = filteredFleet.map(item => {
      const v = item.vehicle;
      const d = item.driver;
      const plateStr = `${v.plate.part1} ${v.plate.letter} ${v.plate.part2} ایران ${v.plate.provinceCode}`;
      const activeStr = (v.isActive ?? true) ? 'فعال' : 'غیرفعال';
      const carriageStr =
        v.carriageStatus === 'IN_TRANSIT'
          ? 'در حال حمل'
          : v.carriageStatus === 'COMPLETED'
          ? 'پایان حمل'
          : 'بدون حمل';
      const otpStr =
        v.otpStatus === 'VERIFIED'
          ? 'تأیید شده'
          : v.otpStatus === 'PENDING_OTP'
          ? 'در انتظار کد'
          : 'عدم نیاز';
      const permitStr =
        v.permitStatus === 'ERROR'
          ? `خطا (${v.lastErrorCode || 'UTCMS'})`
          : 'موفق و معتبر';

      return [
        `"${plateStr}"`,
        `"${v.vehicleType}"`,
        v.maxLoadCapacityKg,
        `"${d.fullName}"`,
        `"${d.nationalCode}"`,
        `"${d.mobile}"`,
        `"${v.smartCardNumber}"`,
        `"${activeStr}"`,
        `"${carriageStr}"`,
        `"${otpStr}"`,
        `"${permitStr}"`,
        `"${v.lastTraceCode || '-'}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sipaad_plates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('خروجی اکسل با موفقیت بارگیری شد.');
  };

  const handleImportSuccess = (newItems: { vehicle: VehicleInfo; driver: DriverInfo }[]) => {
    onUpdateFleet(prev => [...newItems, ...prev]);
    onPlateAdded?.(newItems.length);
    showToast(`${toPersianDigits(newItems.length)} پلاک جدید به ناوگان اضافه گردید.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-orange-500/60 text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPONENT 1: THE AUTOMATION MASTER SWITCH (ثبت خودکار باربرگها) */}
      {/* ========================================================================= */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${
          autoRegisterEnabled
            ? 'bg-white dark:bg-gray-900 border-emerald-500/50 shadow-md shadow-emerald-500/10'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3 h-3 rounded-full transition-all ${
                  autoRegisterEnabled
                    ? 'bg-emerald-500 shadow-md shadow-emerald-500 animate-pulse'
                    : 'bg-gray-400 dark:bg-gray-600'
                }`}
              />
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight">
                ثبت خودکار باربرگها
              </h2>
              {autoRegisterEnabled && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 animate-pulse">
                  در حال اجرای فرایند پس‌زمینه
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              سوئیچ اصلی فرآیند صدور خودکار: در شیفت روز (روشن) سیستم به صورت پیوسته باربرگ‌ها را به سپاد ارسال می‌کند؛ در شیفت شب (خاموش) متوقف می‌ماند.
            </p>
          </div>

          {/* Large, Prominent Toggle Switch */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <span
              className={`text-xs font-bold transition-colors ${
                autoRegisterEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {autoRegisterEnabled ? 'فعال (روز)' : 'غیرفعال (شب)'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={autoRegisterEnabled}
              onClick={onToggleAutoRegister}
              className={`w-16 h-9 rounded-full transition-all duration-300 relative cursor-pointer p-1 border shadow-inner ${
                autoRegisterEnabled
                  ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/30'
                  : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full bg-white transition-transform duration-300 shadow-md flex items-center justify-center ${
                  autoRegisterEnabled ? '-translate-x-7' : 'translate-x-0'
                }`}
              >
                <Power
                  className={`w-4 h-4 transition-colors ${
                    autoRegisterEnabled ? 'text-emerald-600' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPONENT 2: TWO-FACTOR (OTP) ACTION QUEUE (پلاکهای کُدی) */}
      {/* ========================================================================= */}
      <OtpActionQueue
        items={otpQueueItems}
        onInjectOtp={handleInjectOtp}
      />

      {/* ========================================================================= */}
      {/* COMPONENT 3: FLEET MONITORING & SMART ERROR HANDLING */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Controls, Search, and Batch Tools */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو با پلاک، کد ملی یا نام راننده..."
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs cursor-pointer"
              >
                پاک کردن
              </button>
            )}
          </div>

          {/* Action Tools: Add Driver, Excel & View Mode */}
          <div className="flex items-center gap-2 justify-between md:justify-end flex-wrap">
            {onNavigateToTab && currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => onNavigateToTab('ADMIN_CREATE_USER')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black text-orange-400 border border-orange-500/50 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                title="ایجاد پنل کاربر پشتیبان و ثبت مشتری جدید"
              >
                <UserPlus className="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />
                <span>ایجاد پنل کاربر</span>
              </button>
            )}

            <button
              onClick={() => setShowAddDriverModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>افزودن راننده</span>
            </button>

            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-orange-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>بارگذاری گروهی اکسل</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-orange-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-500" />
              <span>خروجی اکسل</span>
            </button>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'CARDS'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-500'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">کارت‌ها</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-500'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">جدول</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-orange-500'
            }`}
          >
            همه ناوگان ({toPersianDigits(totalCount)})
          </button>
          <button
            onClick={() => setStatusFilter('ERROR')}
            className={`px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'ERROR'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 border-gray-200 dark:border-gray-800 hover:bg-rose-50 dark:hover:bg-rose-950/20'
            }`}
          >
            دارای خطا ({toPersianDigits(errorCount)})
          </button>
          <button
            onClick={() => setStatusFilter('OTP_PENDING')}
            className={`px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'OTP_PENDING'
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 border-gray-200 dark:border-gray-800 hover:bg-orange-50 dark:hover:bg-orange-950/20'
            }`}
          >
            نیازمند کد دوعاملی ({toPersianDigits(pendingOtpVehiclesCount)})
          </button>
          <button
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className={`px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'IN_TRANSIT'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-sky-600 dark:text-sky-400 border-gray-200 dark:border-gray-800 hover:bg-sky-50 dark:hover:bg-sky-950/20'
            }`}
          >
            در حال حمل ({toPersianDigits(inTransitCount)})
          </button>
        </div>

        {/* 1. RESPONSIVE MOBILE CARDS VIEW */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 ${
            viewMode === 'TABLE' ? 'hidden' : viewMode === 'CARDS' ? 'grid' : 'grid lg:hidden'
          }`}
        >
          {filteredFleet.map((item, idx) => {
            const key = getPlateKey(item);
            const cardUniqueKey = `${key}-${item.vehicle.id || item.vehicle.smartCardNumber || item.driver.nationalCode || 'v'}-${idx}`;
            // When pending OTP (2FA error from Sipaad), the toggle switch for connection MUST strictly be in the OFF state
            const isVehicleActive = item.vehicle.otpStatus === 'PENDING_OTP' ? false : (item.vehicle.isActive ?? true);
            const isAutoRegEnabled = item.vehicle.isAutoRegisterEnabled !== false;
            const hasError =
              item.vehicle.permitStatus === 'ERROR' ||
              item.vehicle.lastIssuanceStatus === 'ERROR';
            const isRetrying = retryingKeys[key];

            return (
              <div
                key={cardUniqueKey}
                className={`p-4 rounded-2xl border transition-all ${
                  !isAutoRegEnabled
                    ? 'opacity-45 bg-gray-50/60 dark:bg-gray-900/40 border-dashed border-gray-300 dark:border-gray-800 shadow-none'
                    : hasError
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 shadow-xs'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
                }`}
              >
                {/* Top: Plate & Connection Switch */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <PlateBadge
                      plate={item.vehicle.plate}
                      tonnageKg={item.vehicle.maxLoadCapacityKg}
                      biweeklyWaybillCount={item.vehicle.biweeklyWaybillCount ?? 0}
                      stage1Count={item.vehicle.stage1WaybillCount}
                      stage2Count={item.vehicle.stage2WaybillCount}
                      biweeklyQuotaLimit={item.vehicle.biweeklyQuotaLimit ?? 15}
                      size="sm"
                    />
                    {!isAutoRegEnabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        ثبت خودکار غیرفعال
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">اتصال:</span>
                    <button
                      onClick={() => handleToggleActive(key)}
                      className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                        isVehicleActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-1 ${
                          isVehicleActive ? 'left-1' : 'right-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="py-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">راننده:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{item.driver.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">ناوگان:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{item.vehicle.vehicleType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">وضعیت حمل:</span>
                    <button
                      onClick={() => handleToggleCarriageStatus(key)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        item.vehicle.carriageStatus === 'IN_TRANSIT'
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.vehicle.carriageStatus === 'IN_TRANSIT' ? 'در حال حمل' : 'پایان حمل'}
                    </button>
                  </div>

                  {/* Dual Stage Waybill Stats (Jalali 15-day Split) */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400 text-[11px]">آمار تفکیکی:</span>
                    <BiweeklyStageStatsBadge
                      stage1Count={item.vehicle.stage1WaybillCount}
                      stage2Count={item.vehicle.stage2WaybillCount}
                      totalCount={item.vehicle.biweeklyWaybillCount}
                      quotaLimit={item.vehicle.biweeklyQuotaLimit ?? 15}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Bottom: Error Handling or Status */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                  {hasError ? (
                    <div className="w-full flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-rose-300 truncate">
                        {item.vehicle.lastErrorMessage || item.vehicle.permitErrorMessage || 'خطای استعلام'}
                      </span>
                      {/* Prominent Fix Error Button & Plate Action Menu */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isRetrying}
                          onClick={() => handleFixError(item)}
                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm disabled:opacity-50"
                        >
                          {isRetrying ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5" />
                          )}
                          <span>رفع خطا</span>
                        </button>
                        <PlateActionMenu
                          plateId={item.vehicle.id || key}
                          plateLabel={`${item.vehicle.plate.part1} ${item.vehicle.plate.letter} ${item.vehicle.plate.part2}`}
                          isAutoRegisterEnabled={isAutoRegEnabled}
                          onToggleAutoRegister={() => handleTogglePlateAutoRegister(item.vehicle.id || key)}
                          onRetry={() => handleRetryWaybill(item.vehicle.id || key)}
                          onDelete={() => handleDeletePlate(item.vehicle.id || key, key, item.vehicle.id)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>پروانه معتبر</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={registeringTransportPlateId === (item.vehicle.id || key)}
                          onClick={() => handleRegisterTransport(item)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="ثبت فوری باربرگ با حمل"
                        >
                          {registeringTransportPlateId === (item.vehicle.id || key) ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>در حال ثبت...</span>
                            </>
                          ) : (
                            <span>ثبت با حمل</span>
                          )}
                        </button>
                        <button
                          onClick={() => onRegisterRoundTrip(item)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                        >
                          رفت و برگشت
                        </button>
                        <PlateActionMenu
                          plateId={item.vehicle.id || key}
                          plateLabel={`${item.vehicle.plate.part1} ${item.vehicle.plate.letter} ${item.vehicle.plate.part2}`}
                          isAutoRegisterEnabled={isAutoRegEnabled}
                          onToggleAutoRegister={() => handleTogglePlateAutoRegister(item.vehicle.id || key)}
                          onRetry={() => handleRetryWaybill(item.vehicle.id || key)}
                          onDelete={() => handleDeletePlate(item.vehicle.id || key, key, item.vehicle.id)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. DATA GRID TABLE (Visible on desktop screens or when viewMode === 'TABLE') */}
        <div
          className={`border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs ${
            viewMode === 'CARDS' ? 'hidden' : viewMode === 'TABLE' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/90 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 font-bold select-none">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <div onClick={handleToggleSelectAll} className="cursor-pointer">
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                      )}
                    </div>
                  </th>
                  <th className="p-3.5">پلاک، تناژ و ثبت ۱۵ روزه</th>
                  <th className="p-3.5">راننده و کد ملی</th>
                  <th className="p-3.5">نوع ناوگان</th>
                  <th className="p-3.5 text-center">اتصال</th>
                  <th className="p-3.5 text-center">وضعیت حمل</th>
                  <th className="p-3.5 text-center">وضعیت دوعاملی</th>
                  <th className="p-3.5">وضعیت و رفع خطا</th>
                  <th className="p-3.5 text-left pl-4">عملیات صدور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                {filteredFleet.map((item, idx) => {
                  const key = getPlateKey(item);
                  const rowUniqueKey = `${key}-${item.vehicle.id || item.vehicle.smartCardNumber || item.driver.nationalCode || 'v'}-${idx}`;
                  const isSelected = selectedPlateKeys.includes(key);
                  // When pending OTP (2FA error from Sipaad), the toggle switch for connection MUST strictly be in the OFF state
                  const isVehicleActive = item.vehicle.otpStatus === 'PENDING_OTP' ? false : (item.vehicle.isActive ?? true);
                  const isAutoRegEnabled = item.vehicle.isAutoRegisterEnabled !== false;
                  const hasError =
                    item.vehicle.permitStatus === 'ERROR' ||
                    item.vehicle.lastIssuanceStatus === 'ERROR';
                  const isRetrying = retryingKeys[key];

                  return (
                    <tr
                      key={rowUniqueKey}
                      className={`transition-all ${
                        !isAutoRegEnabled
                          ? 'opacity-40 bg-gray-50/60 dark:bg-gray-900/40 hover:opacity-75'
                          : isSelected
                          ? 'bg-orange-50 dark:bg-orange-950/20'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <div
                          onClick={() => handleToggleSelectRow(key)}
                          className="cursor-pointer inline-block"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400" />
                          )}
                        </div>
                      </td>

                      {/* Plate with Tonnage and 15-day Waybill Registration Count */}
                      <td className="p-3.5">
                        <PlateBadge
                          plate={item.vehicle.plate}
                          tonnageKg={item.vehicle.maxLoadCapacityKg}
                          biweeklyWaybillCount={item.vehicle.biweeklyWaybillCount ?? 0}
                          stage1Count={item.vehicle.stage1WaybillCount}
                          stage2Count={item.vehicle.stage2WaybillCount}
                          biweeklyQuotaLimit={item.vehicle.biweeklyQuotaLimit ?? 15}
                          size="sm"
                        />
                      </td>

                      {/* Driver */}
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 dark:text-gray-100">{item.driver.fullName}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          {toPersianDigits(item.driver.nationalCode)}
                        </div>
                      </td>

                      {/* Vehicle Type */}
                      <td className="p-3.5">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{item.vehicle.vehicleType}</span>
                      </td>

                      {/* Connection Switch */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleActive(key)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer inline-block align-middle ${
                            isVehicleActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-1 ${
                              isVehicleActive ? 'left-1' : 'right-1'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Carriage Status Toggle */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleCarriageStatus(key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            item.vehicle.carriageStatus === 'IN_TRANSIT'
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <span>
                            {item.vehicle.carriageStatus === 'IN_TRANSIT' ? 'در حال حمل' : 'پایان حمل'}
                          </span>
                        </button>
                      </td>

                      {/* 2FA Status */}
                      <td className="p-3.5 text-center">
                        {item.vehicle.otpStatus === 'PENDING_OTP' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/40">
                            نیازمند کد
                          </span>
                        ) : item.vehicle.otpStatus === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>تأیید شده</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                        )}
                      </td>

                      {/* Smart Error Handling Column */}
                      <td className="p-3.5">
                        {hasError ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isRetrying}
                              onClick={() => handleFixError(item)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {isRetrying ? (
                                <RotateCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Wrench className="w-3 h-3" />
                              )}
                              <span>رفع خطا</span>
                            </button>
                            <span className="text-[11px] text-rose-600 dark:text-rose-300 truncate max-w-[120px]">
                              {item.vehicle.lastErrorCode || 'خطای پروانه/سپاد'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>معتبر</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-left pl-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={registeringTransportPlateId === (item.vehicle.id || key)}
                            onClick={() => handleRegisterTransport(item)}
                            className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title="ثبت فوری باربرگ با حمل"
                          >
                            {registeringTransportPlateId === (item.vehicle.id || key) ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>در حال ثبت...</span>
                              </>
                            ) : (
                              <span>ثبت با حمل</span>
                            )}
                          </button>
                          <button
                            onClick={() => onRegisterRoundTrip(item)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                          >
                            رفت و برگشت
                          </button>
                          <PlateActionMenu
                            plateId={item.vehicle.id || key}
                            plateLabel={`${item.vehicle.plate.part1} ${item.vehicle.plate.letter} ${item.vehicle.plate.part2}`}
                            isAutoRegisterEnabled={isAutoRegEnabled}
                            onToggleAutoRegister={() => handleTogglePlateAutoRegister(item.vehicle.id || key)}
                            onRetry={() => handleRetryWaybill(item.vehicle.id || key)}
                            onDelete={() => handleDeletePlate(item.vehicle.id || key, key, item.vehicle.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Municipality Permit Error Modal */}
      <MunicipalityPermitErrorModal
        isOpen={municipalityErrorItem !== null}
        item={municipalityErrorItem}
        onClose={() => setMunicipalityErrorItem(null)}
        onAcknowledge={handleAcknowledgeMunicipalityError}
      />

      {/* Standard Error Details Modal */}
      {errorModalItem && (
        <ErrorDetailsModal
          vehicle={errorModalItem.vehicle}
          driver={errorModalItem.driver}
          onClose={() => setErrorModalItem(null)}
          onRetryInquiry={() => {
            showToast('استعلام مجدد ارسال شد.');
          }}
        />
      )}

      {/* OTP Entry Modal */}
      {otpModalItem && (
        <OtpEntryModal
          vehicle={otpModalItem.vehicle}
          driver={otpModalItem.driver}
          onClose={() => setOtpModalItem(null)}
          onVerifySuccess={(plateStr, code) => {
            showToast('کد با موفقیت تایید شد.');
          }}
        />
      )}

      {/* Refactored Batch Excel Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          onUploadSuccess={() => {
            setIsBulkProcessingActive(true);
            showToast('در حال اعتبارسنجی اطلاعات با سرور مرکزی... این عملیات ممکن است چند دقیقه طول بکشد.');
          }}
          showToastNotification={showToast}
        />
      )}

      {/* Legacy Excel Import Modal (Fallback) */}
      {showExcelImport && (
        <ExcelImportModal
          onClose={() => setShowExcelImport(false)}
          onImport={handleImportSuccess}
        />
      )}

      {/* 2-Step Add Driver Modal */}
      {showAddDriverModal && (
        <AddDriverModal
          isOpen={showAddDriverModal}
          onClose={() => setShowAddDriverModal(false)}
          onDriverAdded={(newDriver) => {
            onUpdateFleet(prev => [newDriver, ...prev]);
            if (onPlateAdded) onPlateAdded(1);
            showToast(`راننده «${newDriver.driver.fullName}» با موفقیت به لیست پلاک‌های داشبورد افزوده شد.`);
          }}
          showToastNotification={showToast}
          currentPlateCount={currentPlateCount}
          maxPlateCapacity={maxPlateCapacity}
        />
      )}
    </div>
  );
};
