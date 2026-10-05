import { BusinessSettings, PaymentPlan, BusinessRecord, TimeItem } from '../types';
import { formatCurrency } from './currency';
import { getStoredSettings } from './storage';

export function formatMoney(
  amount: number | undefined, 
  currency: string = 'USD', 
  showSign: boolean | 'plus' | 'minus' = false,
  settingsOverride?: Partial<BusinessSettings>
): string {
  const settings = settingsOverride || getStoredSettings();
  const signOption = typeof showSign === 'string' ? showSign : undefined;
  const booleanShowSign = typeof showSign === 'boolean' ? showSign : false;

  return formatCurrency(amount, currency, { 
    showSign: booleanShowSign,
    sign: signOption,
    hideDecimals: settings?.hideDecimals,
    position: settings?.currencyPosition,
  });
}

export function parseDate(dateStr: string): Date {
  // Safe date parse avoiding timezone offset shifts on YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDisplayDate(dateStr: string, options?: { includeYear?: boolean; short?: boolean }): string {
  try {
    const settings = getStoredSettings();
    const date = parseDate(dateStr);
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const month = options?.short ? SHORT_MONTHS[monthIndex] : FULL_MONTHS[monthIndex];
    const year = date.getFullYear();

    if (settings.dateFormat === 'MM/DD/YYYY') {
      if (options?.includeYear ?? true) {
        return `${month} ${day}, ${year}`;
      }
      return `${month} ${day}`;
    }

    if (settings.dateFormat === 'YYYY-MM-DD') {
      const padM = String(monthIndex + 1).padStart(2, '0');
      const padD = String(day).padStart(2, '0');
      if (options?.includeYear ?? true) {
        return `${year}-${padM}-${padD}`;
      }
      return `${padM}-${padD}`;
    }

    // Default DD/MM/YYYY or European / UK layout: e.g. "21 Sep 2026"
    if (options?.includeYear ?? true) {
      return `${day} ${month} ${year}`;
    }
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
}

export function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDateToday(dateStr: string): boolean {
  return dateStr === getTodayStr();
}

export function isDateYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

export function isDateTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

export function getDateGroupHeader(dateStr: string): string {
  if (isDateToday(dateStr)) return 'TODAY';
  if (isDateYesterday(dateStr)) return 'YESTERDAY';
  if (isDateTomorrow(dateStr)) return 'TOMORROW';

  const date = parseDate(dateStr);
  const day = date.getDate();
  const month = (SHORT_MONTHS[date.getMonth()] || '').toUpperCase();
  const currentYear = new Date().getFullYear();
  if (date.getFullYear() === currentYear) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${date.getFullYear()}`;
}

export interface PaymentPlanSummary {
  totalAmount: number;
  installmentAmount: number;
  fullInstallmentsCount: number;
  finalPaymentAmount: number;
  totalInstallmentsCount: number;
  paidAmount: number;
  remainingBalance: number;
  isFullyPaid: boolean;
  installments: Array<{
    number: number;
    amount: number;
    dueDate: string;
    isPaid: boolean;
  }>;
}

export function calculatePaymentPlan(plan: PaymentPlan): PaymentPlanSummary {
  const total = plan.totalAmount || 0;
  const installment = plan.installmentAmount > 0 ? plan.installmentAmount : total;
  const paid = plan.paidAmount || 0;
  const remaining = Math.max(0, total - paid);

  const fullCount = Math.floor(total / installment);
  const remainder = total % installment;
  const totalCount = remainder > 0 ? fullCount + 1 : fullCount;
  const finalAmount = remainder > 0 ? remainder : installment;

  const installments: Array<{ number: number; amount: number; dueDate: string; isPaid: boolean }> = [];
  let cumulativePaid = paid;

  for (let i = 0; i < totalCount; i++) {
    const isFinal = i === totalCount - 1;
    const amount = isFinal && remainder > 0 ? remainder : installment;

    // Calculate due date based on frequency
    const baseDate = parseDate(plan.firstDueDate);
    if (plan.frequency === 'weekly') {
      baseDate.setDate(baseDate.getDate() + i * 7);
    } else {
      // Monthly
      baseDate.setMonth(baseDate.getMonth() + i);
    }

    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const d = String(baseDate.getDate()).padStart(2, '0');
    const dueDateStr = `${y}-${m}-${d}`;

    const isInstallmentPaid = cumulativePaid >= amount;
    if (isInstallmentPaid) {
      cumulativePaid -= amount;
    }

    installments.push({
      number: i + 1,
      amount,
      dueDate: dueDateStr,
      isPaid: isInstallmentPaid,
    });
  }

  return {
    totalAmount: total,
    installmentAmount: installment,
    fullInstallmentsCount: fullCount,
    finalPaymentAmount: finalAmount,
    totalInstallmentsCount: totalCount,
    paidAmount: paid,
    remainingBalance: remaining,
    isFullyPaid: remaining <= 0,
    installments,
  };
}

export function deriveTimeItemsFromRecord(record: BusinessRecord): TimeItem[] {
  const items: TimeItem[] = [];
  const today = getTodayStr();

  // If record has an explicit event or task or reminder
  if (record.type === 'event' || record.type === 'note') {
    if (record.date) {
      const isOverdue = !record.isCompleted && record.date < today;
      const isToday = record.date === today;
      items.push({
        id: `${record.id}-event`,
        recordId: record.id,
        title: record.title,
        type: record.type === 'event' ? 'appointment' : 'task',
        date: record.date,
        time: record.time,
        amount: record.amount,
        currency: record.currency || 'USD',
        isCompleted: !!record.isCompleted,
        isOverdue,
        isToday,
        sourceRecord: record,
      });
    }
  }

  // If record is a payment (due or expected)
  if (record.type === 'payment' && record.date) {
    if (record.paymentPlan) {
      const planSummary = calculatePaymentPlan(record.paymentPlan);
      planSummary.installments.forEach((inst) => {
        const isOverdue = !inst.isPaid && inst.dueDate < today;
        const isToday = inst.dueDate === today;
        items.push({
          id: `${record.id}-plan-${inst.number}`,
          recordId: record.id,
          title: `${record.title} (Payment ${inst.number}/${planSummary.totalInstallmentsCount})`,
          type: 'scheduled_payment',
          date: inst.dueDate,
          amount: inst.amount,
          currency: record.currency || 'USD',
          isCompleted: inst.isPaid,
          isOverdue,
          isToday,
          direction: record.direction,
          sourceRecord: record,
        });
      });
    } else {
      const isOverdue = !record.isCompleted && record.date < today && record.direction !== 'received' && record.direction !== 'paid';
      const isToday = record.date === today;
      items.push({
        id: `${record.id}-payment`,
        recordId: record.id,
        title: record.direction === 'due' ? `Bill: ${record.title}` : `Expected: ${record.title}`,
        type: record.direction === 'due' ? 'bill' : 'scheduled_payment',
        date: record.date,
        time: record.time,
        amount: record.amount,
        currency: record.currency || 'USD',
        isCompleted: !!record.isCompleted || record.direction === 'received' || record.direction === 'paid',
        isOverdue,
        isToday,
        direction: record.direction,
        sourceRecord: record,
      });
    }
  }

  // If record has recurring rule (e.g. Internet KSh 4000 every 25th)
  if (record.recurring && record.recurring.frequency !== 'none') {
    // Generate next 3 future occurrences for calendar projection
    const currentDate = parseDate(record.date);
    const occurrencesCount = 3;

    for (let i = 0; i < occurrencesCount; i++) {
      const nextDate = new Date(currentDate);
      if (record.recurring.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + i);
        if (record.recurring.dayOfMonth) {
          nextDate.setDate(record.recurring.dayOfMonth);
        }
      } else if (record.recurring.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + i * 7);
      } else if (record.recurring.frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + i);
      }

      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      const nextDateStr = `${y}-${m}-${d}`;

      const isOverdue = !record.isCompleted && nextDateStr < today;
      const isToday = nextDateStr === today;

      items.push({
        id: `${record.id}-recurring-${i}`,
        recordId: record.id,
        title: `${record.title} (Recurring)`,
        type: record.direction === 'due' ? 'bill' : 'scheduled_payment',
        date: nextDateStr,
        amount: record.amount,
        currency: record.currency || 'USD',
        isCompleted: nextDateStr < today,
        isOverdue,
        isToday,
        direction: record.direction,
        sourceRecord: record,
      });
    }
  }

  return items;
}
