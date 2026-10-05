import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sidebar, 
  NavTab 
} from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { HomeView } from './views/HomeView';
import { RecordsView } from './views/RecordsView';
import { MoneyView } from './views/MoneyView';
import { TimeView } from './views/TimeView';
import { HelpView } from './views/HelpView';
import { SettingsView } from './views/SettingsView';

import { RecordModal } from './components/RecordModal';
import { InvoiceModal } from './components/InvoiceModal';
import { CalculatorModal } from './components/CalculatorModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { WelcomeScreen } from './components/WelcomeScreen';

import { BusinessRecord, BusinessSettings, TimeItem, UserAccount } from './types';
import { 
  getStoredRecords, 
  getStoredSettings, 
  getStoredUser,
  saveUser,
  addRecord, 
  updateRecord, 
  deleteRecord, 
  saveSettings, 
  subscribeToDataChanges,
  initStorageSync,
  DEFAULT_SETTINGS
} from './utils/storage';
import { CurrencyRateInfo, fetchLiveExchangeRates, SUPPORTED_CURRENCIES } from './utils/currency';
import { Search, Plus, Globe, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { useI18n } from './utils/i18n';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [rateInfo, setRateInfo] = useState<CurrencyRateInfo | undefined>();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BusinessRecord | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [invoiceRecord, setInvoiceRecord] = useState<BusinessRecord | null>(null);

  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<BusinessRecord | null>(null);

  const { isRtl } = useI18n(settings.language);
  const repCurrency = settings.reportingCurrency || settings.defaultCurrency || settings.currency || 'USD';

  // Sync with local database
  const refreshData = useCallback(() => {
    setRecords(getStoredRecords());
    setSettings(getStoredSettings());
    setCurrentUser(getStoredUser());
  }, []);

  const handleRefreshLedger = useCallback(() => {
    setIsRefreshing(true);
    refreshData();
    fetchRates();
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshNotice('Ledger Synchronized');
      setTimeout(() => setRefreshNotice(null), 1800);
    }, 400);
  }, [refreshData]);

  useEffect(() => {
    refreshData();
    initStorageSync().then(() => refreshData());
    const unsubscribe = subscribeToDataChanges(() => {
      refreshData();
    });
    return unsubscribe;
  }, [refreshData]);

  // Fetch real-time exchange rates from backend
  const fetchRates = useCallback(async () => {
    try {
      const activeBase = settings.reportingCurrency || settings.defaultCurrency || 'USD';
      const data = await fetchLiveExchangeRates(activeBase);
      setRateInfo(data);
    } catch (err) {
      console.warn('Could not fetch backend exchange rates', err);
    }
  }, [settings.reportingCurrency, settings.defaultCurrency]);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates, settings.defaultCurrency, settings.reportingCurrency]);

  // Set document dir attribute for RTL support
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language || 'en';
  }, [isRtl, settings.language]);

  // Handle Escape key to dismiss modals (no hotkeys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRecordModalOpen(false);
        setIsInvoiceModalOpen(false);
        setIsCalculatorModalOpen(false);
        setIsSearchModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for records
  const handleSaveRecord = (recordData: Omit<BusinessRecord, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => {
    if (editId) {
      updateRecord(editId, recordData);
    } else {
      addRecord(recordData);
    }
    refreshData();
  };

  const handleEditRecord = (record: BusinessRecord) => {
    setEditingRecord(record);
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = (record: BusinessRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (recordToDelete) {
      deleteRecord(recordToDelete.id);
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      refreshData();
    }
  };

  const handleToggleTimeComplete = (timeItem: TimeItem) => {
    updateRecord(timeItem.recordId, { isCompleted: !timeItem.isCompleted });
    refreshData();
  };

  const handleCreateInvoice = (record: BusinessRecord) => {
    setInvoiceRecord(record);
    setIsInvoiceModalOpen(true);
  };

  const handleRecordFromCalculator = (calcAmount: number) => {
    setIsCalculatorModalOpen(false);
    setEditingRecord({
      id: '',
      type: 'money_in',
      title: 'Calculated Amount',
      amount: calcAmount,
      currency: settings.defaultCurrency || 'USD',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsRecordModalOpen(true);
  };

  const handleSignOut = () => {
    saveUser(null);
    setCurrentUser(null);
    refreshData();
  };

  // If user is not created/logged in, show the first-run Welcome & Account setup screen
  if (!currentUser) {
    return <WelcomeScreen onComplete={refreshData} />;
  }

  const hasBrand = (settings.businessLogo && settings.businessLogo.length > 0) || (settings.businessName && settings.businessName.trim().length > 0);

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col md:flex-row text-[#191918]">
      {/* Animated Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewRecord={() => {
          setEditingRecord(null);
          setIsRecordModalOpen(true);
        }}
        onSignOut={handleSignOut}
        currentUser={currentUser}
        settings={settings}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Clean, Understated Top Bar */}
        <header className="h-14 border-b border-neutral-200/80 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* If user uploaded logo or set business name, display it with executive BrandLogo; otherwise remain completely blank */}
            {hasBrand ? (
              <BrandLogo 
                logoUrl={settings.businessLogo} 
                businessName={settings.businessName}
                size="sm"
                variant="compact"
                className="max-w-[240px]"
              />
            ) : null}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
            {/* Quick Modern Refresh Icon Button */}
            <div className="relative">
              <button
                id="top-refresh-app-btn"
                type="button"
                onClick={handleRefreshLedger}
                disabled={isRefreshing}
                className={`p-2 rounded-lg border border-neutral-200/80 bg-neutral-50/60 hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-600 hover:text-neutral-900 ${
                  isRefreshing ? 'bg-[#EBF5F0] text-[#146C43] border-[#146C43]/30' : ''
                }`}
                title="Refresh Ledger and sync data"
                aria-label="Refresh and sync data"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#146C43]' : ''}`} />
              </button>
              {refreshNotice && (
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 animate-in fade-in">
                  {refreshNotice}
                </div>
              )}
            </div>

            {/* Quick Currency selector */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200/80 bg-neutral-50/60 text-xs text-neutral-600 hover:bg-neutral-100 transition-colors">
              <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={repCurrency}
                onChange={(e) => {
                  const newCurr = e.target.value;
                  const updated = { 
                    ...settings, 
                    reportingCurrency: newCurr, 
                    defaultCurrency: newCurr, 
                    currency: newCurr 
                  };
                  setSettings(updated);
                  saveSettings(updated);
                  fetchRates();
                }}
                className="font-mono font-medium bg-transparent border-0 text-xs text-neutral-900 cursor-pointer focus:outline-hidden"
                title="Active reporting currency"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy Mode Toggle */}
            <button
              onClick={() => {
                const updated = { ...settings, privacyMode: !settings.privacyMode };
                setSettings(updated);
                saveSettings(updated);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                settings.privacyMode
                  ? 'bg-amber-50 text-amber-900 border-amber-200 shadow-2xs'
                  : 'border-neutral-200/80 bg-neutral-50/60 hover:bg-neutral-100 text-neutral-600'
              }`}
              title={settings.privacyMode ? "Privacy Mode active: cash amounts blurred. Click to reveal" : "Hide cash balances from bystanders"}
            >
              {settings.privacyMode ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span className="hidden md:inline">
                {settings.privacyMode ? 'Cash Blurred' : 'Hide Cash'}
              </span>
            </button>

            {/* Global Search Trigger */}
            <button
              id="top-search-btn"
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200/80 bg-neutral-50/60 hover:bg-neutral-100 text-xs text-neutral-600 transition-colors cursor-pointer"
              title="Search across all records"
            >
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline">Search</span>
            </button>

            {/* Quick Add Record Button */}
            <button
              id="top-new-record-btn"
              onClick={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Record</span>
            </button>
          </div>
        </header>

        {/* View Switcher */}
        <main className="flex-1">
          {currentTab === 'home' && (
            <HomeView
              records={records}
              settings={settings}
              rateInfo={rateInfo}
              onNavigate={setCurrentTab}
              onOpenNewRecord={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              onSelectRecord={handleEditRecord}
              onToggleTimeComplete={handleToggleTimeComplete}
              onUpdateSettings={(patch) => {
                const merged = { ...settings, ...patch };
                setSettings(merged);
                saveSettings(merged);
              }}
            />
          )}

          {currentTab === 'records' && (
            <RecordsView
              records={records}
              settings={settings}
              rateInfo={rateInfo}
              onOpenNewRecord={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              onEditRecord={handleEditRecord}
              onDeleteRecord={handleDeleteRecord}
              onCreateInvoice={handleCreateInvoice}
            />
          )}

          {currentTab === 'money' && (
            <MoneyView
              records={records}
              settings={settings}
              rateInfo={rateInfo}
              onOpenCalculator={() => setIsCalculatorModalOpen(true)}
              onSelectRecord={handleEditRecord}
              onOpenNewRecord={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
            />
          )}

          {currentTab === 'time' && (
            <TimeView
              records={records}
              settings={settings}
              onOpenNewRecord={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              onSelectRecord={handleEditRecord}
              onToggleComplete={handleToggleTimeComplete}
            />
          )}

          {currentTab === 'help' && (
            <HelpView 
              language={settings.language} 
              onOpenSettings={() => setCurrentTab('settings')} 
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(updated) => {
                const merged = { ...settings, ...updated };
                setSettings(merged);
                saveSettings(merged);
                refreshData();
                fetchRates();
              }}
              onDataReset={refreshData}
              onSignOut={handleSignOut}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewRecord={() => {
          setEditingRecord(null);
          setIsRecordModalOpen(true);
        }}
        language={settings.language}
      />

      {/* Modals & Dialogs */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        initialRecord={editingRecord}
        settings={settings}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setInvoiceRecord(null);
        }}
        record={invoiceRecord}
        settings={settings}
        onSaveInvoiceNumber={(recordId, invoiceNum) => {
          updateRecord(recordId, { invoiceNumber: invoiceNum });
        }}
      />

      <CalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
        currency={settings.defaultCurrency || 'USD'}
        onRecordAmount={handleRecordFromCalculator}
      />

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        records={records}
        currency={settings.defaultCurrency || 'USD'}
        onSelectRecord={handleEditRecord}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        record={recordToDelete}
        currency={settings.defaultCurrency || 'USD'}
      />
    </div>
  );
}
