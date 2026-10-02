export type LicensePlateLetter = 
  | 'الف' | 'ب' | 'پ' | 'ت' | 'ث' | 'ج' | 'د' | 'ر' | 'ز' | 'س' 
  | 'ش' | 'ص' | 'ط' | 'ع' | 'ف' | 'ق' | 'ک' | 'گ' | 'ل' | 'م' 
  | 'ن' | 'و' | 'ه' | 'ی' | 'معلول';

export interface IranPlate {
  part1: string; // e.g. "12"
  letter: LicensePlateLetter; // e.g. "ع" (public transport)
  part2: string; // e.g. "345"
  provinceCode: string; // e.g. "77"
  type: 'public' | 'commercial' | 'private' | 'governmental';
}

export type WaybillStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'ISSUED'
  | 'REJECTED'
  | 'FAILED'
  | 'REVOKED';

export interface DriverInfo {
  fullName: string;
  nationalCode: string;
  mobile: string;
  smartCardNumber: string;
  licenseNumber: string;
  assignedSupportId?: string; // شناسه اپراتور پشتیبان
  assignedSupportName?: string; // نام پشتیبان مسئول
}

export interface VehicleInfo {
  id?: string;
  plate: IranPlate;
  vehicleType: 'وانت نیسان' | 'کامیونت ایسوزو' | 'کامیون بنز تک' | 'خاور ۶۰۸' | 'وانت پیکان/آریسان' | 'تریلر کفی شهری';
  smartCardNumber: string;
  technicalInspectionExpiry: string;
  insurancePolicyNumber: string;
  maxLoadCapacityKg: number;
  vinNumber?: string;
  fuelType?: 'گازوئیل' | 'بنزین';
  
  // Status of issuance permit and error reporting
  permitStatus?: 'VALID' | 'WARNING' | 'ERROR';
  permitErrorCode?: 'NONE' | 'ERR_PERMIT_EXPIRED' | 'ERR_INSPECTION_LAPSED' | 'ERR_INSURANCE_MISMATCH' | 'ERR_QUOTA_EXCEEDED' | 'ERR_SMARTCARD_REVOKED';
  permitErrorMessage?: string;
  
  // Operational dashboard fields
  isActive?: boolean; // سوئیچ اتصال فعال/غیرفعال
  isAutoRegisterEnabled?: boolean; // سوئیچ ثبت خودکار مختص به هر پلاک (پیش‌فرض: true)
  carriageStatus?: 'IN_TRANSIT' | 'IDLE' | 'COMPLETED'; // در حال حمل / پایان حمل
  otpStatus?: 'VERIFIED' | 'PENDING_OTP' | 'NOT_REQUIRED'; // وضعیت کد دوعاملی
  pendingOtpCode?: string; // کد موقت در انتظار
  otpExpiresAt?: string;
  otpRemainingSeconds?: number; // ثانیه‌های باقی‌مانده انقضای رمز
  lastOtpRequestedAt?: string; // تاریخ/ساعت آخرین درخواست رمز دوعاملی
  lastTraceCode?: string; // کد رهگیری سپاد (TraceCode)
  lastErrorCode?: string;
  lastErrorMessage?: string;
  suggestedAction?: string; // راهنمای اقدام جهت رفع خطا
  lastIssuanceStatus?: 'SUCCESS' | 'ERROR' | 'QUEUED' | 'NONE';
  lastActiveTime?: string;

  // Multi-tenant Support assignment
  assignedSupportId?: string; // شناسه پشتیبان
  assignedSupportName?: string; // نام اپراتور پشتیبان

  // 15-day Jalali split period metrics for Sipaad quota calculation
  biweeklyWaybillCount?: number; // مجموع ثبت باربرگ طی دوره ۱۵ روزه
  stage1WaybillCount?: number; // مرحله اول (۸ تا ۲۳): از ۸ تا ۲۲ ماه جاری جلالی
  stage2WaybillCount?: number; // مرحله دوم (۲۳ تا ۸): از ۲۳ ماه جاری تا ۷ ماه بعد جلالی
  biweeklyQuotaLimit?: number; // سقف مجاز ثبت باربرگ در دوره ۱۵ روزه
  fuelQuotaLiters?: number; // سهمیه سوخت دوره
}

export interface FuelPeriodRecord {
  periodId: string;
  periodName: string; // e.g. "نیمه اول شهریور ۱۴۰۴"
  barbargCount: number; // تعداد باربرگ صادر شده
  tonnageTransportedKg: number;
  distanceKm: number;
  baseQuotaLiters: number;
  performanceQuotaLiters: number;
  totalAllocatedLiters: number;
  depositStatus: 'DEPOSITED' | 'PENDING' | 'REJECTED';
  trackingNumber?: string;
  depositDate?: string;
}

export interface FuelQuotaRecord {
  id: string;
  plate: IranPlate;
  vin: string;
  vehicleType: string;
  fuelType: 'گازوئیل' | 'بنزین';
  smartCardNumber: string;
  fuelCardPan: string; // شماره کارت سوخت
  driverName: string;
  currentPeriodName: string;
  biweeklyWaybillCount: number;
  baseQuotaLiters: number;
  performanceQuotaLiters: number;
  totalCurrentQuotaLiters: number;
  lastDepositDate: string;
  depositStatus: 'DEPOSITED' | 'PENDING' | 'CALCULATING' | 'REJECTED';
  history: FuelPeriodRecord[];
}

export interface WaybillItem {
  id: string;
  trackingCode?: string; // کد رهگیری سامانه سپاد (UTCMS)
  waybillNumber: string; // شماره سریال بارنامه شرکت صادرکننده
  idempotencyKey: string;
  issueDateTime: string;
  status: WaybillStatus;
  
  // Issuer details
  companyCode: string;
  companyName: string;
  issuerUserName: string;
  
  // Sender & Receiver
  senderName: string;
  senderNationalId: string;
  senderAddress: string;
  senderCity: string;
  
  receiverName: string;
  receiverNationalId: string;
  receiverAddress: string;
  receiverCity: string;
  
  // Cargo details
  cargoDescription: string;
  weightKg: number;
  packingType: string;
  cargoValueRials: number;
  
  // Financials
  freightCostRials: number;
  commissionRials: number;
  insuranceCostRials: number;
  municipalTollRials: number; // عوارض شهرداری
  totalCostRials: number;
  
  // Fleet & Driver
  driver: DriverInfo;
  vehicle: VehicleInfo;
  
  // Sipaad / UTCMS Response Info
  sipaadResponse?: {
    sipaadCode: string;
    saltUsed: number;
    hashedSignature: string;
    serverTimestamp: string;
    statusText: string;
    rawPayloadSent?: Record<string, unknown>;
  };
  errorMessage?: string;
  errorCode?: string;
  retryCount: number;
  isRoundTrip?: boolean;
  roundTripLeg?: 'OUTBOUND' | 'RETURN';
  pairedWaybillId?: string;
}

export interface BatchJobItem {
  jobId: string;
  batchId: string;
  plate: IranPlate;
  driverNationalCode: string;
  driverName: string;
  cargoDescription: string;
  weightKg: number;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  idempotencyKey: string;
  resultWaybillId?: string;
  trackingCode?: string;
  errorMessage?: string;
  errorCode?: string;
  processedAt?: string;
  durationMs?: number;
}

export interface BatchProcess {
  id: string;
  title: string;
  createdAt: string;
  totalJobs: number;
  completedJobs: number;
  successCount: number;
  errorCount: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  workerConcurrency: number;
  jobs: BatchJobItem[];
}

export interface CaptchaSettings {
  enabledForLogin: boolean;
  enabledForHighTonnage: boolean;
  enabledForBatchIssuance: boolean;
  difficulty: 'NUMERIC_4' | 'ALPHANUMERIC_5' | 'MATH_SUM';
  expirySeconds: number;
  caseSensitive: boolean;
}

export interface SipaadCredentials {
  companyCode: string;
  password: string; // stored hashed or plain for hashing calculation
  endpointUrlBol: string;
  endpointUrlFreighter: string;
  isSandboxMode: boolean;
  autoRetryOnRateLimit: boolean;
  maxWorkerConcurrency: number;
  issuerTitle: string;
  guildPermitNumber: string; // شماره پروانه فعالیت
  captchaSettings?: CaptchaSettings;
  autoRegisterIntervalMinutes?: number; // بازه ثبت خودکار (دقیقه)
  roundTripModeEnabled?: boolean; // حالت رفت و برگشت
  registrationServer?: 'WEB' | 'MOBILE'; // سرور ثبت: وب یا موبایل
}

export interface SipaadHashCalculation {
  companyCode: string;
  passwordSha512: string;
  salt: number;
  hashedValue: string;
  calculatedAt: string;
  rawStringBeforeFinalHash: string;
}

export type UserRole = 'ADMIN' | 'SUPPORT' | 'DRIVER' | 'SUPER_ADMIN' | 'ISSUER_OPERATOR' | 'FLEET_MANAGER';

export interface AuthUser {
  id: string;
  companyCode: string;
  companyName: string;
  nationalId: string;
  username: string;
  fullName?: string;
  mobile: string;
  permitNumber: string;
  role: UserRole;
  roleTitle: string;
  plateCapacity?: number;
  lastLoginAt: string;
  is_active?: boolean;
  days_left?: number;
  created_at?: string;
}

export interface OTPRecord {
  id: string;
  mobile: string;
  purpose: 'ISSUER_AUTH' | 'DRIVER_VERIFICATION' | 'WAYBILL_REVOCATION';
  otpCode: string;
  expiresAt: string;
  isUsed: boolean;
  referenceId: string;
}
