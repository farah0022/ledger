import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for receipt images and backups
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// CORS & Security headers
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Handle preflight requests
app.options('*', (_req, res) => {
  res.sendStatus(204);
});

// Local file-based persistence for robust backend storage
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface StoredDatabase {
  records: any[];
  settings: any;
  user: any;
  updatedAt: string;
}

const DEFAULT_SETTINGS = {
  businessName: '',
  businessLogo: '',
  showHeaderBrand: true,
  timezone: 'UTC',
  locationName: '',
  defaultCurrency: 'USD',
  reportingCurrency: 'USD',
  currencyPosition: 'prefix',
  language: 'en',
  privacyMode: false,
  databaseLocation: './data/db.json',
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

function getInitialSampleRecords(): any[] {
  const today = new Date().toISOString().split('T')[0];
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
      isCompleted: true,
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
      isCompleted: true,
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
      date: today,
      isCompleted: false,
      clientOrParty: 'Meridian Capital Partners',
      createdAt: `${today}T09:00:00Z`,
      updatedAt: `${today}T09:00:00Z`,
    },
  ];
}

function loadDatabase(): StoredDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.records)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read existing database file, initializing defaults:', err);
  }

  const initial: StoredDatabase = {
    records: getInitialSampleRecords(),
    settings: DEFAULT_SETTINGS,
    user: {
      id: 'usr-default-01',
      name: 'Owner',
      isDemo: false,
      storageMode: 'local',
      createdAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write initial database file:', err);
  }

  return initial;
}

function saveDatabase(db: StoredDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// Initialize in-memory cache from database file
let inMemoryDB = loadDatabase();

// Baseline fallback exchange rates against 1 USD
const BASELINE_RATES: Record<string, number> = {
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

interface RateCache {
  base: string;
  rates: Record<string, number>;
  lastUpdated: string;
  source: string;
  timestamp: number;
}

let cachedRates: RateCache = {
  base: 'USD',
  rates: BASELINE_RATES,
  lastUpdated: new Date().toISOString(),
  source: 'Baseline Financial Reference',
  timestamp: 0,
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchLatestRatesFromUpstream(): Promise<RateCache> {
  const now = Date.now();
  if (cachedRates.timestamp > 0 && now - cachedRates.timestamp < CACHE_TTL_MS) {
    return cachedRates;
  }

  // Attempt primary real-time API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates === 'object') {
        const merged = { ...BASELINE_RATES, ...data.rates };
        cachedRates = {
          base: 'USD',
          rates: merged,
          lastUpdated: new Date().toISOString(),
          source: 'Open Exchange Rate Network (Live)',
          timestamp: now,
        };
        return cachedRates;
      }
    }
  } catch (err) {
    console.warn('Primary exchange rates upstream failed, trying backup...', err);
  }

  // Secondary fallback real-time API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates === 'object') {
        const merged = { ...BASELINE_RATES, ...data.rates };
        cachedRates = {
          base: 'USD',
          rates: merged,
          lastUpdated: new Date().toISOString(),
          source: 'ExchangeRate API (Live)',
          timestamp: now,
        };
        return cachedRates;
      }
    }
  } catch (err) {
    console.warn('Secondary exchange rates upstream failed:', err);
  }

  cachedRates.timestamp = now;
  return cachedRates;
}

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    recordCount: inMemoryDB.records.length,
    port: PORT,
  });
});

// Database file info endpoint
app.get('/api/database/info', (_req, res) => {
  res.json({
    databaseFile: DB_FILE,
    relativeLocation: inMemoryDB.settings?.databaseLocation || './data/db.json',
    recordCount: inMemoryDB.records.length,
    updatedAt: inMemoryDB.updatedAt,
    storageType: 'Local JSON File',
  });
});

// Records CRUD Endpoints
app.get('/api/records', (_req, res) => {
  res.json(inMemoryDB.records);
});

app.post('/api/records', (req, res) => {
  const records = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Body must be an array of records' });
  }
  inMemoryDB.records = records;
  saveDatabase(inMemoryDB);
  return res.json({ success: true, count: inMemoryDB.records.length });
});

app.post('/api/records/item', (req, res) => {
  const record = req.body;
  if (!record || typeof record !== 'object') {
    return res.status(400).json({ error: 'Invalid record body' });
  }
  const id = record.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const newRecord = {
    ...record,
    id,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
  inMemoryDB.records = [newRecord, ...inMemoryDB.records];
  saveDatabase(inMemoryDB);
  return res.status(201).json(newRecord);
});

app.put('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;
  const idx = inMemoryDB.records.findIndex((r) => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }
  inMemoryDB.records[idx] = {
    ...inMemoryDB.records[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveDatabase(inMemoryDB);
  return res.json(inMemoryDB.records[idx]);
});

app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = inMemoryDB.records.length;
  inMemoryDB.records = inMemoryDB.records.filter((r) => r.id !== id);
  saveDatabase(inMemoryDB);
  return res.json({ success: true, deleted: inMemoryDB.records.length < initialLen });
});

// Settings Endpoints
app.get('/api/settings', (_req, res) => {
  res.json(inMemoryDB.settings || DEFAULT_SETTINGS);
});

app.post('/api/settings', (req, res) => {
  const updated = req.body;
  if (!updated || typeof updated !== 'object') {
    return res.status(400).json({ error: 'Invalid settings body' });
  }
  inMemoryDB.settings = { ...inMemoryDB.settings, ...updated };
  saveDatabase(inMemoryDB);
  return res.json(inMemoryDB.settings);
});

// Reset Endpoint
app.post('/api/reset', (_req, res) => {
  inMemoryDB = {
    records: getInitialSampleRecords(),
    settings: DEFAULT_SETTINGS,
    user: {
      id: 'usr-default-01',
      name: 'Owner',
      isDemo: false,
      storageMode: 'local',
      createdAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  saveDatabase(inMemoryDB);
  return res.json({ success: true, message: 'Reset to sample data' });
});

// Currency Rates Endpoint
app.get('/api/rates', async (req, res) => {
  try {
    const rateData = await fetchLatestRatesFromUpstream();
    const requestedBase = typeof req.query.base === 'string' ? req.query.base.toUpperCase() : 'USD';

    if (requestedBase === 'USD' || !rateData.rates[requestedBase]) {
      return res.json({
        base: 'USD',
        rates: rateData.rates,
        lastUpdated: rateData.lastUpdated,
        source: rateData.source,
        isStale: false,
      });
    }

    const baseToUsd = rateData.rates[requestedBase];
    const rebasedRates: Record<string, number> = {};
    for (const [code, rate] of Object.entries(rateData.rates)) {
      rebasedRates[code] = rate / baseToUsd;
    }

    return res.json({
      base: requestedBase,
      rates: rebasedRates,
      lastUpdated: rateData.lastUpdated,
      source: `${rateData.source} (rebased)`,
      isStale: false,
    });
  } catch (error) {
    console.error('Error serving currency rates:', error);
    return res.status(500).json({
      base: 'USD',
      rates: BASELINE_RATES,
      lastUpdated: new Date().toISOString(),
      source: 'Local Fallback',
      isStale: true,
      error: 'Failed to fetch live rates',
    });
  }
});

// Currency Converter Endpoint
app.get('/api/convert', async (req, res) => {
  try {
    const from = (req.query.from as string || 'USD').toUpperCase();
    const to = (req.query.to as string || 'USD').toUpperCase();
    const amount = parseFloat(req.query.amount as string) || 0;

    const rateData = await fetchLatestRatesFromUpstream();
    const fromRate = rateData.rates[from] || BASELINE_RATES[from] || 1;
    const toRate = rateData.rates[to] || BASELINE_RATES[to] || 1;

    const converted = (amount / fromRate) * toRate;
    const rate = toRate / fromRate;

    return res.json({
      from,
      to,
      amount,
      rate,
      converted: Math.round(converted * 100) / 100,
      lastUpdated: rateData.lastUpdated,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Conversion error' });
  }
});

// Full-stack Vite dev middleware & production static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Could not mount Vite dev middleware, serving static dist if available:', err);
      const distPath = path.resolve(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
