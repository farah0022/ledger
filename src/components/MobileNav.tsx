import React from 'react';
import { LayoutDashboard, FileText, Plus, Coins, CalendarClock } from 'lucide-react';
import { NavTab } from './Sidebar';
import { SupportedLanguage } from '../types';
import { useI18n } from '../utils/i18n';

interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenNewRecord: () => void;
  language?: SupportedLanguage | string;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewRecord,
  language = 'en',
}) => {
  const { t } = useI18n(language);

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#FFFFFF] border-t border-[#E8E8E6] flex items-center justify-around px-2 z-30 select-none pb-safe"
    >
      <button
        id="mobile-nav-home"
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg cursor-pointer ${
          currentTab === 'home' ? 'text-[#146C43]' : 'text-[#787875]'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">{t('nav.home')}</span>
      </button>

      <button
        id="mobile-nav-records"
        onClick={() => onSelectTab('records')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg cursor-pointer ${
          currentTab === 'records' ? 'text-[#146C43]' : 'text-[#787875]'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">{t('nav.records')}</span>
      </button>

      {/* Prominent Thumb-Friendly Center Button */}
      <button
        id="mobile-nav-record-btn"
        onClick={onOpenNewRecord}
        className="w-12 h-12 -mt-4 rounded-full bg-[#146C43] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
        aria-label="New Record"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      <button
        id="mobile-nav-money"
        onClick={() => onSelectTab('money')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg cursor-pointer ${
          currentTab === 'money' ? 'text-[#146C43]' : 'text-[#787875]'
        }`}
      >
        <Coins className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">{t('nav.money')}</span>
      </button>

      <button
        id="mobile-nav-time"
        onClick={() => onSelectTab('time')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg cursor-pointer ${
          currentTab === 'time' ? 'text-[#146C43]' : 'text-[#787875]'
        }`}
      >
        <CalendarClock className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">{t('nav.time')}</span>
      </button>
    </nav>
  );
};
