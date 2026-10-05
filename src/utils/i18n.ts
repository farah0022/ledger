export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  direction?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', direction: 'ltr' },
];

export function isRTL(_langCode?: string): boolean {
  return false;
}

export function detectBrowserLanguage(): string {
  return 'en';
}

// Clean English canonical string lookup
const ENGLISH_STRINGS: Record<string, string> = {
  // Nav
  'nav.home': 'Home',
  'nav.records': 'Records',
  'nav.money': 'Money',
  'nav.time': 'Time',
  'nav.help': 'Help',
  'nav.settings': 'Settings',
  'nav.record': 'New Record',
  'nav.newRecord': 'New Record',
  'nav.search': 'Search',
  'nav.calculator': 'Calculator',
  'nav.taxStatements': 'Tax Statements',
  'nav.demo': 'Demo Account',
  'nav.account': 'Account',

  // Greetings & Attention
  'home.greetingMorning': 'Good morning',
  'home.greetingAfternoon': 'Good afternoon',
  'home.greetingEvening': 'Good evening',
  'home.attention': 'Needs Attention',
  'home.attentionEmpty': 'All scheduled commitments and payments are up to date.',
  'home.today': 'Today',
  'home.upcoming': 'Upcoming',
  'home.quickRecord': 'New Record',
  'home.viewMoney': 'View money',
  'home.viewTime': 'View time',

  // Money
  'money.received': 'Received',
  'money.spent': 'Spent',
  'money.balance': 'Actual Balance',
  'money.expected': 'Expected',
  'money.due': 'Due',
  'money.net': 'Net Position',
  'money.openCalc': 'Quick Calculator',
  'money.timeRange': 'Range',
  'money.all': 'All',

  // Time
  'time.memory': 'Memory & Agenda',
  'time.calendar': 'Calendar',
  'time.plans': 'Payment Plans',
  'time.overdue': 'Overdue',
  'time.tomorrow': 'Tomorrow',
  'time.completed': 'Completed',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.back': 'Back',
  'common.export': 'Export',
  'common.import': 'Import',
  'common.search': 'Search...',
  'common.filter': 'Filter',
  'common.clear': 'Clear',
  'common.done': 'Done',
  'common.pending': 'Pending',
};

export function useI18n(_languageCode?: string) {
  const t = (key: string, fallback?: string): string => {
    return ENGLISH_STRINGS[key] || fallback || key;
  };

  return {
    t,
    currentLanguage: 'en',
    isRtl: false,
  };
}
