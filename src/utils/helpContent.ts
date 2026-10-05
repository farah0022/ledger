export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface HelpStrings {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  noResults: string;
  principleTitle: string;
  principleBody: string;
  desktopGuideTitle: string;
  desktopGuideBody: string;
  faqs: FAQItem[];
}

export const ENGLISH_HELP_CONTENT: HelpStrings = {
  title: 'Help Center',
  subtitle: 'Practical answers in plain English · No accounting jargon',
  searchPlaceholder: 'Search practical questions (e.g. balance, privacy, database file, invoice)...',
  noResults: 'No answers found matching your search.',
  principleTitle: 'Product Principle',
  principleBody: 'The user enters information once. The software does everything that can logically be calculated, organized, scheduled, remembered, or generated from that information.',
  desktopGuideTitle: 'Privacy & Offline Storage',
  desktopGuideBody: 'All ledger data is stored in your private local database file on your device. The app works fully offline and never sells or leaks your financial numbers.',
  faqs: [
    {
      id: 'privacy-mode',
      category: 'Privacy',
      question: 'How does Privacy Mode work?',
      answer: 'Click "Hide Cash" in the top bar or on the dashboard. When Privacy Mode is enabled, all balances, revenue figures, expenses, and transaction amounts are smoothly blurred with a protective executive filter. Hovering your mouse over any amount temporarily unblurs it so you can verify numbers without bystanders seeing your cash totals.',
    },
    {
      id: 'db-location',
      category: 'System',
      question: 'Where is my ledger database file located?',
      answer: 'When you open or create your ledger, you can choose where the database file is located (such as ./data/business-ledger.json or a custom documents vault). The backend and browser keep this local JSON vault synchronized in real time.',
    },
    {
      id: 'add-record',
      category: 'Records',
      question: 'How do I add a record?',
      answer: 'Click "+ New Record" in the sidebar or navigation bar. Choose whether it is Money In, Money Out, Payment, Note, or Event. Enter the amount or what took place, and click Save.',
    },
    {
      id: 'balance-calc',
      category: 'Money',
      question: 'How is my balance calculated?',
      answer: 'Your balance is calculated automatically from your underlying transactions: Total Money Received (inflows) minus Total Money Spent (outflows). When money spent exceeds money received, your balance accurately reflects a deficit with a minus sign (e.g. - $ 200.00).',
    },
    {
      id: 'schedule-payment',
      category: 'Money & Time',
      question: 'How do I schedule a payment or installment plan?',
      answer: 'Create a "+ New Record" with type "Payment". Enter the total amount and due date. Under "More options", check "Enable payment plan" and set your installment amount (e.g. 3,000 monthly). The app automatically calculates installments and places them into your Time schedule.',
    },
    {
      id: 'reminders',
      category: 'Time',
      question: 'How do reminders and scheduling work?',
      answer: 'Any record with a date automatically appears in Time. In the Time view, commitments are categorized as Overdue, Today, Tomorrow, and Upcoming. You can mark them completed directly with one click or view the source record.',
    },
    {
      id: 'download-invoice',
      category: 'Records',
      question: 'How do I download or print an invoice?',
      answer: 'On any Money In or Payment record in the Records list, click the receipt/invoice icon. The system generates a clean, professional invoice with your optional business name, logo, client name, and payment instructions. Click "Print / Save PDF" to produce a clean document.',
    },
    {
      id: 'calculator',
      category: 'Money',
      question: 'How does the business calculator work?',
      answer: 'Go to the Money view and click "Business Calculator". In addition to standard arithmetic (+, -, ×, ÷, %), you can switch to instant business presets: Discount (calculates savings & final price), Markup (calculates selling price), Margin (calculates profit margin %), and Split (splits amounts). Click "Record this amount" to log the calculated result directly into a new record.',
    },
    {
      id: 'data-storage',
      category: 'System',
      question: 'Where is my data stored?',
      answer: 'All your records, calculations, and settings are stored locally on your device in your secure local JSON database file. The app works fully offline. You can also export a full JSON backup or CSV spreadsheet at any time from Settings.',
    },
    {
      id: 'edit-record',
      category: 'Records',
      question: 'How do I edit or delete a record?',
      answer: 'In the Records list, click the pencil edit icon to update any transaction, or the trash icon to remove it. All connected calculations, balances, graphs, and schedules update instantly.',
    },
    {
      id: 'multi-currency',
      category: 'Money',
      question: 'How do multi-currency conversions work?',
      answer: 'You can enter records in any world currency (USD, EUR, GBP, KES, JPY, CNY, INR, etc.). The system fetches real-time market exchange rates and unifies all balances and reporting into your chosen Reporting Currency with live market rates.',
    },
  ],
};

export function getHelpStrings(_languageCode?: string): HelpStrings {
  return ENGLISH_HELP_CONTENT;
}
