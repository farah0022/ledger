import { CurrencyRateInfo } from '../types';
export type { CurrencyRateInfo };

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'SG$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
];

const STORAGE_RATES_KEY = 'rmt_currency_rates_v1';

// Reliable baseline fallback rates against 1 USD (updated 2026)
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  KES: 130.5,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 154.2,
  CNY: 7.24,
  AED: 3.67,
  SAR: 3.75,
  ZAR: 18.25,
  INR: 83.4,
  NGN: 1480.0,
  TZS: 2600.0,
  UGX: 3720.0,
  CHF: 0.90,
  SGD: 1.35,
  BRL: 5.45,
  MXN: 18.1,
  TRY: 33.2,
};

export const DEFAULT_RATE_INFO: CurrencyRateInfo = {
  base: 'USD',
  rates: FALLBACK_RATES,
  lastUpdated: new Date().toISOString(),
  source: 'Baseline Financial Reference',
  isStale: false,
};

let inMemoryRateCache: CurrencyRateInfo | null = null;

export function getCachedRateInfo(): CurrencyRateInfo {
  if (inMemoryRateCache) return inMemoryRateCache;
  if (typeof window === 'undefined') return DEFAULT_RATE_INFO;
  try {
    const raw = localStorage.getItem(STORAGE_RATES_KEY);
    if (!raw) return DEFAULT_RATE_INFO;
    const parsed: CurrencyRateInfo = JSON.parse(raw);
    
    // Check if older than 24 hours
    const ageMs = Date.now() - new Date(parsed.lastUpdated).getTime();
    const isStale = ageMs > 24 * 60 * 60 * 1000;
    inMemoryRateCache = { ...parsed, isStale };
    return inMemoryRateCache;
  } catch {
    return DEFAULT_RATE_INFO;
  }
}

export function saveCachedRateInfo(info: CurrencyRateInfo): void {
  inMemoryRateCache = info;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(info));
  } catch (e) {
    console.warn('Failed to cache exchange rates', e);
  }
}

/**
 * Real-time exchange rate fetcher from backend API with graceful offline cache fallback
 */
export async function fetchLiveExchangeRates(baseCurrency?: string): Promise<CurrencyRateInfo> {
  const cached = getCachedRateInfo();

  try {
    // Query backend real-time currency service with optional base
    const url = baseCurrency ? `/api/rates?base=${encodeURIComponent(baseCurrency)}` : '/api/rates';
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.rates && typeof data.rates === 'object') {
      const dataBase = data.base || 'USD';
      let mergedRates: Record<string, number> = {};

      if (dataBase === 'USD') {
        mergedRates = { ...FALLBACK_RATES, ...data.rates };
      } else {
        // Rebase fallback rates to match dataBase before merging
        const baseToUsd = FALLBACK_RATES[dataBase] || 1.0;
        const rebasedFallback: Record<string, number> = {};
        for (const [code, rate] of Object.entries(FALLBACK_RATES)) {
          rebasedFallback[code] = rate / baseToUsd;
        }
        mergedRates = { ...rebasedFallback, ...data.rates };
      }

      const newInfo: CurrencyRateInfo = {
        base: dataBase,
        rates: mergedRates,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        source: data.source || 'Backend Currency Service',
        isStale: false,
      };
      saveCachedRateInfo(newInfo);
      return newInfo;
    }
    return cached;
  } catch (err) {
    console.info('Backend rates unavailable, trying direct network or cache:', err);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          const newInfo: CurrencyRateInfo = {
            base: 'USD',
            rates: { ...FALLBACK_RATES, ...data.rates },
            lastUpdated: new Date().toISOString(),
            source: 'Live Exchange Network',
            isStale: false,
          };
          saveCachedRateInfo(newInfo);
          return newInfo;
        }
      }
    } catch {
      // ignore
    }

    return {
      ...cached,
      isStale: true,
      source: 'Cached Rates (Offline Mode)',
    };
  }
}

export function getRateBetween(fromCode: string, toCode: string, rateInfo?: CurrencyRateInfo): number {
  const rates = rateInfo?.rates || getCachedRateInfo().rates || FALLBACK_RATES;
  if (fromCode === toCode) return 1.0;
  
  const fromRate = rates[fromCode] || FALLBACK_RATES[fromCode] || 1.0;
  const toRate = rates[toCode] || FALLBACK_RATES[toCode] || 1.0;
  
  // Base is USD: toRate / fromRate
  return toRate / fromRate;
}

export function convertAmount(
  amount: number | undefined, 
  fromCurrency: string, 
  toCurrency: string, 
  rateInfo?: CurrencyRateInfo
): number {
  if (amount === undefined || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;
  const rate = getRateBetween(fromCurrency, toCurrency, rateInfo);
  return amount * rate;
}

export function getCurrencySymbol(code: string): string {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found ? found.symbol : code;
}

export function formatCurrency(
  amount: number | undefined,
  currencyCode: string = 'USD',
  options?: {
    showSign?: boolean;
    sign?: 'plus' | 'minus' | 'auto';
    showCode?: boolean;
    locale?: string;
    hideDecimals?: boolean;
    position?: 'prefix' | 'suffix';
  }
): string {
  if (amount === undefined || isNaN(amount)) return `${currencyCode} 0.00`;
  const abs = Math.abs(amount);
  const locale = options?.locale || 'en-US';
  
  // JPY and TZS, UGX, KES typically use 0 decimal places if round, or if hideDecimals is requested
  const noDecimalCurrencies = ['JPY', 'UGX', 'TZS'];
  const shouldHideDecimals = options?.hideDecimals || noDecimalCurrencies.includes(currencyCode);
  const minDecimals = shouldHideDecimals ? 0 : 2;
  const maxDecimals = shouldHideDecimals ? 0 : 2;

  const numFormatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(abs);

  const symbol = getCurrencySymbol(currencyCode);

  // Sign determination:
  // 1. If explicit sign === 'minus' or amount < 0 (unless explicitly overridden to plus), it is negative
  // 2. If explicit sign === 'plus' or (options.showSign && amount > 0), it is positive
  // 3. Otherwise no sign prefix
  let prefixSign = '';
  if (options?.sign === 'minus' || (amount < -0.0001 && options?.sign !== 'plus')) {
    prefixSign = '- ';
  } else if (options?.sign === 'plus' || (options?.showSign && amount > 0.0001)) {
    prefixSign = '+ ';
  }

  const codeSuffix = options?.showCode ? ` ${currencyCode}` : '';

  if (options?.position === 'suffix') {
    return `${prefixSign}${numFormatted} ${symbol}${codeSuffix}`;
  }

  // Default prefix position: - $ 200.00 or $ 200.00
  return `${prefixSign}${symbol} ${numFormatted}${codeSuffix}`;
}

export function formatRateAge(lastUpdatedIso: string): string {
  try {
    const updated = new Date(lastUpdatedIso);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Updated just now';
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    const days = Math.floor(diffHours / 24);
    return `Cached — updated ${days}d ago`;
  } catch {
    return 'Rates available';
  }
}
