import { BusinessRecord, BusinessSettings, UserAccount } from '../types';
import { getTodayStr } from './formatters';
import { detectBrowserLanguage } from './i18n';

const STORAGE_RECORDS_KEY = 'rmt_business_records_v2';
const STORAGE_SETTINGS_KEY = 'rmt_business_settings_v2';
const STORAGE_USER_KEY = 'rmt_business_user_v2';

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: '',
  businessLogo: '',
  showHeaderBrand: true,
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  locationName: '',
  defaultCurrency: 'USD',
  reportingCurrency: 'USD',
  currencyPosition: 'prefix',
  language: 'en',
  privacyMode: false,
  databaseLocation: './data/business-ledger.json',
  contactInfo: '',
  paymentDetails: '',
  invoiceNotes: 'Payment is due within 14 days of issue date. Thank you for your business.',
  invoicePrefix: 'INV-2026-',
  nextInvoiceNumber: 101,
  autoDetectDuplicates: true,
  dateFormat: 'YYYY-MM-DD',
  hideDecimals: false,
  compactView: false,
  defaultPaymentTerms: 'due_on_receipt',
  taxRateDefault: 0,
  fiscalYearStart: 1,
};

export const DEMO_USER: UserAccount = {
  id: 'usr-demo-01',
  name: 'Demo Account',
  isDemo: true,
  storageMode: 'demo',
  databaseLocation: './data/demo-ledger.json',
  databaseName: 'demo-ledger.json',
  createdAt: '2026-01-01T00:00:00Z',
};

export function generateSampleRecords(): BusinessRecord[] {
  const today = getTodayStr();
  const baseDate = new Date(today);

  const dMinus1 = new Date(baseDate);
  dMinus1.setDate(dMinus1.getDate() - 1);
  const dMinus1Str = dMinus1.toISOString().split('T')[0];

  const dMinus3 = new Date(baseDate);
  dMinus3.setDate(dMinus3.getDate() - 3);
  const dMinus3Str = dMinus3.toISOString().split('T')[0];

  const dMinus5 = new Date(baseDate);
  dMinus5.setDate(dMinus5.getDate() - 5);
  const dMinus5Str = dMinus5.toISOString().split('T')[0];

  const dMinus8 = new Date(baseDate);
  dMinus8.setDate(dMinus8.getDate() - 8);
  const dMinus8Str = dMinus8.toISOString().split('T')[0];

  const dPlus2 = new Date(baseDate);
  dPlus2.setDate(dPlus2.getDate() + 2);
  const dPlus2Str = dPlus2.toISOString().split('T')[0];

  const dPlus5 = new Date(baseDate);
  dPlus5.setDate(dPlus5.getDate() + 5);
  const dPlus5Str = dPlus5.toISOString().split('T')[0];

  const dPlus12 = new Date(baseDate);
  dPlus12.setDate(dPlus12.getDate() + 12);
  const dPlus12Str = dPlus12.toISOString().split('T')[0];

  return [
    {
      id: 'rec-001',
      type: 'money_in',
      title: 'Project milestone delivery payment',
      description: 'Phase 2 deliverables accepted and paid by client',
      amount: 4500,
      currency: 'USD',
      direction: 'received',
      date: today,
      time: '11:30',
      clientOrParty: 'Global Horizon Enterprise',
      invoiceNumber: 'INV-2026-101',
      createdAt: `${today}T11:30:00Z`,
      updatedAt: `${today}T11:30:00Z`,
    },
    {
      id: 'rec-002',
      type: 'money_out',
      title: 'Cloud servers & infrastructure hosting',
      description: 'Monthly production cluster and database storage',
      amount: 280,
      currency: 'USD',
      direction: 'paid',
      date: today,
      time: '09:15',
      clientOrParty: 'Cloud Infrastructure Provider',
      createdAt: `${today}T09:15:00Z`,
      updatedAt: `${today}T09:15:00Z`,
    },
    {
      id: 'rec-003',
      type: 'event',
      title: 'Client project review & roadmap sync',
      description: 'Quarterly review of goals, timelines, and next deliverables',
      date: today,
      time: '14:00',
      isCompleted: true,
      createdAt: `${today}T08:00:00Z`,
      updatedAt: `${today}T14:30:00Z`,
    },
    {
      id: 'rec-004',
      type: 'payment',
      title: 'Office supplies & packaging order',
      description: 'Shipping cartons, protective mailers, and label rolls',
      amount: 650,
      currency: 'USD',
      direction: 'due',
      date: today,
      time: '17:00',
      isCompleted: false,
      clientOrParty: 'Packaging & Supply Co',
      createdAt: `${today}T08:45:00Z`,
      updatedAt: `${today}T08:45:00Z`,
    },
    {
      id: 'rec-005',
      type: 'payment',
      title: 'Monthly advisory retainer fee',
      description: 'Invoice #INV-2026-098 due for technical consultation',
      amount: 3200,
      currency: 'USD',
      direction: 'expected',
      date: dMinus3Str,
      isCompleted: false,
      clientOrParty: 'Meridian Capital Partners',
      createdAt: `${dMinus5Str}T09:00:00Z`,
      updatedAt: `${dMinus5Str}T09:00:00Z`,
    },
    {
      id: 'rec-006',
      type: 'money_in',
      title: 'Storefront merchandise weekly sales',
      description: 'Direct POS retail receipts settlement',
      amount: 2400,
      currency: 'USD',
      direction: 'received',
      date: dMinus1Str,
      time: '18:00',
      clientOrParty: 'Storefront Point of Sale',
      createdAt: `${dMinus1Str}T18:00:00Z`,
      updatedAt: `${dMinus1Str}T18:00:00Z`,
    },
    {
      id: 'rec-007',
      type: 'money_out',
      title: 'High-speed studio fiber internet',
      description: 'Monthly business symmetric connection',
      amount: 120,
      currency: 'USD',
      direction: 'paid',
      date: dMinus1Str,
      time: '10:00',
      recurring: {
        frequency: 'monthly',
        dayOfMonth: 20,
      },
      createdAt: `${dMinus1Str}T10:00:00Z`,
      updatedAt: `${dMinus1Str}T10:00:00Z`,
    },
    {
      id: 'rec-008',
      type: 'money_in',
      title: 'Product design consultation sprint',
      description: 'UX and interface advisory sprint completed',
      amount: 1800,
      currency: 'USD',
      direction: 'received',
      date: dMinus5Str,
      time: '15:20',
      clientOrParty: 'Velocity Labs',
      invoiceNumber: 'INV-2026-102',
      createdAt: `${dMinus5Str}T15:20:00Z`,
      updatedAt: `${dMinus5Str}T15:20:00Z`,
    },
    {
      id: 'rec-009',
      type: 'money_out',
      title: 'Online advertising campaigns',
      description: 'Targeted acquisition ads on search channels',
      amount: 850,
      currency: 'USD',
      direction: 'paid',
      date: dMinus8Str,
      clientOrParty: 'Advertising Platform',
      createdAt: `${dMinus8Str}T12:00:00Z`,
      updatedAt: `${dMinus8Str}T12:00:00Z`,
    },
    {
      id: 'rec-010',
      type: 'payment',
      title: 'Commercial general liability coverage',
      description: 'Annual business policy protection premium',
      amount: 1400,
      currency: 'USD',
      direction: 'due',
      date: dPlus2Str,
      time: '10:00',
      clientOrParty: 'Universal Underwriters',
      createdAt: `${today}T08:00:00Z`,
      updatedAt: `${today}T08:00:00Z`,
    },
    {
      id: 'rec-011',
      type: 'payment',
      title: 'Custom software system modernization',
      description: 'Enterprise contract paid in monthly milestones',
      amount: 10000,
      currency: 'USD',
      direction: 'expected',
      date: dPlus5Str,
      clientOrParty: 'Valence Systems Group',
      paymentPlan: {
        totalAmount: 10000,
        installmentAmount: 3000,
        frequency: 'monthly',
        firstDueDate: dPlus5Str,
        paidAmount: 3000,
      },
      createdAt: `${today}T08:00:00Z`,
      updatedAt: `${today}T08:00:00Z`,
    },
    {
      id: 'rec-012',
      type: 'event',
      title: 'Quarterly milestone presentation',
      description: 'Review final deliverable acceptance with stakeholders',
      date: dPlus12Str,
      time: '16:00',
      isCompleted: false,
      createdAt: `${today}T08:00:00Z`,
      updatedAt: `${today}T08:00:00Z`,
    },
  ];
}

const RMT_CHANGE_EVENT = 'rmt_data_changed_v2';

function notifyDataChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RMT_CHANGE_EVENT));
  }
}

export function subscribeToDataChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(RMT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(RMT_CHANGE_EVENT, callback);
  };
}

// In-memory cache to eliminate repetitive synchronous localStorage and JSON.parse overhead
let inMemoryRecords: BusinessRecord[] | null = null;
let inMemorySettings: BusinessSettings | null = null;
let inMemoryUser: UserAccount | null | undefined = undefined;

export function getStoredRecords(): BusinessRecord[] {
  if (inMemoryRecords !== null) return inMemoryRecords;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_RECORDS_KEY);
    if (!raw) {
      inMemoryRecords = [];
      return [];
    }
    inMemoryRecords = JSON.parse(raw);
    return inMemoryRecords || [];
  } catch (e) {
    console.error('Failed to read records from storage', e);
    return [];
  }
}

export function saveRecords(records: BusinessRecord[]): void {
  inMemoryRecords = records;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(records));
    notifyDataChange();
  } catch (e) {
    console.error('Failed to save records', e);
  }

  // Non-blocking sync with backend
  fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  }).catch(() => {});
}

export function addRecord(recordData: Omit<BusinessRecord, 'id' | 'createdAt' | 'updatedAt'>): BusinessRecord {
  const records = getStoredRecords();
  const now = new Date().toISOString();
  const newRecord: BusinessRecord = {
    ...recordData,
    currency: recordData.currency || 'USD',
    images: recordData.images || [],
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  const updated = [newRecord, ...records];
  saveRecords(updated);
  return newRecord;
}

export function updateRecord(id: string, patch: Partial<BusinessRecord>): BusinessRecord | null {
  const records = getStoredRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const updatedRecord = {
    ...records[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = [...records];
  nextRecords[index] = updatedRecord;
  saveRecords(nextRecords);
  return updatedRecord;
}

export function deleteRecord(id: string): boolean {
  const records = getStoredRecords();
  const filtered = records.filter((r) => r.id !== id);
  if (filtered.length === records.length) return false;
  saveRecords(filtered);
  return true;
}

export function getStoredSettings(): BusinessSettings {
  if (inMemorySettings) return inMemorySettings;
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) {
      inMemorySettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
    const merged: BusinessSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    inMemorySettings = merged;
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<BusinessSettings>): BusinessSettings {
  const current = getStoredSettings();
  const updated: BusinessSettings = { ...current, ...settings };
  inMemorySettings = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      notifyDataChange();
    } catch (e) {
      console.error('Failed to save settings', e);
    }

    // Non-blocking sync with backend
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }
  return updated;
}

export function getStoredUser(): UserAccount | null {
  if (inMemoryUser !== undefined) return inMemoryUser ?? null;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) {
      inMemoryUser = null;
      return null;
    }
    const parsed: UserAccount = JSON.parse(raw);
    inMemoryUser = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function saveUser(user: UserAccount | null): void {
  inMemoryUser = user;
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
  notifyDataChange();
}

export function createLocalAccount(
  name: string,
  currency: string,
  _language: string = 'en',
  databaseLocation?: string,
  databaseName?: string
): UserAccount {
  const trimmed = name.trim();
  const dbFile = databaseName?.trim() || 'business-ledger.json';
  const dbLoc = databaseLocation?.trim() || `./data/${dbFile}`;
  const user: UserAccount = {
    id: `usr-${Date.now()}`,
    name: trimmed || 'Operator',
    isDemo: false,
    storageMode: 'local',
    databaseLocation: dbLoc,
    databaseName: dbFile,
    createdAt: new Date().toISOString(),
  };
  saveUser(user);
  saveSettings({
    businessName: trimmed,
    defaultCurrency: currency,
    reportingCurrency: currency,
    language: 'en',
    databaseLocation: dbLoc,
  });
  // Local laptop DB starts clean
  saveRecords([]);
  return user;
}

export function createDemoAccount(
  name: string,
  currency: string,
  _language: string = 'en',
  databaseLocation?: string,
  databaseName?: string
): UserAccount {
  const dbFile = databaseName?.trim() || 'demo-ledger.json';
  const dbLoc = databaseLocation?.trim() || `./data/${dbFile}`;
  const user: UserAccount = {
    id: `usr-demo-${Date.now()}`,
    name: name.trim() || 'Demo Account',
    isDemo: true,
    storageMode: 'demo',
    databaseLocation: dbLoc,
    databaseName: dbFile,
    createdAt: new Date().toISOString(),
  };
  saveUser(user);
  saveSettings({
    businessName: user.name,
    defaultCurrency: currency,
    reportingCurrency: currency,
    language: 'en',
    databaseLocation: dbLoc,
  });
  saveRecords(generateSampleRecords());
  return user;
}

export function signOutUser(): void {
  saveUser(null);
}

export function findPotentialDuplicate(candidate: {
  amount?: number;
  title: string;
  date: string;
  currency?: string;
  excludeId?: string;
}): BusinessRecord | null {
  if (!candidate.amount || candidate.amount <= 0) return null;

  const records = getStoredRecords();
  const cTitle = candidate.title.trim().toLowerCase();
  const cDate = new Date(candidate.date).getTime();

  return (
    records.find((r) => {
      if (candidate.excludeId && r.id === candidate.excludeId) return false;
      if (r.amount !== candidate.amount) return false;

      const rDate = new Date(r.date).getTime();
      const diffDays = Math.abs(cDate - rDate) / (1000 * 60 * 60 * 24);
      if (diffDays > 2) return false;

      const rTitle = (r.title || '').trim().toLowerCase();
      if (rTitle === cTitle) return true;
      if (cTitle.includes(rTitle) || rTitle.includes(cTitle)) return true;

      return false;
    }) || null
  );
}

export function getNextInvoiceNumber(): string {
  const settings = getStoredSettings();
  const num = settings.nextInvoiceNumber || 101;
  const prefix = settings.invoicePrefix || 'INV-2026-';
  saveSettings({ nextInvoiceNumber: num + 1 });
  return `${prefix}${num}`;
}

export function exportRecordsToCSV(recordsToExport?: BusinessRecord[], customFilename?: string): void {
  const records = Array.isArray(recordsToExport) ? recordsToExport : getStoredRecords();
  const headers = [
    'ID',
    'Date',
    'Time',
    'Type',
    'Title',
    'Description',
    'Amount',
    'Currency',
    'Converted Amount',
    'Direction',
    'Status',
    'Client/Party',
    'Invoice Number',
    'Has Pictures',
    'Created At'
  ];
  const rows = records.map((r) => [
    `"${r.id}"`,
    r.date,
    r.time || '',
    r.type,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.description || '').replace(/"/g, '""')}"`,
    r.amount !== undefined ? r.amount : '',
    r.currency || 'USD',
    r.convertedAmount !== undefined ? r.convertedAmount : '',
    r.direction || '',
    r.isCompleted ? 'Completed' : 'Pending',
    `"${(r.clientOrParty || '').replace(/"/g, '""')}"`,
    `"${(r.invoiceNumber || '').replace(/"/g, '""')}"`,
    r.images && r.images.length > 0 ? `Yes (${r.images.length})` : 'No',
    r.createdAt || '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `records-export-${getTodayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAllDataJSON(): void {
  const data = {
    exportedAt: new Date().toISOString(),
    user: getStoredUser(),
    settings: getStoredSettings(),
    records: getStoredRecords(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `records-backup-${getTodayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDataJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.records)) {
      saveRecords(parsed.records);
      if (parsed.settings) {
        saveSettings(parsed.settings);
      }
      if (parsed.user) {
        saveUser(parsed.user);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Invalid JSON import', e);
    return false;
  }
}

export { importRecordsFromCSV, parseAndValidateCSV } from './csv';

export function resetToSampleData(): void {
  const samples = generateSampleRecords();
  saveRecords(samples);
  saveSettings(DEFAULT_SETTINGS);
  saveUser(DEMO_USER);
  if (typeof window !== 'undefined') {
    fetch('/api/reset', { method: 'POST' }).catch(() => {});
  }
}

export async function initStorageSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/records');
    if (res.ok) {
      const serverRecords = await res.json();
      if (Array.isArray(serverRecords) && serverRecords.length > 0) {
        const local = getStoredRecords();
        if (local.length === 0) {
          inMemoryRecords = serverRecords;
          try {
            localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(serverRecords));
          } catch {}
          notifyDataChange();
        }
      }
    }
  } catch {}

  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const serverSettings = await res.json();
      if (serverSettings && typeof serverSettings === 'object' && serverSettings.businessName) {
        const local = getStoredSettings();
        if (!local.businessName) {
          const merged = { ...local, ...serverSettings };
          inMemorySettings = merged;
          try {
            localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
          } catch {}
          notifyDataChange();
        }
      }
    }
  } catch {}
}
