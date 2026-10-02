import { IranPlate, LicensePlateLetter } from '../types';

export const IRAN_PLATE_LETTERS: LicensePlateLetter[] = [
  'ع', // عمومی (اکثر ناوگان باربری)
  'الف',
  'ب',
  'پ',
  'ت',
  'ث',
  'ج',
  'د',
  'ر',
  'ز',
  'س',
  'ش',
  'ص',
  'ط',
  'ف',
  'ق',
  'ک',
  'گ',
  'ل',
  'م',
  'ن',
  'و',
  'ه',
  'ی',
  'معلول',
];

export const PROVINCE_CODES: { code: string; title: string }[] = [
  { code: '11', title: 'تهران (مرکزی)' },
  { code: '22', title: 'تهران (شرق)' },
  { code: '33', title: 'تهران (غرب)' },
  { code: '44', title: 'تهران (جنوب)' },
  { code: '55', title: 'تهران (شمال)' },
  { code: '66', title: 'تهران (پیرامون)' },
  { code: '77', title: 'تهران (شهر)' },
  { code: '88', title: 'تهران (شهر)' },
  { code: '99', title: 'تهران (شهر)' },
  { code: '12', title: 'مشهد / خراسان رضوی' },
  { code: '36', title: 'مشهد / خراسان رضوی' },
  { code: '13', title: 'اصفهان' },
  { code: '23', title: 'اصفهان' },
  { code: '63', title: 'فارس / شیراز' },
  { code: '73', title: 'فارس / شیراز' },
  { code: '15', title: 'تبریز / آذربایجان شرقی' },
  { code: '25', title: 'تبریز / آذربایجان شرقی' },
  { code: '24', title: 'خوزستان / اهواز' },
  { code: '14', title: 'خوزستان / اهواز' },
  { code: '68', title: 'البرز / کرج' },
];

/**
 * Converts English digits to Persian digits
 */
export function toPersianDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, w => persianDigits[parseInt(w, 10)]);
}

/**
 * Converts Persian/Arabic digits to standard English digits
 */
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632));
}

/**
 * Formats currency in Rials or Tomans
 */
export function formatRials(amount: number): string {
  const formatted = new Intl.NumberFormat('fa-IR').format(amount);
  return `${formatted} ریال`;
}

export function formatTomans(amountRials: number): string {
  const tomans = Math.floor(amountRials / 10);
  const formatted = new Intl.NumberFormat('fa-IR').format(tomans);
  return `${formatted} تومان`;
}

/**
 * Formats Iranian Plate as string for Sipaad API
 * e.g. "12-ع-345-77"
 */
export function formatPlateToSipaadStandard(plate: IranPlate): string {
  return `${plate.part1}${plate.letter}${plate.part2}-${plate.provinceCode}`;
}

/**
 * Validates Iranian 10-digit National Code
 */
export function isValidNationalCode(code: string): boolean {
  const clean = toEnglishDigits(code).trim();
  if (!/^\d{10}$/.test(clean)) return false;
  if (/^(\d)\1{9}$/.test(clean)) return false;

  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }
  const rem = sum % 11;
  return (rem < 2 && check === rem) || (rem >= 2 && check === 11 - rem);
}

/**
 * Parses raw plate string like "12ع345-77" or "12 ع 345 ایران 77"
 */
export function parseRawPlate(raw: string): IranPlate | null {
  const clean = toEnglishDigits(raw).replace(/\s+/g, '');
  const match = clean.match(/^(\d{2})([^\d]+)(\d{3})(?:-|ایران)?(\d{2})$/);
  if (!match) return null;

  return {
    part1: match[1],
    letter: (match[2] as LicensePlateLetter) || 'ع',
    part2: match[3],
    provinceCode: match[4],
    type: match[2] === 'ع' ? 'public' : 'commercial',
  };
}

/**
 * Formats weight in Kg to readable Persian tonnage and Kg
 * e.g. 3800 -> "۳.۸ تن (۳,۸۰۰ ک‌گ)"
 */
export function formatTonnage(weightKg?: number | null, includeKg = true): string {
  if (!weightKg || isNaN(weightKg)) return '۰ تن';
  const tons = (weightKg / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 });
  if (!includeKg) return `${tons} تن`;
  const kgStr = toPersianDigits(weightKg.toLocaleString('fa-IR'));
  return `${tons} تن (${kgStr} ک‌گ)`;
}

