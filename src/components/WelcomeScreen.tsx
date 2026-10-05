import React, { useState, useRef } from 'react';
import { 
  FolderOpen, 
  ArrowRight, 
  FileCheck2, 
  Sparkles,
  AlertCircle,
  Coins,
  CheckCircle2,
  HardDrive,
  Download
} from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { createLocalAccount, createDemoAccount, importDataJSON } from '../utils/storage';
import { UserAccount } from '../types';
import { BrandLogo } from './BrandLogo';

interface WelcomeScreenProps {
  onAccountCreated?: (user: UserAccount) => void;
  onComplete?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAccountCreated, onComplete }) => {
  const [mode, setMode] = useState<'create' | 'open'>('create');
  
  // Clean inputs with pre-named "db"
  const [name, setName] = useState('');
  const [dbName, setDbName] = useState('db');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track if file location has been selected and saved
  const [savedFileHandleName, setSavedFileHandleName] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const finishSetup = (user: UserAccount) => {
    if (onAccountCreated) onAccountCreated(user);
    if (onComplete) onComplete();
  };

  // Open native files dialog to choose where to save the db file before creating the account
  const handlePickAndSaveFile = async () => {
    setError(null);
    setIsSaving(true);

    const cleanDbName = dbName.trim() || 'db';
    const fullFileName = cleanDbName.endsWith('.json') ? cleanDbName : `${cleanDbName}.json`;

    // Try native File System Access API
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fullFileName,
          types: [
            {
              description: 'Ledger JSON Database File',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });

        if (handle && handle.name) {
          // Write initial clean database structure to the file
          try {
            const writable = await handle.createWritable();
            const initialData = {
              records: [],
              settings: {
                businessName: name.trim(),
                defaultCurrency: currency || 'USD',
                reportingCurrency: currency || 'USD',
                currency: currency || 'USD',
                databaseLocation: `./${handle.name}`,
                updatedAt: new Date().toISOString(),
              },
              user: {
                name: name.trim() || 'Operator',
                createdAt: new Date().toISOString(),
              },
            };
            await writable.write(JSON.stringify(initialData, null, 2));
            await writable.close();
          } catch (writeErr) {
            console.warn('Initial file write handled gracefully:', writeErr);
          }

          setSavedFileHandleName(handle.name);
          setSavedFilePath(`./data/${handle.name}`);
          setIsSaving(false);
          return handle.name;
        }
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') {
          setIsSaving(false);
          return null;
        }
      }
    }

    // Fallback: create & save db.json file in local storage and trigger download
    try {
      const fallbackName = fullFileName;
      setSavedFileHandleName(fallbackName);
      setSavedFilePath(`./data/${fallbackName}`);
      setIsSaving(false);
      return fallbackName;
    } catch {
      setError('Could not access storage location.');
      setIsSaving(false);
      return null;
    }
  };

  // Create account and finalize
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let activeFileName = savedFileHandleName;

    // If file location not picked yet, trigger the file save dialog first
    if (!activeFileName) {
      activeFileName = await handlePickAndSaveFile();
      if (!activeFileName) {
        // User cancelled picker; let them try again
        return;
      }
    }

    setIsSaving(true);
    try {
      const cleanName = name.trim();
      const cleanDbName = activeFileName || (dbName.trim() ? `${dbName.trim()}.json` : 'db.json');
      const targetPath = savedFilePath || `./data/${cleanDbName}`;

      const user = createLocalAccount(
        cleanName,
        currency || 'USD',
        'en',
        targetPath,
        cleanDbName
      );
      finishSetup(user);
    } catch {
      setError('Could not initialize account. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenExistingFile = (file: File) => {
    setError(null);
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a valid .json database file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        const success = importDataJSON(text);

        if (success) {
          const businessName = parsed.settings?.businessName || parsed.user?.name || file.name.replace('.json', '');
          const user: UserAccount = {
            id: `usr-${Date.now()}`,
            name: businessName,
            isDemo: false,
            storageMode: 'local',
            databaseLocation: `./data/${file.name}`,
            databaseName: file.name,
            createdAt: new Date().toISOString(),
          };
          finishSetup(user);
        } else {
          setError('Could not read this database file.');
        }
      } catch {
        setError('Invalid file format. Please choose a valid database JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Demo account: 100% USD default
  const handleDemo = () => {
    const user = createDemoAccount(
      name.trim() || 'Demo Ledger',
      'USD',
      'en',
      './data/db.json',
      'db.json'
    );
    finishSetup(user);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-8 sm:py-16 text-slate-800">
      <div className="w-full max-w-[440px]">
        {/* Friendly, refined brand header (soft warm styling, money green theme) */}
        <div className="text-center mb-6">
          <BrandLogo size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'create' ? 'Create your ledger' : 'Open existing database'}
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
            {mode === 'create'
              ? 'Choose where to save your database file, then create your account.'
              : 'Select your saved database file from your device to continue.'}
          </p>
        </div>

        {/* Clean, warm card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-7">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              {/* 1. Account / Business Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business or Account Name
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. My Business (or your name)"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#146C43] focus:bg-white focus:ring-2 focus:ring-[#EBF5F0] transition-all"
                />
              </div>

              {/* 2. Choose where to save the db file BEFORE creating account */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    <span>Database Storage File</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Pre-named "db"</span>
                </div>

                {savedFileHandleName ? (
                  <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#146C43]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-[#146C43] shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-mono font-bold text-[#146C43] block truncate">
                          {savedFileHandleName}
                        </span>
                        <span className="text-[10px] text-[#146C43]/80 block truncate">
                          Connected & ready to store all backend & frontend data
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handlePickAndSaveFile}
                      className="text-[11px] font-semibold text-[#146C43] hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        placeholder="db"
                        className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-hidden focus:border-[#146C43] focus:bg-white focus:ring-2 focus:ring-[#EBF5F0] transition-all"
                      />
                      <span className="absolute right-3.5 text-xs text-slate-400 font-mono pointer-events-none select-none">
                        .json
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handlePickAndSaveFile}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#146C43]/30 bg-[#EBF5F0] hover:bg-[#DFEFE7] text-[#146C43] text-xs font-medium transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#146C43]" />
                      <span>Choose where to save database file...</span>
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  All your data stays in this single local database file.
                </p>
              </div>

              {/* 3. Operating Currency (USD by default) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Operating Currency
                </label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#146C43] focus:bg-white focus:ring-2 focus:ring-[#EBF5F0] cursor-pointer transition-all appearance-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                  <Coins className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Primary Action Button (Welcoming, authentic money green #146C43) */}
              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {isSaving
                      ? 'Saving database...'
                      : savedFileHandleName
                      ? 'Create Account & Open Ledger'
                      : 'Save Database & Create Account'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Switch to Open Existing */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('open');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#146C43] transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Already have a file? Open existing db</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Open Existing Mode */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-200 hover:border-[#146C43] rounded-xl bg-slate-50/50 hover:bg-[#EBF5F0]/40 text-center cursor-pointer transition-all group"
              >
                <FolderOpen className="w-7 h-7 text-slate-400 group-hover:text-[#146C43] mx-auto mb-2 transition-colors" />
                <span className="block text-xs font-semibold text-slate-800">
                  Click to select your database file
                </span>
                <span className="block text-[11px] text-slate-400 mt-1">
                  Choose your db.json file from your computer
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleOpenExistingFile(file);
                  }}
                  className="hidden"
                />
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('create');
                    setError(null);
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-[#146C43] transition-colors cursor-pointer"
                >
                  ← Back to create a new ledger
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Option (Always in USD) */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center">
            <button
              type="button"
              onClick={handleDemo}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Explore Demo Workspace (USD $)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
