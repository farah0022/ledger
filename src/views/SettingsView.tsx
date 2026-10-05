import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Coins, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  AlertCircle,
  FileText,
  Clock,
  ShieldAlert,
  LogOut,
  Trash2,
  Globe,
  Compass,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { BusinessRecord, BusinessSettings } from '../types';
import { 
  exportAllDataJSON, 
  exportRecordsToCSV, 
  importDataJSON, 
  resetToSampleData,
  getStoredRecords,
  saveRecords
} from '../utils/storage';
import { SUPPORTED_CURRENCIES, formatCurrency } from '../utils/currency';
import { useI18n } from '../utils/i18n';
import { detectUserTimezone } from '../utils/timezone';
import { parseAndValidateCSV, CSVValidationResult } from '../utils/csv';

interface SettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (updated: Partial<BusinessSettings>) => void;
  onDataReset: () => void;
  onSignOut: () => void;
}

type SettingsTab = 'branding' | 'financial' | 'invoicing' | 'regional' | 'data' | 'session';

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
  const { t } = useI18n(settings.language);
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{
    fileName: string;
    result: CSVValidationResult;
    mode: 'append' | 'replace';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
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
    setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setImportError('Logo file must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateField('businessLogo', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateField('businessLogo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        setImportError('Failed to parse backup file. Please provide a valid JSON export.');
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
          setImportError(`CSV Import Error: ${result.errors[0].message}`);
          if (csvFileInputRef.current) csvFileInputRef.current.value = '';
          return;
        }

        if (result.validRecords.length === 0 && result.totalRows === 0) {
          setImportError('The selected CSV file does not contain any record rows.');
          if (csvFileInputRef.current) csvFileInputRef.current.value = '';
          return;
        }

        setCsvPreview({
          fileName,
          result,
          mode: 'append',
        });
      } catch (err: any) {
        setImportError(`Failed to parse CSV file: ${err?.message || 'Invalid format'}`);
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
    const skipped = csvPreview.result.errors.length;
    const skippedMsg = skipped > 0 ? ` (${skipped} invalid row${skipped > 1 ? 's' : ''} skipped)` : '';
    setCsvSuccessMessage(`Successfully imported ${count} business record${count === 1 ? '' : 's'}${skippedMsg} from ${csvPreview.fileName}.`);
    setCsvPreview(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  const handleCancelCSVImport = () => {
    setCsvPreview(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  const hasConfiguredBrand = !!(
    (formData.businessLogo && formData.businessLogo.trim()) ||
    (formData.businessName && formData.businessName.trim())
  );

  const navTabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType; description: string }> = [
    { id: 'branding', label: 'Brand & Identity', icon: Building2, description: 'Logo, business name, and appearance' },
    { id: 'financial', label: 'Currencies & Display', icon: Coins, description: 'Currencies, rounding, and table density' },
    { id: 'invoicing', label: 'Invoicing Workflow', icon: FileText, description: 'Prefix, numbering, VAT, and remittance' },
    { id: 'regional', label: 'Regional & Timezone', icon: Clock, description: 'Operating timezone and date formats' },
    { id: 'data', label: 'Data & Backups', icon: Database, description: 'Local backups, JSON exports, and CSV portability' },
    { id: 'session', label: 'Account & Session', icon: ShieldAlert, description: 'Active session and sign out' },
  ];

  return (
    <div id="settings-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="border-b border-neutral-200/80 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            {t('nav.settings') || 'Settings'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure business identity, reporting currencies, invoicing rules, and local data backups.
          </p>
        </div>
        {savedSuccess && (
          <div className="px-2.5 py-1 bg-[#EBF5F0] border border-[#146C43]/20 text-[#146C43] text-xs font-semibold rounded-lg flex items-center gap-1.5 animate-in fade-in shadow-2xs">
            <Check className="w-3.5 h-3.5 text-[#146C43]" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Main Layout: Left Tab Navigation + Right Content Panel */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Navigation Sidebar (Vertical on Desktop, Horizontal Scroll on Mobile) */}
        <nav className="w-full md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar select-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left whitespace-nowrap md:whitespace-normal cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80 bg-white md:bg-transparent border md:border-transparent border-neutral-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* TAB 1: BRANDING & IDENTITY */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/90 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-neutral-700" />
                    <span>Brand Identity & Header Presentation</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Configure your business logo and name. By default, the app remains completely unbranded until you choose to add your identity here.
                  </p>
                </div>

                {/* Business Logo Upload */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Business Logo
                  </label>
                  
                  <div className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-xl">
                    {formData.businessLogo ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <BrandLogo 
                          logoUrl={formData.businessLogo} 
                          businessName={formData.businessName}
                          size="lg"
                          badgeClassName="shadow-xs"
                        />
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-neutral-900">Custom Logo Active</div>
                          <div className="text-[11px] text-neutral-500 leading-relaxed">
                            Framed inside an adaptive executive squircle with clean borders. Displayed in the top bar, sidebar, and PDF invoices.
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <label className="text-xs text-neutral-900 hover:underline font-semibold cursor-pointer">
                              Change Logo
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </label>
                            <span className="text-neutral-300">·</span>
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove Logo</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold text-neutral-800">No Default Logo Configured</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                            Upload your business logo (PNG, SVG, or JPEG up to 2MB). If left empty, no placeholder logo will ever be shown.
                          </div>
                        </div>
                        <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200/90 text-neutral-900 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0">
                          <Upload className="w-3.5 h-3.5 text-neutral-600" />
                          <span>Upload Business Logo</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business / Operator Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-800">
                      Business or Operator Name
                    </label>
                    <span className="text-[11px] text-neutral-400">Optional</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Leave blank to stay unnamed, or enter your business name"
                    value={formData.businessName || ''}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    If left blank, the app displays no default name anywhere (no placeholder &quot;Business Ledger&quot;).
                  </p>
                </div>

                {/* Live In-App Appearance Preview */}
                <div className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-xl space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Live Header Appearance</span>
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">Real-time Preview</span>
                  </div>
                  <div className="h-12 bg-white border border-neutral-200/90 rounded-lg px-4 flex items-center justify-between shadow-2xs">
                    {hasConfiguredBrand ? (
                      <BrandLogo 
                        logoUrl={formData.businessLogo}
                        businessName={formData.businessName}
                        size="sm"
                        variant="compact"
                      />
                    ) : (
                      <span className="text-xs text-neutral-400 italic">
                        Clean &amp; Unbranded (Top header remains completely clean)
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-neutral-400">
                      {hasConfiguredBrand ? 'Custom Brand' : 'Unbranded'}
                    </span>
                  </div>
                </div>

                {/* Contact & Tax Details */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Contact &amp; Tax Information
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo || ''}
                    onChange={(e) => updateField('contactInfo', e.target.value)}
                    placeholder="e.g. contact@business.com · Tax ID / VAT: GB12345678"
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Included on exported invoices and receipts.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: FINANCIAL & CURRENCY */}
          {activeTab === 'financial' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/90 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
                    <Coins className="w-4 h-4 text-neutral-700" />
                    <span>Currency &amp; Financial Precision</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Control primary bookkeeping currency, consolidation conversions, and numeric formatting.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Primary Operating Currency
                    </label>
                    <select
                      value={formData.defaultCurrency || formData.currency || 'USD'}
                      onChange={(e) => updateField('defaultCurrency', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all cursor-pointer font-sans"
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
                      Reporting / Consolidation Currency
                    </label>
                    <select
                      value={formData.reportingCurrency || 'USD'}
                      onChange={(e) => updateField('reportingCurrency', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all cursor-pointer font-sans"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Currency Symbol Position
                    </label>
                    <select
                      value={formData.currencyPosition || 'prefix'}
                      onChange={(e) => updateField('currencyPosition', e.target.value as 'prefix' | 'suffix')}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value="prefix">Prefix ($ 1,250.00)</option>
                      <option value="suffix">Suffix (1,250.00 $)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Fiscal Year Starting Month
                    </label>
                    <select
                      value={formData.fiscalYearStart || 1}
                      onChange={(e) => updateField('fiscalYearStart', parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value={1}>January (Calendar Year)</option>
                      <option value={4}>April (UK / India / Japan)</option>
                      <option value={7}>July (Australia)</option>
                      <option value={10}>October (US Federal)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 space-y-3 border-t border-neutral-100">
                  <label className="flex items-center justify-between p-3 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200/70 rounded-lg cursor-pointer transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Round to Whole Numbers</div>
                      <div className="text-[11px] text-neutral-500">Hides decimal cents across high-level dashboard summaries</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!formData.hideDecimals}
                      onChange={(e) => updateField('hideDecimals', e.target.checked)}
                      className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200/70 rounded-lg cursor-pointer transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Compact Density View</div>
                      <div className="text-[11px] text-neutral-500">Tighter row heights in records table for high-volume scanning</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!formData.compactView}
                      onChange={(e) => updateField('compactView', e.target.checked)}
                      className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900 cursor-pointer"
                    />
                  </label>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: INVOICING WORKFLOW */}
          {activeTab === 'invoicing' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/90 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-700" />
                    <span>Invoicing &amp; Billing Workflow</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Customize invoice numbering, payment terms, and bank remittance instructions.
                  </p>
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
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-900 font-mono focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Next Sequence Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.nextInvoiceNumber || 101}
                      onChange={(e) => updateField('nextInvoiceNumber', parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-900 font-mono focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Default Payment Terms
                    </label>
                    <select
                      value={formData.defaultPaymentTerms || 'due_on_receipt'}
                      onChange={(e) => updateField('defaultPaymentTerms', e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all cursor-pointer font-sans"
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
                    Default VAT / Sales Tax Rate (%)
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.taxRateDefault ?? 0}
                      onChange={(e) => updateField('taxRateDefault', parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-900 font-mono focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs font-medium text-neutral-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Bank Remittance &amp; Wire Details
                  </label>
                  <textarea
                    rows={2}
                    value={formData.paymentDetails || ''}
                    onChange={(e) => updateField('paymentDetails', e.target.value)}
                    placeholder="e.g. Bank: Standard Chartered, IBAN / Account: #1234-5678, SWIFT: SCBLKE"
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all font-sans"
                  />
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: REGIONAL & TIMEZONE */}
          {activeTab === 'regional' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/90 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
                <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-700" />
                      <span>Regional Timezone &amp; Date Display</span>
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Ensure schedules, reminders, and transaction timestamps align with your jurisdiction.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoDetectTimezone}
                    className="text-xs text-neutral-800 hover:text-black font-semibold flex items-center gap-1.5 cursor-pointer underline underline-offset-2 shrink-0"
                  >
                    <Compass className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Auto-detect Timezone</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Operating Timezone
                  </label>
                  <select
                    value={formData.timezone || 'UTC'}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all cursor-pointer font-sans"
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
                    Date Display Format
                  </label>
                  <select
                    value={formData.dateFormat || 'YYYY-MM-DD'}
                    onChange={(e) => updateField('dateFormat', e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 outline-none transition-all cursor-pointer font-sans"
                  >
                    <option value="YYYY-MM-DD">ISO Standard (2026-09-25)</option>
                    <option value="DD/MM/YYYY">International / European (25/09/2026)</option>
                    <option value="MM/DD/YYYY">US Format (09/25/2026)</option>
                  </select>
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: DATA & BACKUPS */}
          {activeTab === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* Local Data Portability & Backups */}
              <section className="bg-white border border-neutral-200/90 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
                    <Database className="w-4 h-4 text-neutral-700" />
                    <span>Data Portability &amp; Backups</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Export your ledger into JSON or CSV spreadsheets, or restore from a previous backup file.
                  </p>
                </div>

                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center justify-between gap-2">
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
                  <div className="p-3 bg-[#EBF5F0] border border-[#146C43]/20 text-[#146C43] text-xs rounded-lg flex items-center justify-between gap-2">
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

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={exportAllDataJSON}
                    className="px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-medium text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Download JSON Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportRecordsToCSV()}
                    className="px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-medium text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Export CSV Spreadsheet</span>
                  </button>

                  <label className="px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-medium text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Import CSV</span>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCSVFileSelect}
                      className="hidden"
                    />
                  </label>

                  <label className="px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-medium text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Restore JSON Backup</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Duplicate Entry Detection Guard */}
                <div className="pt-3 border-t border-neutral-100">
                  <label className="flex items-center justify-between p-3 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200/70 rounded-lg cursor-pointer transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Duplicate Record Detection</div>
                      <div className="text-[11px] text-neutral-500">Warns before saving if a transaction with matching amount, party, and date already exists</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!formData.autoDetectDuplicates}
                      onChange={(e) => updateField('autoDetectDuplicates', e.target.checked)}
                      className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Demo Data Reset */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">Sample Records Reset</div>
                    <div className="text-[11px] text-neutral-500">Reset records to demonstration data for testing</div>
                  </div>
                  {isResetConfirmOpen ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          resetToSampleData();
                          onDataReset();
                          setIsResetConfirmOpen(false);
                          setSavedSuccess(true);
                          setTimeout(() => setSavedSuccess(false), 2000);
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsResetConfirmOpen(false)}
                        className="px-2.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-medium text-neutral-600 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsResetConfirmOpen(true)}
                      className="px-3 py-1.5 border border-neutral-200 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-medium text-neutral-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset Demo Data</span>
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 6: ACCOUNT SESSION */}
          {activeTab === 'session' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <section className="bg-white border border-neutral-200/90 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-neutral-700" />
                    <span>Session &amp; Security</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    View active local session details and sign out to the welcome screen.
                  </p>
                </div>

                <div className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-neutral-900">Local Ledger Storage Mode</div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Your records and settings are stored privately in your browser and on your local disk. No third-party servers hold your financial ledger.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">Sign Out of Session</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Closes the active database session and returns to startup screen.
                    </div>
                  </div>
                  <button
                    type="button"
                    id="settings-signout-btn"
                    onClick={onSignOut}
                    className="px-3.5 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-medium text-red-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* CSV Import Preview & Validation Modal */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-neutral-800" />
                  <h3 className="text-sm font-semibold text-neutral-900">Import Records from CSV</h3>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 font-mono truncate max-w-sm">
                  {csvPreview.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelCSVImport}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 overflow-y-auto space-y-4 text-xs">
              {/* Stats badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div className="text-[11px] text-neutral-500 font-medium">Valid Records Mapped</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
                    {csvPreview.result.validRecords.length}
                  </div>
                </div>

                <div className={`p-3 rounded-lg border ${
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
                        <span>ISO Formats Validated</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Currency format error breakdown */}
              {csvPreview.result.errors.length > 0 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Currency Validation Details</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    The following rows will be excluded. Currencies must follow standard ISO 4217 (3 letters, e.g. USD, EUR, KES, GBP) or recognized symbols ($, €, £, KSh).
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                    {csvPreview.result.errors.map((err, i) => (
                      <div key={i} className="bg-white/70 px-2 py-1 rounded text-amber-900 border border-amber-200/50 flex items-start gap-1.5">
                        <span className="font-semibold shrink-0">Row {err.rowNumber}:</span>
                        <span className="break-all">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapped Records Preview Table */}
              {csvPreview.result.validRecords.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-neutral-600 flex items-center justify-between">
                    <span>Mapped Data Preview (first 4 records)</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {csvPreview.result.validRecords.length} total mapped
                    </span>
                  </div>
                  <div className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50/30">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-600">
                        <tr>
                          <th className="py-1.5 px-2.5 font-medium">Date</th>
                          <th className="py-1.5 px-2.5 font-medium">Title</th>
                          <th className="py-1.5 px-2.5 font-medium">Type</th>
                          <th className="py-1.5 px-2.5 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 bg-white">
                        {csvPreview.result.validRecords.slice(0, 4).map((rec, i) => (
                          <tr key={i} className="hover:bg-neutral-50">
                            <td className="py-1.5 px-2.5 font-mono text-neutral-600 whitespace-nowrap">
                              {rec.date}
                            </td>
                            <td className="py-1.5 px-2.5 font-medium text-neutral-900 truncate max-w-[150px]">
                              {rec.title}
                            </td>
                            <td className="py-1.5 px-2.5 text-neutral-500 whitespace-nowrap capitalize">
                              {rec.type.replace('_', ' ')}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-medium text-right text-neutral-900 whitespace-nowrap">
                              {rec.amount !== undefined
                                ? formatCurrency(rec.amount, rec.currency || 'USD')
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Mode Selector */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <div className="text-[11px] font-semibold text-neutral-900">Import Mode</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    csvPreview.mode === 'append'
                      ? 'border-neutral-900 bg-neutral-50/70'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}>
                    <input
                      type="radio"
                      name="csv_mode"
                      checked={csvPreview.mode === 'append'}
                      onChange={() => setCsvPreview({ ...csvPreview, mode: 'append' })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-neutral-900">Append &amp; Merge</div>
                      <div className="text-[10px] text-neutral-500 leading-tight mt-0.5">
                        Preserves existing records; updates if duplicate ID.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    csvPreview.mode === 'replace'
                      ? 'border-neutral-900 bg-neutral-50/70'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}>
                    <input
                      type="radio"
                      name="csv_mode"
                      checked={csvPreview.mode === 'replace'}
                      onChange={() => setCsvPreview({ ...csvPreview, mode: 'replace' })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-neutral-900">Replace All</div>
                      <div className="text-[10px] text-neutral-500 leading-tight mt-0.5">
                        Clears existing records and imports only this CSV.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancelCSVImport}
                className="px-3.5 py-1.5 border border-neutral-200 hover:bg-white text-xs font-medium text-neutral-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCSVImport}
                disabled={csvPreview.result.validRecords.length === 0}
                className="px-4 py-1.5 bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
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
