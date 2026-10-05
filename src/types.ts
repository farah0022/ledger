export type RecordType = 'money_in' | 'money_out' | 'payment' | 'note' | 'event';

export type PaymentDirection = 'expected' | 'due' | 'received' | 'paid';

export interface PaymentPlan {
  totalAmount: number;
  installmentAmount: number;
  frequency: 'monthly' | 'weekly' | 'custom';
  firstDueDate: string; // ISO date string YYYY-MM-DD
  paidAmount?: number;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';

export interface RecurringRule {
  frequency: RecurringFrequency;
  dayOfMonth?: number; // e.g. 25 for "every 25th"
  interval?: number;
}

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'ar' | 'sw' | 'pt' | 'ja' | 'hi' | 'tr';

export interface BusinessRecord {
  id: string;
  type: RecordType;
  title: string;
  description?: string;
  amount?: number; // Numeric amount in originalCurrency
  currency?: string; // ISO 4217 code, e.g. "USD", "KES", "EUR"
  convertedAmount?: number; // Converted to reporting currency
  exchangeRateUsed?: number; // Exchange rate applied (original -> reporting)
  direction?: PaymentDirection; // for payment: expected (we receive), due (we owe), received, paid
  date: string; // ISO date YYYY-MM-DD
  time?: string; // HH:mm
  images?: string[]; // Base64 data URLs or picture attachments
  paymentPlan?: PaymentPlan;
  recurring?: RecurringRule;
  reminderDaysBefore?: number; // e.g., 0 for today, 1 for tomorrow, 3 for 3 days before
  isCompleted?: boolean;
  clientOrParty?: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyRateInfo {
  base: string; // e.g. "USD"
  rates: Record<string, number>;
  lastUpdated: string; // ISO string
  source: string;
  isStale?: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email?: string;
  isDemo: boolean;
  storageMode: 'local' | 'demo';
  databaseLocation?: string;
  databaseName?: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  businessLogo?: string; // Optional Base64 data URL / image
  showHeaderBrand?: boolean; // Show logo/name on header
  timezone?: string; // e.g. "Europe/London", "America/New_York"
  locationName?: string; // Detected or custom location name
  defaultCurrency: string; // ISO 4217, default "USD"
  reportingCurrency: string; // ISO 4217, default "USD"
  currency?: string; // Compatibility alias for defaultCurrency
  currencyPosition: 'prefix' | 'suffix';
  language?: string; // Pure English default
  privacyMode?: boolean; // When true, blurs cash & balance numbers on dashboard
  databaseLocation?: string; // e.g. "./data/business-ledger.json"
  contactInfo: string;
  paymentDetails: string;
  invoiceNotes: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  autoDetectDuplicates: boolean;

  // Advanced & Tangible Business Settings
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  hideDecimals: boolean; // Round to whole currency units
  compactView: boolean; // Dense table rows for fast workflow
  defaultPaymentTerms: 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60';
  taxRateDefault: number; // Default VAT / Sales Tax % (0-100)
  fiscalYearStart: number; // 1 = January, 4 = April, 7 = July, 10 = October
}

export type TimeFilterRange = '7d' | '30d' | '90d' | 'this_year' | 'last_year' | 'custom';

export interface TimeItem {
  id: string;
  recordId: string;
  title: string;
  type: 'reminder' | 'deadline' | 'scheduled_payment' | 'bill' | 'task' | 'appointment';
  date: string; // YYYY-MM-DD
  time?: string;
  amount?: number;
  currency?: string;
  isCompleted: boolean;
  isOverdue: boolean;
  isToday: boolean;
  direction?: PaymentDirection;
  sourceRecord: BusinessRecord;
}

