import { Invoice, PaymentRecord } from '../types';

/**
 * Get the Monday 00:00:00.000 of the week for a given Date
 */
export function getMondayOfWeek(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the Sunday 23:59:59.999 of the week for a given Date
 */
export function getSundayOfWeek(date: Date | string): Date {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Format Date to standard YYYY-MM-DD
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate ISO Week number and Year
 */
export function getISOWeekInfo(date: Date): { week: number; year: number } {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { week: weekNumber, year: target.getFullYear() };
}

/**
 * Formats a clean human-readable date string (e.g. "17 Aug 2026")
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Weekly Record Bucket for historical selector
 */
export interface WeeklyBucket {
  id: string; // e.g. "2026-08-17" (Monday ISO)
  weekNumber: number;
  year: number;
  startMonday: Date;
  endSunday: Date;
  startDateStr: string; // "2026-08-17"
  endDateStr: string; // "2026-08-23"
  label: string; // "Week 34 (Mon 17 Aug – Sun 23 Aug 2026)"
  shortLabel: string; // "Week 34 (17-23 Aug 2026)"
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  invoiceCount: number;
  totalInvoiced: number;
  totalCollected: number;
}

/**
 * Generates an exhaustive list of all historical weeks with actual invoice activity,
 * merged with a continuous window of recent and upcoming weeks.
 */
export function getHistoricalWeeksArchive(
  invoices: Invoice[],
  payments: PaymentRecord[] = [],
  recentWeeksLookback = 26
): WeeklyBucket[] {
  const now = new Date();
  const currentMonday = getMondayOfWeek(now);
  const currentMondayStr = toISODateString(currentMonday);

  // Set of all unique Monday dates from actual invoice dates and payment dates
  const mondayDatesSet = new Set<string>();

  // Add the last `recentWeeksLookback` weeks up to next week (+1)
  for (let i = -recentWeeksLookback; i <= 1; i++) {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + (i * 7));
    mondayDatesSet.add(toISODateString(getMondayOfWeek(d)));
  }

  // Scan all invoices in database to ensure every single historical invoice week is present!
  invoices.forEach(inv => {
    if (inv.issueDate) {
      const invMon = getMondayOfWeek(new Date(inv.issueDate));
      mondayDatesSet.add(toISODateString(invMon));
    }
  });

  // Scan payments
  payments.forEach(pay => {
    if (pay.paymentDate) {
      const payMon = getMondayOfWeek(new Date(pay.paymentDate));
      mondayDatesSet.add(toISODateString(payMon));
    }
  });

  // Convert to sorted array of buckets (newest week first)
  const mondayStrings = Array.from(mondayDatesSet).sort((a, b) => b.localeCompare(a));

  return mondayStrings.map(monStr => {
    const parts = monStr.split('-').map(Number);
    const startMonday = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    const endSunday = new Date(startMonday);
    endSunday.setDate(startMonday.getDate() + 6);
    endSunday.setHours(23, 59, 59, 999);

    const startDateStr = monStr;
    const endDateStr = toISODateString(endSunday);
    const weekInfo = getISOWeekInfo(startMonday);

    const isCurrentWeek = monStr === currentMondayStr;
    const isPastWeek = startMonday < currentMonday;

    // Filter matching invoices in this specific week
    const weekInvoices = invoices.filter(inv => {
      return inv.issueDate >= startDateStr && inv.issueDate <= endDateStr;
    });

    const totalInvoiced = weekInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCollected = weekInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

    const label = `Week ${weekInfo.week} (${formatShortDate(startMonday)} – ${formatShortDate(endSunday)})`;
    const shortLabel = `Week ${weekInfo.week} (${startMonday.getDate()} ${startMonday.toLocaleDateString('en-GB', { month: 'short' })} – ${endSunday.getDate()} ${endSunday.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`;

    return {
      id: monStr,
      weekNumber: weekInfo.week,
      year: weekInfo.year,
      startMonday,
      endSunday,
      startDateStr,
      endDateStr,
      label,
      shortLabel,
      isCurrentWeek,
      isPastWeek,
      invoiceCount: weekInvoices.length,
      totalInvoiced,
      totalCollected
    };
  });
}
