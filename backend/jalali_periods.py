"""
helibar | هلی‌بار - Jalali Biweekly Period Boundaries & Waybill Statistics Utility
Calculates strictly defined 15-day periods based on the Persian (Jalali) Calendar:

Stage 1 (مرحله اول):
  - Starts on the 8th day (00:00:00) of the current Jalali month.
  - Ends on the 22nd day (23:59:59) of the current Jalali month.

Stage 2 (مرحله دوم):
  - Starts on the 23rd day (00:00:00) of the current Jalali month.
  - Ends on the 7th day (23:59:59) of the NEXT Jalali month.

Uses `jdatetime` when available, with a complete built-in astronomical fallback algorithm.
"""

from datetime import datetime, date, time
from typing import Any, Dict, Optional, Tuple, Union
import logging

logger = logging.getLogger("backend.jalali_periods")

# Attempt importing jdatetime
try:
    import jdatetime
    HAS_JDATETIME = True
except ImportError:
    jdatetime = None
    HAS_JDATETIME = False


# ---------------------------------------------------------------------------
# High-precision Jalali <-> Gregorian conversion algorithms (fallback)
# ---------------------------------------------------------------------------
def _gregorian_to_jalali(gy: int, gm: int, gd: int) -> Tuple[int, int, int]:
    """Converts a Gregorian date (year, month, day) to Jalali (year, month, day)."""
    g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    gy2 = gy if gm > 2 else gy - 1
    days = 355666 + (365 * gy) + ((gy2 + 3) // 4) - ((gy2 + 99) // 100) + ((gy2 + 399) // 400) + gd + g_d_m[gm - 1]
    jy = -1595 + (33 * (days // 12053))
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + (days // 31)
        jd = 1 + (days % 31)
    else:
        jm = 7 + ((days - 186) // 30)
        jd = 1 + ((days - 186) % 30)
    return jy, jm, jd


def _jalali_to_gregorian(jy: int, jm: int, jd: int) -> Tuple[int, int, int]:
    """Converts a Jalali date (year, month, day) to Gregorian (year, month, day)."""
    jy += 1595
    days = -355668 + (365 * jy) + ((jy // 33) * 8) + (((jy % 33) + 3) // 4) + jd
    if jm < 7:
        days += (jm - 1) * 31
    else:
        days += ((jm - 7) * 30) + 186
    gy = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    gd = days + 1
    leap = 1 if ((gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0)) else 0
    sal_a = [0, 31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gm = 0
    while gm < 13 and gd > sal_a[gm]:
        gd -= sal_a[gm]
        gm += 1
    return gy, gm, gd


JALALI_MONTH_NAMES = [
    "",
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
]


# ---------------------------------------------------------------------------
# Core Boundary Calculation Function
# ---------------------------------------------------------------------------
def get_jalali_biweekly_stages(
    ref_date: Optional[Union[datetime, date]] = None,
) -> Dict[str, Any]:
    """
    Calculates the two strictly defined Jalali 15-day period boundaries:

    Stage 1 (مرحله اول):
      - 8th day (00:00:00) to 22nd day (23:59:59) of the current Jalali month.

    Stage 2 (مرحله دوم):
      - 23rd day (00:00:00) of the current Jalali month to 7th day (23:59:59) of the NEXT Jalali month.

    Returns a rich dictionary containing:
      - stage1_start, stage1_end (Python datetime in Gregorian for SQL queries)
      - stage2_start, stage2_end (Python datetime in Gregorian for SQL queries)
      - Jalali date strings, labels, current month name, and active stage indicator.
    """
    if ref_date is None:
        ref_dt = datetime.now()
    elif isinstance(ref_date, datetime):
        ref_dt = ref_date
    elif isinstance(ref_date, date):
        ref_dt = datetime.combine(ref_date, time(0, 0, 0))
    else:
        ref_dt = datetime.now()

    # Determine Jalali Year, Month, Day
    if HAS_JDATETIME and jdatetime:
        j_now = jdatetime.datetime.fromgregorian(datetime=ref_dt)
        jy = j_now.year
        jm = j_now.month
        jd = j_now.day
    else:
        jy, jm, jd = _gregorian_to_jalali(ref_dt.year, ref_dt.month, ref_dt.day)

    # Next Jalali Month calculation
    if jm == 12:
        next_jy = jy + 1
        next_jm = 1
    else:
        next_jy = jy
        next_jm = jm + 1

    # Stage 1: 8th (00:00:00) to 22nd (23:59:59) of current Jalali month
    if HAS_JDATETIME and jdatetime:
        s1_start_j = jdatetime.datetime(jy, jm, 8, 0, 0, 0)
        s1_end_j = jdatetime.datetime(jy, jm, 22, 23, 59, 59)
        stage1_start = s1_start_j.togregorian()
        stage1_end = s1_end_j.togregorian()

        # Stage 2: 23rd (00:00:00) of current to 7th (23:59:59) of next Jalali month
        s2_start_j = jdatetime.datetime(jy, jm, 23, 0, 0, 0)
        s2_end_j = jdatetime.datetime(next_jy, next_jm, 7, 23, 59, 59)
        stage2_start = s2_start_j.togregorian()
        stage2_end = s2_end_j.togregorian()
    else:
        gy1_s, gm1_s, gd1_s = _jalali_to_gregorian(jy, jm, 8)
        gy1_e, gm1_e, gd1_e = _jalali_to_gregorian(jy, jm, 22)
        stage1_start = datetime(gy1_s, gm1_s, gd1_s, 0, 0, 0)
        stage1_end = datetime(gy1_e, gm1_e, gd1_e, 23, 59, 59)

        gy2_s, gm2_s, gd2_s = _jalali_to_gregorian(jy, jm, 23)
        gy2_e, gm2_e, gd2_e = _jalali_to_gregorian(next_jy, next_jm, 7)
        stage2_start = datetime(gy2_s, gm2_s, gd2_s, 0, 0, 0)
        stage2_end = datetime(gy2_e, gm2_e, gd2_e, 23, 59, 59)

    # Determine currently active stage relative to today
    current_month_name = JALALI_MONTH_NAMES[jm] if 1 <= jm <= 12 else f"ماه {jm}"
    next_month_name = JALALI_MONTH_NAMES[next_jm] if 1 <= next_jm <= 12 else f"ماه {next_jm}"

    # If day is 8 to 22: active stage is 1. If 23 to end or 1 to 7: active stage is 2.
    if 8 <= jd <= 22:
        active_stage = 1
    else:
        active_stage = 2

    return {
        "jalali_year": jy,
        "jalali_month": jm,
        "jalali_day": jd,
        "current_month_name": current_month_name,
        "next_month_name": next_month_name,
        "active_stage": active_stage,
        # Stage 1 Details
        "stage1": {
            "title": "مرحله اول (۸ تا ۲۳)",
            "jalali_range": f"۸ تا ۲۲ {current_month_name} {jy}",
            "start": stage1_start,
            "end": stage1_end,
            "start_iso": stage1_start.isoformat(),
            "end_iso": stage1_end.isoformat(),
        },
        # Stage 2 Details
        "stage2": {
            "title": "مرحله دوم (۲۳ تا ۸)",
            "jalali_range": f"۲۳ {current_month_name} تا ۷ {next_month_name}",
            "start": stage2_start,
            "end": stage2_end,
            "start_iso": stage2_start.isoformat(),
            "end_iso": stage2_end.isoformat(),
        },
    }


def get_stage_boundaries_gregorian(
    ref_date: Optional[Union[datetime, date]] = None,
) -> Tuple[datetime, datetime, datetime, datetime]:
    """
    Returns exact (stage1_start, stage1_end, stage2_start, stage2_end) as
    Python datetime objects for use in SQLAlchemy filters.
    """
    res = get_jalali_biweekly_stages(ref_date)
    return (
        res["stage1"]["start"],
        res["stage1"]["end"],
        res["stage2"]["start"],
        res["stage2"]["end"],
    )


# ---------------------------------------------------------------------------
# Strict Two-Stage Fuel Inquiry Timestamp & Date Boundary Calculation
# ---------------------------------------------------------------------------
def calculate_fuel_stage_timestamps(
    stage: int,
    ref_date: Optional[Union[datetime, date]] = None,
) -> Dict[str, Any]:
    """
    Calculates exact start and end timestamps and dates for Persian (Jalali) biweekly fuel stages:
    
    - Stage 1 (مرحله اول):
      8th day (00:00:00) to 23rd day (00:00:00) of the current Jalali month.
    - Stage 2 (مرحله دوم):
      23rd day (00:00:00) of current Jalali month to 8th day (00:00:00) of the NEXT Jalali month.
      
    Returns a dict with:
      - start_datetime, end_datetime: datetime (Gregorian)
      - start_timestamp, end_timestamp: int (Unix timestamps in seconds)
      - start_iso, end_iso: str
      - start_jalali, end_jalali: str (YYYY/MM/DD 00:00:00)
      - period_label: str (e.g. 'مرحله اول (۸ تا ۲۳ مهر ۱۴۰۵)')
      - stage: int (1 or 2)
      - jalali_year, jalali_month, month_name, next_month_name
    """
    if ref_date is None:
        ref_dt = datetime.now()
    elif isinstance(ref_date, datetime):
        ref_dt = ref_date
    elif isinstance(ref_date, date):
        ref_dt = datetime.combine(ref_date, time(0, 0, 0))
    else:
        ref_dt = datetime.now()

    # Determine Jalali Year, Month, Day
    if HAS_JDATETIME and jdatetime:
        j_now = jdatetime.datetime.fromgregorian(datetime=ref_dt)
        jy = j_now.year
        jm = j_now.month
        jd = j_now.day
    else:
        jy, jm, jd = _gregorian_to_jalali(ref_dt.year, ref_dt.month, ref_dt.day)

    # Next Jalali Month calculation
    if jm == 12:
        next_jy = jy + 1
        next_jm = 1
    else:
        next_jy = jy
        next_jm = jm + 1

    current_month_name = JALALI_MONTH_NAMES[jm] if 1 <= jm <= 12 else f"ماه {jm}"
    next_month_name = JALALI_MONTH_NAMES[next_jm] if 1 <= next_jm <= 12 else f"ماه {next_jm}"

    if stage == 1:
        # Stage 1: 8th day (00:00:00) to 23rd day (00:00:00) of current Jalali month
        if HAS_JDATETIME and jdatetime:
            s_j = jdatetime.datetime(jy, jm, 8, 0, 0, 0)
            e_j = jdatetime.datetime(jy, jm, 23, 0, 0, 0)
            start_dt = s_j.togregorian()
            end_dt = e_j.togregorian()
        else:
            gy_s, gm_s, gd_s = _jalali_to_gregorian(jy, jm, 8)
            gy_e, gm_e, gd_e = _jalali_to_gregorian(jy, jm, 23)
            start_dt = datetime(gy_s, gm_s, gd_s, 0, 0, 0)
            end_dt = datetime(gy_e, gm_e, gd_e, 0, 0, 0)

        period_label = f"مرحله اول (۸ تا ۲۳ {current_month_name} {jy})"
        start_jalali = f"{jy:04d}/{jm:02d}/08 00:00:00"
        end_jalali = f"{jy:04d}/{jm:02d}/23 00:00:00"

    else:
        # Stage 2: 23rd day (00:00:00) of current to 8th day (00:00:00) of next Jalali month
        if HAS_JDATETIME and jdatetime:
            s_j = jdatetime.datetime(jy, jm, 23, 0, 0, 0)
            e_j = jdatetime.datetime(next_jy, next_jm, 8, 0, 0, 0)
            start_dt = s_j.togregorian()
            end_dt = e_j.togregorian()
        else:
            gy_s, gm_s, gd_s = _jalali_to_gregorian(jy, jm, 23)
            gy_e, gm_e, gd_e = _jalali_to_gregorian(next_jy, next_jm, 8)
            start_dt = datetime(gy_s, gm_s, gd_s, 0, 0, 0)
            end_dt = datetime(gy_e, gm_e, gd_e, 0, 0, 0)

        period_label = f"مرحله دوم (۲۳ {current_month_name} تا ۸ {next_month_name} {next_jy})"
        start_jalali = f"{jy:04d}/{jm:02d}/23 00:00:00"
        end_jalali = f"{next_jy:04d}/{next_jm:02d}/08 00:00:00"

    return {
        "stage": stage,
        "period_label": period_label,
        "start_datetime": start_dt,
        "end_datetime": end_dt,
        "start_timestamp": int(start_dt.timestamp()),
        "end_timestamp": int(end_dt.timestamp()),
        "start_iso": start_dt.isoformat(),
        "end_iso": end_dt.isoformat(),
        "start_jalali": start_jalali,
        "end_jalali": end_jalali,
        "jalali_year": jy,
        "jalali_month": jm,
        "current_month_name": current_month_name,
        "next_month_name": next_month_name,
    }


# ---------------------------------------------------------------------------
# Exact 1-Month Jalali Interval Calculator (Subscription Management)
# ---------------------------------------------------------------------------
def get_jalali_month_days(jy: int, jm: int) -> int:
    """
    Returns the exact number of days in Jalali year `jy` and month `jm`:
    - Months 1-6 (Farvardin-Shahrivar): 31 days
    - Months 7-11 (Mehr-Bahman): 30 days
    - Month 12 (Esfand): 29 days (30 days in leap years)
    """
    if 1 <= jm <= 6:
        return 31
    elif 7 <= jm <= 11:
        return 30
    elif jm == 12:
        if HAS_JDATETIME and jdatetime is not None:
            try:
                return 30 if jdatetime.date(jy, 1, 1).isleap() else 29
            except Exception:
                pass
        gy, gm, gd = _jalali_to_gregorian(jy, 12, 30)
        back_y, back_m, back_d = _gregorian_to_jalali(gy, gm, gd)
        return 30 if (back_y == jy and back_m == 12 and back_d == 30) else 29
    return 30


def add_jalali_month(start_date: Optional[Union[datetime, date]] = None) -> date:
    """
    Calculates exact 1-month intervals based on the Persian (Jalali) calendar.
    Uses `jdatetime` when available, with a robust astronomical fallback.

    Edge Cases Handled:
    - 3rd of Farvardin (31 days) -> 3rd of Ordibehesht
    - 31st of Shahrivar -> 30th of Mehr (Mehr has 30 days, clamps to 30)
    - 30th of Bahman -> 29th of Esfand (or 30th in leap years)
    - 29th of Esfand -> 29th of Farvardin
    - 30th of Esfand -> 30th of Farvardin
    """
    if start_date is None:
        base_d = date.today()
    elif isinstance(start_date, datetime):
        base_d = start_date.date()
    else:
        base_d = start_date

    # Try jdatetime if available
    if HAS_JDATETIME and jdatetime is not None:
        try:
            j_now = jdatetime.date.fromgregorian(date=base_d)
            jy, jm, jd = j_now.year, j_now.month, j_now.day
            if jm == 12:
                target_jy = jy + 1
                target_jm = 1
            else:
                target_jy = jy
                target_jm = jm + 1

            max_days = get_jalali_month_days(target_jy, target_jm)
            target_jd = min(jd, max_days)
            return jdatetime.date(target_jy, target_jm, target_jd).togregorian()
        except Exception as exc:
            logger.warning(f"Error using jdatetime in add_jalali_month ({exc}); using fallback.")

    # High-precision fallback algorithm
    jy, jm, jd = _gregorian_to_jalali(base_d.year, base_d.month, base_d.day)
    if jm == 12:
        target_jy = jy + 1
        target_jm = 1
    else:
        target_jy = jy
        target_jm = jm + 1

    max_days = get_jalali_month_days(target_jy, target_jm)
    target_jd = min(jd, max_days)

    t_gy, t_gm, t_gd = _jalali_to_gregorian(target_jy, target_jm, target_jd)
    return date(t_gy, t_gm, t_gd)


def format_jalali_date(d: Optional[Union[datetime, date]]) -> str:
    """Formats a Gregorian date or datetime into Persian string YYYY/MM/DD."""
    if d is None:
        return "نامشخص"
    if isinstance(d, datetime):
        d = d.date()
    if HAS_JDATETIME and jdatetime is not None:
        try:
            return jdatetime.date.fromgregorian(date=d).strftime("%Y/%m/%d")
        except Exception:
            pass
    jy, jm, jd = _gregorian_to_jalali(d.year, d.month, d.day)
    return f"{jy:04d}/{jm:02d}/{jd:02d}"

