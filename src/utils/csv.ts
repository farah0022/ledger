import { BusinessRecord, RecordType, PaymentDirection } from '../types';
import { SUPPORTED_CURRENCIES } from './currency';
import { getTodayStr } from './formatters';
import { getStoredRecords, saveRecords } from './storage';

export interface CSVRowError {
  rowNumber: number; // 1-based index (including header as row 1)
  field: string;
  message: string;
  rawValue?: string;
}

export interface CSVValidationResult {
  totalRows: number;
  validRecords: BusinessRecord[];
  errors: CSVRowError[];
  headers: string[];
  hasCurrencyErrors: boolean;
}

// Map common currency symbols and aliases to standard ISO 4217 3-letter codes
const SYMBOL_TO_ISO: Record<string, string> = {
  '$': 'USD',
  'US$': 'USD',
  'USD$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  'KSH': 'KES',
  'KSHS': 'KES',
  'KSH.': 'KES',
  'KSHS.': 'KES',
  'KSH/': 'KES',
  'CA$': 'CAD',
  'C$': 'CAD',
  'AU$': 'AUD',
  'A$': 'AUD',
  '₹': 'INR',
  'RS': 'INR',
  'RS.': 'INR',
  '₦': 'NGN',
  'R$': 'BRL',
  '₺': 'TRY',
  'R': 'ZAR',
  'CHF': 'CHF',
  'AED': 'AED',
  'DHS': 'AED',
  'SAR': 'SAR',
  'SR': 'SAR',
  'SG$': 'SGD',
  'S$': 'SGD',
  'USH': 'UGX',
  'TSH': 'TZS',
};

// Known ISO currency codes from supported list
const SUPPORTED_CODES = new Set(SUPPORTED_CURRENCIES.map((c) => c.code.toUpperCase()));

/**
 * Validates currency string.
 * Must be a 3-letter ISO-4217 alphabetic code or recognized currency symbol.
 */
export function validateCurrencyFormat(raw: string | undefined | null): {
  isValid: boolean;
  normalized?: string;
  error?: string;
} {
  if (!raw || typeof raw !== 'string') {
    return { isValid: false, error: 'Currency is empty' };
  }

  const cleaned = raw.trim();
  if (!cleaned) {
    return { isValid: false, error: 'Currency is empty' };
  }

  // Check if it's a known symbol or alias
  const upper = cleaned.toUpperCase();
  if (SYMBOL_TO_ISO[upper] || SYMBOL_TO_ISO[cleaned]) {
    return { isValid: true, normalized: SYMBOL_TO_ISO[upper] || SYMBOL_TO_ISO[cleaned] };
  }

  // Standard ISO 4217 validation: 3 alphabetic letters
  const isThreeLetters = /^[A-Za-z]{3}$/.test(cleaned);
  if (!isThreeLetters) {
    return {
      isValid: false,
      error: `Invalid currency format "${cleaned}". Currency must be a 3-letter ISO code (e.g. USD, EUR, KES) or recognized symbol.`,
    };
  }

  return { isValid: true, normalized: upper };
}

/**
 * Robust RFC 4180 CSV tokenizer.
 * Handles commas, semicolons, tabs, multiline quoted fields, escaped quotes ("").
 */
export function parseCSVToGrid(csvText: string): string[][] {
  if (!csvText) return [];

  // Remove UTF-8 BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, '');

  // Detect delimiter: check first line for comma vs semicolon vs tab
  const firstLineEnd = cleanText.search(/[\r\n]/);
  const firstLine = firstLineEnd !== -1 ? cleanText.substring(0, firstLineEnd) : cleanText;
  
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // skip \n
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push remainder
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  // Filter out completely blank lines
  return rows.filter((row) => row.some((cell) => cell.length > 0));
}

/**
 * Normalize and parse numeric amount from text.
 * Strips commas, spaces, currency symbols, and preserves negative signs.
 */
function parseNumericAmount(val: string | undefined): { value?: number; currencyFromSymbol?: string } {
  if (!val || typeof val !== 'string') return {};
  const trimmed = val.trim();
  if (!trimmed) return {};

  let currencyFromSymbol: string | undefined;

  // Check if starts or ends with currency symbol
  for (const [symbol, code] of Object.entries(SYMBOL_TO_ISO)) {
    if (trimmed.startsWith(symbol) || trimmed.endsWith(symbol)) {
      currencyFromSymbol = code;
      break;
    }
  }

  // Strip all non-numeric characters except digits, minus sign, and period
  // Also handle European format like 1.250,50
  let cleaned = trimmed.replace(/[^0-9.,-]/g, '');

  // If contains both '.' and ',', check which is decimal separator
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // European format: 1.250,50 -> 1250.50
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard format: 1,250.50 -> 1250.50
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // If only comma, check if it's decimal (e.g. 50,25) or thousands (1,000)
    const commaIndex = cleaned.indexOf(',');
    if (cleaned.length - commaIndex === 3 && !cleaned.includes('.')) {
      // Likely decimal like 50,50
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(',', '');
    }
  }

  const num = parseFloat(cleaned);
  return {
    value: isNaN(num) ? undefined : Math.round(num * 100) / 100,
    currencyFromSymbol,
  };
}

/**
 * Normalizes date string into YYYY-MM-DD.
 */
function normalizeDate(val: string | undefined): string {
  if (!val || typeof val !== 'string') return getTodayStr();
  const trimmed = val.trim();
  if (!trimmed) return getTodayStr();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // ISO timestamp: 2026-03-01T12:00:00Z
  if (trimmed.includes('T')) {
    const parts = trimmed.split('T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
      return parts[0];
    }
  }

  // MM/DD/YYYY or DD/MM/YYYY or YYYY/MM/DD
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // Could be MM/DD/YYYY or DD/MM/YYYY
        const num1 = parseInt(parts[0], 10);
        const num2 = parseInt(parts[1], 10);
        if (num1 > 12 && num2 <= 12) {
          // DD/MM/YYYY
          return `${parts[2]}-${String(num2).padStart(2, '0')}-${String(num1).padStart(2, '0')}`;
        }
        // Default MM/DD/YYYY
        return `${parts[2]}-${String(num1).padStart(2, '0')}-${String(num2).padStart(2, '0')}`;
      }
    }
  }

  // Try Date constructor
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return getTodayStr();
}

/**
 * Parse time string into HH:mm
 */
function normalizeTime(val: string | undefined): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;

  // HH:mm or HH:mm:ss
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = match[2];
    const ampm = match[3]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${mins}`;
  }

  return undefined;
}

/**
 * Maps raw type string to RecordType
 */
function mapRecordType(rawType: string | undefined, direction?: PaymentDirection, amount?: number): RecordType {
  if (!rawType) {
    if (direction === 'received') return 'money_in';
    if (direction === 'paid') return 'money_out';
    if (direction === 'expected' || direction === 'due') return 'payment';
    if (amount !== undefined && amount > 0) return 'payment';
    return 'note';
  }

  const t = rawType.toLowerCase().trim();
  if (['money_in', 'moneyin', 'income', 'credit', 'revenue', 'deposit', 'received'].includes(t)) {
    return 'money_in';
  }
  if (['money_out', 'moneyout', 'expense', 'debit', 'cost', 'spend', 'paid'].includes(t)) {
    return 'money_out';
  }
  if (['payment', 'bill', 'invoice', 'payable', 'receivable'].includes(t)) {
    return 'payment';
  }
  if (['event', 'meeting', 'appointment', 'calendar'].includes(t)) {
    return 'event';
  }
  if (['note', 'memo', 'task', 'log'].includes(t)) {
    return 'note';
  }

  return 'payment';
}

/**
 * Maps direction string to PaymentDirection
 */
function mapPaymentDirection(
  rawDir: string | undefined,
  type?: RecordType,
  status?: string
): PaymentDirection | undefined {
  if (rawDir) {
    const d = rawDir.toLowerCase().trim();
    if (['received', 'in', 'credit', 'collected', 'income'].includes(d)) return 'received';
    if (['paid', 'out', 'debit', 'spent', 'settled', 'expense'].includes(d)) return 'paid';
    if (['expected', 'receivable', 'to receive', 'incoming'].includes(d)) return 'expected';
    if (['due', 'payable', 'to pay', 'owed', 'outgoing', 'bill'].includes(d)) return 'due';
  }

  // Infer from type
  if (type === 'money_in') return 'received';
  if (type === 'money_out') return 'paid';
  if (type === 'payment') {
    if (status && ['completed', 'paid', 'yes', 'true'].includes(status.toLowerCase().trim())) {
      return 'received';
    }
    return 'expected';
  }

  return undefined;
}

/**
 * Parses and maps CSV data to BusinessRecord array, validating currency formats.
 */
export function parseAndValidateCSV(
  csvText: string,
  options?: { defaultCurrency?: string }
): CSVValidationResult {
  const fallbackCurrency = (options?.defaultCurrency || 'USD').toUpperCase();
  const grid = parseCSVToGrid(csvText);

  if (grid.length === 0) {
    return {
      totalRows: 0,
      validRecords: [],
      errors: [{ rowNumber: 1, field: 'file', message: 'CSV file is empty.' }],
      headers: [],
      hasCurrencyErrors: false,
    };
  }

  const headerRow = grid[0];
  const normalizedHeaders = headerRow.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

  // Find column indices
  const getColIndex = (aliases: string[]): number => {
    return normalizedHeaders.findIndex((h) =>
      aliases.some((alias) => h === alias || h.includes(alias))
    );
  };

  const idCol = getColIndex(['id', 'recordid']);
  const dateCol = getColIndex(['date', 'transactiondate', 'entrydate']);
  const timeCol = getColIndex(['time', 'recordtime']);
  const typeCol = getColIndex(['type', 'recordtype', 'category', 'transactiontype']);
  const titleCol = getColIndex(['title', 'name', 'memo', 'subject', 'item']);
  const descCol = getColIndex(['description', 'notes', 'desc', 'details']);
  const amountCol = getColIndex(['amount', 'total', 'value', 'price', 'sum']);
  const currencyCol = getColIndex(['currency', 'curr', 'iso', 'currencycode']);
  const convertedAmountCol = getColIndex(['convertedamount', 'converted']);
  const dirCol = getColIndex(['direction', 'paymentdirection', 'flow']);
  const statusCol = getColIndex(['status', 'completed', 'iscompleted']);
  const clientCol = getColIndex(['clientparty', 'client', 'party', 'vendor', 'customer', 'payer', 'payee']);
  const invoiceCol = getColIndex(['invoicenumber', 'invoice', 'invoiceno', 'invoicenum']);
  const createdAtCol = getColIndex(['createdat', 'created']);

  const validRecords: BusinessRecord[] = [];
  const errors: CSVRowError[] = [];
  let hasCurrencyErrors = false;

  const dataRows = grid.slice(1);

  dataRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // 1-based, row 1 is header

    // Skip empty row
    if (row.length === 0 || row.every((c) => c.trim().length === 0)) {
      return;
    }

    const rawId = idCol !== -1 ? row[idCol] : '';
    const rawDate = dateCol !== -1 ? row[dateCol] : '';
    const rawTime = timeCol !== -1 ? row[timeCol] : '';
    const rawType = typeCol !== -1 ? row[typeCol] : '';
    const rawTitle = titleCol !== -1 ? row[titleCol] : '';
    const rawDesc = descCol !== -1 ? row[descCol] : '';
    const rawAmount = amountCol !== -1 ? row[amountCol] : '';
    const rawCurrency = currencyCol !== -1 ? row[currencyCol] : '';
    const rawConverted = convertedAmountCol !== -1 ? row[convertedAmountCol] : '';
    const rawDir = dirCol !== -1 ? row[dirCol] : '';
    const rawStatus = statusCol !== -1 ? row[statusCol] : '';
    const rawClient = clientCol !== -1 ? row[clientCol] : '';
    const rawInvoice = invoiceCol !== -1 ? row[invoiceCol] : '';
    const rawCreatedAt = createdAtCol !== -1 ? row[createdAtCol] : '';

    // Title validation
    let title = rawTitle.trim();
    if (!title) {
      if (rawClient.trim()) {
        title = rawClient.trim();
      } else if (rawDesc.trim()) {
        title = rawDesc.trim().slice(0, 40);
      } else {
        title = `Imported Record #${rowNumber - 1}`;
      }
    }

    // Amount parsing
    const { value: parsedAmount, currencyFromSymbol } = parseNumericAmount(rawAmount);

    // Currency format validation
    let resolvedCurrency: string = fallbackCurrency;
    const currencyStr = rawCurrency.trim();

    if (currencyStr) {
      const validation = validateCurrencyFormat(currencyStr);
      if (!validation.isValid || !validation.normalized) {
        errors.push({
          rowNumber,
          field: 'currency',
          message: validation.error || `Invalid currency format: "${currencyStr}". Must be a 3-letter ISO 4217 code (e.g. USD, EUR, KES).`,
          rawValue: currencyStr,
        });
        hasCurrencyErrors = true;
        // Skip adding as a valid record if currency format is invalid
        return;
      }
      resolvedCurrency = validation.normalized;
    } else if (currencyFromSymbol) {
      resolvedCurrency = currencyFromSymbol;
    } else {
      resolvedCurrency = fallbackCurrency;
    }

    // Direction and Type
    const isNegativeAmount = parsedAmount !== undefined && parsedAmount < 0;
    const finalAmount = parsedAmount !== undefined ? Math.abs(parsedAmount) : undefined;
    const inferredType = rawType ? mapRecordType(rawType) : isNegativeAmount ? 'money_out' : undefined;
    const direction = mapPaymentDirection(rawDir, inferredType, rawStatus) || (isNegativeAmount ? 'paid' : undefined);
    const type = inferredType || mapRecordType(rawType, direction, finalAmount);

    // Status / Completion
    let isCompleted = false;
    if (rawStatus) {
      const s = rawStatus.toLowerCase().trim();
      if (['completed', 'paid', 'yes', 'true', '1'].includes(s)) {
        isCompleted = true;
      }
    } else {
      if (type === 'money_in' || type === 'money_out' || direction === 'received' || direction === 'paid') {
        isCompleted = true;
      }
    }

    // Converted Amount
    const { value: parsedConverted } = parseNumericAmount(rawConverted);

    // Date & Time
    const date = normalizeDate(rawDate);
    const time = normalizeTime(rawTime);

    // ID
    const id = rawId.trim() || `rec-csv-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const record: BusinessRecord = {
      id,
      type,
      title,
      description: rawDesc.trim() || undefined,
      amount: finalAmount,
      currency: resolvedCurrency,
      convertedAmount: parsedConverted,
      direction,
      isCompleted,
      clientOrParty: rawClient.trim() || undefined,
      invoiceNumber: rawInvoice.trim() || undefined,
      date,
      time,
      createdAt: rawCreatedAt.trim() || nowIso,
      updatedAt: nowIso,
    };

    validRecords.push(record);
  });

  return {
    totalRows: dataRows.length,
    validRecords,
    errors,
    headers: headerRow,
    hasCurrencyErrors,
  };
}

/**
 * Imports parsed business records into local storage, merging or appending cleanly.
 */
export function importRecordsFromCSV(
  csvText: string,
  mode: 'append' | 'replace' = 'append',
  defaultCurrency = 'USD'
): {
  success: boolean;
  importedCount: number;
  errors: CSVRowError[];
  message: string;
} {
  const result = parseAndValidateCSV(csvText, { defaultCurrency });

  if (result.errors.length > 0 && result.validRecords.length === 0) {
    return {
      success: false,
      importedCount: 0,
      errors: result.errors,
      message: `Failed to import records: ${result.errors[0].message}`,
    };
  }

  const existing = getStoredRecords();
  let finalRecords: BusinessRecord[];

  if (mode === 'replace') {
    finalRecords = result.validRecords;
  } else {
    // Append / merge: update if existing ID exists, otherwise prepend new records
    const existingMap = new Map(existing.map((r) => [r.id, r]));
    const newItems: BusinessRecord[] = [];

    result.validRecords.forEach((item) => {
      if (existingMap.has(item.id)) {
        existingMap.set(item.id, { ...existingMap.get(item.id)!, ...item });
      } else {
        newItems.push(item);
      }
    });

    finalRecords = [...newItems, ...Array.from(existingMap.values())];
  }

  saveRecords(finalRecords);

  const errorNote =
    result.errors.length > 0
      ? ` (${result.errors.length} rows skipped due to invalid formats)`
      : '';

  return {
    success: true,
    importedCount: result.validRecords.length,
    errors: result.errors,
    message: `Successfully imported ${result.validRecords.length} records${errorNote}.`,
  };
}
