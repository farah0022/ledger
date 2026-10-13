import React, { useState, useRef, useEffect } from 'react';
import { 
  Coins, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  AlertCircle,
  FileText, 
  Clock, 
  LogOut, 
  Compass, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { BusinessRecord, BusinessSettings } from '../types';
import { 
  exportAllDataJSON, 
  exportRecordsToCSV, 
  importDataJSON, 
  resetToSampleData,
  getStoredRecords,
  saveRecords
} from '../utils/storage';
import { SUPPORTED_CURRENCIES, fetchLiveExchangeRates, getCachedRateInfo } from '../utils/currency';
import { detectUserTimezone } from '../utils/timezone';
import { parseAndValidateCSV, CSVValidationResult } from '../utils/csv';

interface SettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (updated: Partial<BusinessSettings>) => void;
  onDataReset: () => void;
  onSignOut: () => void;
}

type SettingsTab = 'general' | 'invoicing' | 'regional' | 'data';

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'New York (EDT/EST, UTC-4/-5)' },
  { value: 'America/Chicago', label: 'Chicago (CDT/CST, UTC-5/-6)' },
  { value: 'America/Denver', label: 'Denver (MDT/MST, UTC-6/-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PDT/PST, UTC-7/-8)' },
  { value: 'Europe/London', label: 'London (BST/GMT, UTC+1/0)' },
  { value: 'Europe/Paris', label: 'Paris / Berlin (CEST/CET, UTC+2/+1)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT, UTC+3)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST, UTC+2)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Kolkata', label: 'India / New Delhi (IST, UTC+5:30)' },
  { value: 'Asia/Singapore', label: 'Singapore / Hong Kong (SGT/HKT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT, UTC+10/+11)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onDataReset,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [ratesUpdatedNotice, setRatesUpdatedNotice] = useState(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{
    fileName: string;
    result: CSVValidationResult;
    mode: 'append' | 'replace';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const updateField = <K extends keyof BusinessSettings>(field: K, val: BusinessSettings[K]) => {
    const updated = {
      ...formData,
      [field]: val,
      ...(field === 'defaultCurrency' ? { currency: val as string } : {}),
    };
    setFormData(updated);
    onUpdateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1600);
  };

  const handleRefreshRates = async () => {
    setIsUpdatingRates(true);
    try {
      await fetchLiveExchangeRates(formData.defaultCurrency || 'USD');
      setRatesUpdatedNotice(true);
      setTimeout(() => setRatesUpdatedNotice(false), 2000);
    } catch {
      // Graceful fallback to cached rates
    } finally {
      setIsUpdatingRates(false);
    }
  };

  const handleAutoDetectTimezone = () => {
    const detected = detectUserTimezone();
    updateField('timezone', detected.timezone);
    updateField('locationName', detected.cityName);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setCsvSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJSON(content);
      if (success) {
        onDataReset();
        setSavedSuccess(true);
      } else {
        setImportError('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setCsvSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const activeDefaultCurrency = formData.defaultCurrency || formData.currency || 'USD';
        const result = parseAndValidateCSV(content, { defaultCurrency: activeDefaultCurrency });

        if (result.validRecords.length === 0 && result.errors.length > 0) {
          setImportError(`CSV Error: ${result.errors[0].message}`);
          if (csvFileInputRef.current) csvFileInputRef.current.value = '';
          return;
        }

        if (result.validRecords.length === 0 && result.totalRows === 0) {
          setImportError('No records found in CSV.');
          if (csvFileInputRef.current) csvFileInputRef.current.value = '';
          return;
        }

        setCsvPreview({
          fileName,
          result,
          mode: 'append',
        });
      } catch (err: any) {
        setImportError(`Failed to parse CSV: ${err?.message || 'Invalid format'}`);
        if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCSVImport = () => {
    if (!csvPreview || csvPreview.result.validRecords.length === 0) return;

    const existing = getStoredRecords();
    let finalRecords: BusinessRecord[];

    if (csvPreview.mode === 'replace') {
      finalRecords = csvPreview.result.validRecords;
    } else {
      const existingMap = new Map(existing.map((r) => [r.id, r]));
      const newItems: BusinessRecord[] = [];

      csvPreview.result.validRecords.forEach((item) => {
        if (existingMap.has(item.id)) {
          existingMap.set(item.id, { ...existingMap.get(item.id)!, ...item });
        } else {
          newItems.push(item);
        }
      });

      finalRecords = [...newItems, ...Array.from(existingMap.values())];
    }

    saveRecords(finalRecords);
    onDataReset();

    const count = csvPreview.result.validRecords.length;
    setCsvSuccessMessage(`Imported ${count} record${count === 1 ? '' : 's'} from ${csvPreview.fileName}.`);
    setCsvPreview(null);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const handleCancelCSVImport = () => {
    setCsvPreview(null);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const navTabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType }> = [
    { id: 'general', label: 'Financial & Display', icon: Coins },
    { id: 'invoicing', label: 'Invoicing Defaults', icon: FileText },
    { id: 'regional', label: 'Regional & Time', icon: Clock },
    { id: 'data', label: 'Data & Portability', icon: Database },
  ];

  const rateInfo = getCachedRateInfo();

  return (
    <div id="settings-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200/70">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            System preferences, financial formats, and data controls.
          </p>
        </div>
        {savedSuccess && (
          <div className="px-2.5 py-1 bg-[#EBF5F0] border border-[#146C43]/20 text-[#146C43] text-xs font-semibold rounded-lg flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-[#146C43]" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Main Container: Segmented Nav + Content Card */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-52 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 no-scrollbar select-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap md:whitespace-normal cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80 bg-white md:bg-transparent border md:border-transparent border-neutral-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Content Panel */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* TAB 1: FINANCIAL & DISPLAY */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#146C43]" />
                    <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
                      Currencies &amp; Numeric Precision
                    </h2>
                  </div>
                  {/* Live Exchange Rate Status Button */}
                  <div className="flex items-center gap-2">
                    {ratesUpdatedNotice && (
                      <span className="text-[11px] font-semibold text-[#146C43] animate-in fade-in">
                        Rates Updated
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleRefreshRates}
                      disabled={isUpdatingRates}
                      className="px-2.5 py-1 rounded-lg border border-neutral-200/80 bg-neutral-50 hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Update live foreign exchange conversion rates"
                    >
                      <TrendingUp className={`w-3.5 h-3.5 text-[#146C43] ${isUpdatingRates ? 'animate-spin' : ''}`} />
                      <span>{isUpdatingRates ? 'Updating...' : 'Refresh FX Rates'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Primary Currency
                    </label>
                    <select
                      value={formData.defaultCurrency || formData.currency || 'USD'}
                      onChange={(e) => updateField('defaultCurrency', e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200/90 rounded-xl text-xs font-medium text-neutral-900 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all cursor-pointer"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Reporting Currency
                    </label>
                    <select
                      value={formData.reportingCurrency || 'USD'}
                      onChange={(e) => updateField('reportingCurrency', e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200/90 rounded-xl text-xs font-medium text-neutral-900 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all cursor-pointer"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Symbol Placement
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100/70 border border-neutral-200/60 rounded-xl max-w-sm">
                    <button
                      type="button"
                      onClick={() => updateField('currencyPosition', 'prefix')}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        formData.currencyPosition === 'prefix'
                          ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Prefix ($ 1,000)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('currencyPosition', 'suffix')}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        formData.currencyPosition === 'suffix'
                          ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Suffix (1,000 $)
                    </button>
                  </div>
                </div>

                {/* Display Toggles */}
                <div className="pt-2 space-y-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between p-3.5 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/70 rounded-xl transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Round Decimals</div>
                      <div className="text-[11px] text-neutral-500">Hide decimal cents on summary totals</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!formData.hideDecimals}
                      onClick={() => updateField('hideDecimals', !formData.hideDecimals)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData.hideDecimals ? 'bg-[#146C43]' : 'bg-neutral-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          formData.hideDecimals ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/70 rounded-xl transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Compact Table Rows</div>
                      <div className="text-[11px] text-neutral-500">Condensed row height for record scanning</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!formData.compactView}
                      onClick={() => updateField('compactView', !formData.compactView)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData.compactView ? 'bg-[#146C43]' : 'bg-neutral-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          formData.compactView ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: INVOICING DEFAULTS */}
          {activeTab === 'invoicing' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="border-b border-neutral-100 pb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#146C43]" />
                  <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
                    Invoicing &amp; Billing Rules
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Invoice Prefix
                    </label>
                    <input
                      type="text"
                      value={formData.invoicePrefix || 'INV-2026-'}
                      onChange={(e) => updateField('invoicePrefix', e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs text-neutral-900 font-mono focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Next Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.nextInvoiceNumber || 101}
                      onChange={(e) => updateField('nextInvoiceNumber', parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs text-neutral-900 font-mono focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Default Terms
                    </label>
                    <select
                      value={formData.defaultPaymentTerms || 'due_on_receipt'}
                      onChange={(e) => updateField('defaultPaymentTerms', e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs font-medium text-neutral-900 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all cursor-pointer"
                    >
                      <option value="due_on_receipt">Due on Receipt</option>
                      <option value="net_15">Net 15 Days</option>
                      <option value="net_30">Net 30 Days</option>
                      <option value="net_60">Net 60 Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Default Tax / VAT Rate (%)
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.taxRateDefault ?? 0}
                      onChange={(e) => updateField('taxRateDefault', parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs text-neutral-900 font-mono focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all pr-8"
                    />
                    <span className="absolute right-3.5 top-2 text-xs font-medium text-neutral-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Contact &amp; Tax ID Line
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo || ''}
                    onChange={(e) => updateField('contactInfo', e.target.value)}
                    placeholder="e.g. contact@business.com · Tax / VAT: ID-987654"
                    className="w-full px-3.5 py-2 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Remittance Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={formData.paymentDetails || ''}
                    onChange={(e) => updateField('paymentDetails', e.target.value)}
                    placeholder="e.g. Bank: Standard Chartered · Account: #1234-5678 · SWIFT: SCBLKE"
                    className="w-full px-3.5 py-2 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all resize-none"
                  />
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: REGIONAL & TIME */}
          {activeTab === 'regional' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#146C43]" />
                    <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
                      Timezone &amp; Calendar Format
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoDetectTimezone}
                    className="text-xs text-[#146C43] hover:text-[#0F5132] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Auto-detect</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone || 'UTC'}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200/90 rounded-xl text-xs font-medium text-neutral-900 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all cursor-pointer"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Date Format
                  </label>
                  <select
                    value={formData.dateFormat || 'YYYY-MM-DD'}
                    onChange={(e) => updateField('dateFormat', e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200/90 rounded-xl text-xs font-medium text-neutral-900 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all cursor-pointer"
                  >
                    <option value="YYYY-MM-DD">ISO Standard (2026-10-13)</option>
                    <option value="DD/MM/YYYY">International (13/10/2026)</option>
                    <option value="MM/DD/YYYY">US Format (10/13/2026)</option>
                  </select>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: DATA & BACKUPS */}
          {activeTab === 'data' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#146C43]" />
                    <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
                      Data Portability &amp; Vault
                    </h2>
                  </div>
                  {/* Vault status */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#EBF5F0] border border-[#146C43]/20 rounded-lg text-[11px] font-semibold text-[#146C43]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#146C43]" />
                    <span>Local Vault Active</span>
                  </div>
                </div>

                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{importError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportError(null)}
                      className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {csvSuccessMessage && (
                  <div className="p-3 bg-[#EBF5F0] border border-[#146C43]/20 text-[#146C43] text-xs rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#146C43]" />
                      <span>{csvSuccessMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCsvSuccessMessage(null)}
                      className="text-[#146C43] hover:text-[#0F5132] p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Export & Import Action Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={exportAllDataJSON}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/80 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <Download className="w-4 h-4 text-neutral-600 group-hover:text-neutral-900 mb-1.5" />
                    <div className="text-xs font-semibold text-neutral-900">Backup JSON</div>
                    <div className="text-[10px] text-neutral-400">Complete vault</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportRecordsToCSV()}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/80 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-neutral-600 group-hover:text-neutral-900 mb-1.5" />
                    <div className="text-xs font-semibold text-neutral-900">Export CSV</div>
                    <div className="text-[10px] text-neutral-400">Spreadsheet table</div>
                  </button>

                  <label className="p-3 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/80 rounded-xl text-left transition-colors cursor-pointer group">
                    <FileSpreadsheet className="w-4 h-4 text-neutral-600 group-hover:text-neutral-900 mb-1.5" />
                    <div className="text-xs font-semibold text-neutral-900">Import CSV</div>
                    <div className="text-[10px] text-neutral-400">Map records</div>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCSVFileSelect}
                      className="hidden"
                    />
                  </label>

                  <label className="p-3 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/80 rounded-xl text-left transition-colors cursor-pointer group">
                    <Upload className="w-4 h-4 text-neutral-600 group-hover:text-neutral-900 mb-1.5" />
                    <div className="text-xs font-semibold text-neutral-900">Restore JSON</div>
                    <div className="text-[10px] text-neutral-400">Load backup</div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Duplicate Guard Toggle */}
                <div className="pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between p-3.5 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/70 rounded-xl transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Duplicate Check</div>
                      <div className="text-[11px] text-neutral-500">Alerts if identical amount, party, and date exist</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!formData.autoDetectDuplicates}
                      onClick={() => updateField('autoDetectDuplicates', !formData.autoDetectDuplicates)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData.autoDetectDuplicates ? 'bg-[#146C43]' : 'bg-neutral-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          formData.autoDetectDuplicates ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Reset & Session Controls */}
                <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">Workspace Management</div>
                    <div className="text-[11px] text-neutral-500">Reset demo records or sign out of session</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isResetConfirmOpen ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            resetToSampleData();
                            onDataReset();
                            setIsResetConfirmOpen(false);
                            setSavedSuccess(true);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Confirm Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsResetConfirmOpen(false)}
                          className="px-2.5 py-1.5 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-600 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Reset Samples</span>
                      </button>
                    )}

                    <button
                      type="button"
                      id="settings-signout-btn"
                      onClick={onSignOut}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* CSV Import Modal (Clean, Modern, Uncluttered) */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Import CSV Records</h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate max-w-xs">{csvPreview.fileName}</p>
              </div>
              <button
                type="button"
                onClick={handleCancelCSVImport}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="text-[11px] text-neutral-500 font-medium">Valid Records</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
                    {csvPreview.result.validRecords.length}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  csvPreview.result.hasCurrencyErrors
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-[#EBF5F0] border-[#146C43]/20 text-[#146C43]'
                }`}>
                  <div className="text-[11px] font-medium opacity-80">Currency Validation</div>
                  <div className="text-xs font-semibold mt-1 flex items-center gap-1.5">
                    {csvPreview.result.hasCurrencyErrors ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{csvPreview.result.errors.length} Format Issue{csvPreview.result.errors.length > 1 ? 's' : ''}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#146C43] shrink-0" />
                        <span>Valid ISO Currencies</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-neutral-900">Import Strategy</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCsvPreview({ ...csvPreview, mode: 'append' })}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      csvPreview.mode === 'append'
                        ? 'border-neutral-900 bg-neutral-50 font-semibold text-neutral-900'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <div>Append &amp; Merge</div>
                    <div className="text-[10px] text-neutral-400 font-normal">Keep existing data</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCsvPreview({ ...csvPreview, mode: 'replace' })}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      csvPreview.mode === 'replace'
                        ? 'border-neutral-900 bg-neutral-50 font-semibold text-neutral-900'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <div>Replace All</div>
                    <div className="text-[10px] text-neutral-400 font-normal">Overwrite table</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancelCSVImport}
                className="px-3.5 py-1.5 border border-neutral-200 hover:bg-white text-xs font-medium text-neutral-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCSVImport}
                disabled={csvPreview.result.validRecords.length === 0}
                className="px-4 py-1.5 bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Import {csvPreview.result.validRecords.length} Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
