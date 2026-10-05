import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Coins, 
  CalendarClock, 
  HelpCircle, 
  Settings as SettingsIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { BusinessSettings, UserAccount } from '../types';
import { useI18n } from '../utils/i18n';
import { BrandLogo } from './BrandLogo';

export type NavTab = 'home' | 'records' | 'money' | 'time' | 'help' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenNewRecord: () => void;
  onSignOut?: () => void;
  currentUser?: UserAccount | null;
  settings: BusinessSettings;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewRecord,
  onSignOut,
  settings,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { t } = useI18n(settings.language);

  const primaryNavItems: Array<{ id: NavTab; label: string; icon: React.ElementType }> = [
    { id: 'home', label: t('nav.home') || 'Home', icon: LayoutDashboard },
    { id: 'records', label: t('nav.records') || 'Records', icon: FileText },
    { id: 'money', label: t('nav.money') || 'Money', icon: Coins },
    { id: 'time', label: t('nav.time') || 'Time', icon: CalendarClock },
  ];

  const hasBrand = !!((settings.businessLogo && settings.businessLogo.trim()) || (settings.businessName && settings.businessName.trim()));

  return (
    <aside
      id="app-sidebar"
      style={{ width: isCollapsed ? 68 : 220 }}
      className="hidden md:flex flex-col border-r border-neutral-200/80 bg-white h-screen sticky top-0 z-20 select-none overflow-hidden transition-[width] duration-150 ease-out"
    >
      {/* Top Area - Brand Logo (only if configured in settings) & Collapse Button */}
      <div className={`h-14 flex items-center px-3 border-b border-neutral-100 shrink-0 ${
        isCollapsed && !hasBrand ? 'justify-center' : 'justify-between'
      }`}>
        {!isCollapsed ? (
          hasBrand ? (
            <BrandLogo
              logoUrl={settings.businessLogo}
              businessName={settings.businessName}
              size="sm"
              variant="compact"
              className="truncate max-w-[145px]"
            />
          ) : (
            <div className="text-xs font-semibold text-neutral-800 tracking-tight pl-1 select-none">
              Records Money Time
            </div>
          )
        ) : (
          hasBrand ? (
            <div className="mx-auto">
              <BrandLogo
                logoUrl={settings.businessLogo}
                businessName={settings.businessName}
                size="xs"
                variant="icon"
              />
            </div>
          ) : null
        )}
        <button
          id="toggle-collapse-btn"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action Button */}
      <div className="p-3 shrink-0">
        <button
          id="sidebar-new-record-btn"
          onClick={onOpenNewRecord}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer ${
            isCollapsed ? 'px-0' : 'px-3'
          }`}
          title="New Record"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">New Record</span>}
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="px-3 py-1 space-y-0.5 flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-neutral-100 text-neutral-900 font-medium'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-700'}`} />
              
              {!isCollapsed && (
                <span className="whitespace-nowrap truncate">{item.label}</span>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md shadow-md whitespace-nowrap hidden group-hover:flex items-center z-50 pointer-events-none">
                  <span>{item.label}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Area: Help & Settings */}
      <div className="p-3 border-t border-neutral-100 space-y-0.5 shrink-0">
        <button
          id="nav-help"
          onClick={() => onSelectTab('help')}
          className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
            currentTab === 'help'
              ? 'bg-neutral-100 text-neutral-900 font-medium'
              : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <HelpCircle className={`w-4 h-4 shrink-0 ${currentTab === 'help' ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-700'}`} />
          {!isCollapsed && <span className="whitespace-nowrap truncate">{t('nav.help') || 'Help'}</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md shadow-md whitespace-nowrap hidden group-hover:flex items-center z-50 pointer-events-none">
              <span>{t('nav.help') || 'Help'}</span>
            </div>
          )}
        </button>

        <button
          id="nav-settings"
          onClick={() => onSelectTab('settings')}
          className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
            currentTab === 'settings'
              ? 'bg-neutral-100 text-neutral-900 font-medium'
              : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <SettingsIcon className={`w-4 h-4 shrink-0 ${currentTab === 'settings' ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-700'}`} />
          {!isCollapsed && <span className="whitespace-nowrap truncate">{t('nav.settings') || 'Settings'}</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md shadow-md whitespace-nowrap hidden group-hover:flex items-center z-50 pointer-events-none">
              <span>{t('nav.settings') || 'Settings'}</span>
            </div>
          )}
        </button>

        {onSignOut && (
          <button
            id="sidebar-signout-btn"
            onClick={onSignOut}
            className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left text-neutral-400 hover:text-red-700 hover:bg-red-50/60 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-red-600" />
            {!isCollapsed && <span className="whitespace-nowrap truncate">Sign Out</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md shadow-md whitespace-nowrap hidden group-hover:flex items-center z-50 pointer-events-none">
                <span>Sign Out</span>
              </div>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
