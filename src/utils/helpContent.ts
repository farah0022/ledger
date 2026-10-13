export interface FAQItem {
  id: string;
  category: 'Records' | 'Money' | 'Invoicing' | 'Time' | 'Data & Privacy';
  question: string;
  answer: string;
}

export interface ShortcutItem {
  keys: string[];
  action: string;
}

export interface QuickGuide {
  id: string;
  iconName: string;
  title: string;
  summary: string;
}

export interface HelpStrings {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  noResults: string;
  quickGuides: QuickGuide[];
  shortcuts: ShortcutItem[];
  faqs: FAQItem[];
}

export const ENGLISH_HELP_CONTENT: HelpStrings = {
  title: 'Help Center',
  subtitle: 'Clear guides, workflow references, and shortcuts.',
  searchPlaceholder: 'Search questions, workflows, or shortcuts...',
  noResults: 'No topics found matching your query.',
  quickGuides: [
    {
      id: 'transactions',
      iconName: 'Receipt',
      title: 'Tracking Transactions',
      summary: 'Log Money In, Money Out, or Payments with instant automatic balance calculation and live currency conversion.',
    },
    {
      id: 'invoices',
      iconName: 'FileText',
      title: 'Invoicing & Receipts',
      summary: 'Generate clean invoices with your remittance instructions, tax calculations, and 1-click vector PDF downloads.',
    },
    {
      id: 'time',
      iconName: 'CalendarClock',
      title: 'Schedules & Deadlines',
      summary: 'Payment dates and events automatically sort into Overdue, Today, Tomorrow, and Upcoming timeline views.',
    },
    {
      id: 'vault',
      iconName: 'Database',
      title: 'Data Vault & Privacy',
      summary: '100% offline, local-first JSON vault on your machine. Instant JSON and CSV export/import anytime.',
    },
  ],
  shortcuts: [
    { keys: ['N'], action: 'Open new record modal' },
    { keys: ['F', 'or', '/'], action: 'Focus search bar in Records' },
    { keys: ['H'], action: 'Toggle Privacy Mode (blur balances)' },
    { keys: ['1'], action: 'Switch to Home / Dashboard' },
    { keys: ['2'], action: 'Switch to Records list' },
    { keys: ['3'], action: 'Switch to Money & Balances' },
    { keys: ['4'], action: 'Switch to Time & Schedule' },
    { keys: ['Esc'], action: 'Close any active modal or dialog' },
  ],
  faqs: [
    {
      id: 'add-record',
      category: 'Records',
      question: 'How do I add a new transaction?',
      answer: 'Click "+ New Record" in the sidebar or press N on your keyboard. Select the type (Money In, Money Out, Payment, Note, or Event), specify the amount, currency, and date, then save.',
    },
    {
      id: 'edit-record',
      category: 'Records',
      question: 'How do I edit or delete existing entries?',
      answer: 'In the Records view, click the pencil icon next to any entry to modify details, or the trash icon to delete. Balances and timelines refresh immediately.',
    },
    {
      id: 'multi-currency',
      category: 'Money',
      question: 'How does multi-currency handling work?',
      answer: 'Transactions can be recorded in any world currency. The application applies real-time foreign exchange conversions to standardize and report your net balance in your chosen Reporting Currency.',
    },
    {
      id: 'balance-calc',
      category: 'Money',
      question: 'How is net balance calculated?',
      answer: 'Net cash balance equals Total Money Received minus Total Money Spent. If outflows exceed inflows, the balance displays a deficit with negative formatting.',
    },
    {
      id: 'privacy-mode',
      category: 'Money',
      question: 'How does Privacy Mode work?',
      answer: 'Click "Hide Cash" in the navigation bar or press H. All currency balances and financial sums are blurred. Hovering your cursor over any specific figure temporarily unblurs it for private verification.',
    },
    {
      id: 'download-invoice',
      category: 'Invoicing',
      question: 'How do I create and download an invoice?',
      answer: 'Click the document/invoice icon on any Money In or Payment record. Review line items, payment terms, and remittance instructions, then click "Save PDF" or "Print".',
    },
    {
      id: 'reminders',
      category: 'Time',
      question: 'How does chronological scheduling work?',
      answer: 'Any record with an assigned date appears automatically in the Time view. Items are categorized chronologically as Overdue, Today, Tomorrow, and Upcoming with 1-click completion status.',
    },
    {
      id: 'schedule-payment',
      category: 'Time',
      question: 'How do installment payment plans work?',
      answer: 'When creating a Payment record, open "More options" and enable "Payment plan". Enter your installment amount and frequency; the schedule calculates remaining balances and upcoming installment dates.',
    },
    {
      id: 'data-storage',
      category: 'Data & Privacy',
      question: 'Where is my ledger data stored?',
      answer: 'Data is stored privately on your local disk in your dedicated JSON vault. No third-party servers store or track your finances. The app runs fully offline.',
    },
    {
      id: 'backups',
      category: 'Data & Privacy',
      question: 'How do I back up and restore my data?',
      answer: 'Navigate to Settings → Data & Portability. You can download a complete JSON vault backup, export a CSV spreadsheet, or restore previous JSON/CSV files with 1 click.',
    },
  ],
};

export function getHelpStrings(_languageCode?: string): HelpStrings {
  return ENGLISH_HELP_CONTENT;
}
