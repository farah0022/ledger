import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Receipt, 
  FileText, 
  CalendarClock, 
  Database, 
  Command, 
  ShieldCheck, 
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getHelpStrings, FAQItem } from '../utils/helpContent';

interface HelpViewProps {
  language?: string;
  onOpenSettings?: () => void;
  onSelectTab?: (tab: any) => void;
}

export const HelpView: React.FC<HelpViewProps> = ({ language = 'en', onOpenSettings }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const helpData = useMemo(() => getHelpStrings(language), [language]);

  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({
    'add-record': true,
    'multi-currency': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = ['All', 'Records', 'Money', 'Invoicing', 'Time', 'Data & Privacy', 'Shortcuts'];

  const filteredFAQs = useMemo(() => {
    let list = helpData.faqs;
    if (selectedCategory !== 'All' && selectedCategory !== 'Shortcuts') {
      list = list.filter((item) => item.category === selectedCategory);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery, selectedCategory, helpData.faqs]);

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return helpData.shortcuts;
    const q = searchQuery.toLowerCase().trim();
    return helpData.shortcuts.filter(
      (s) =>
        s.action.toLowerCase().includes(q) ||
        s.keys.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery, helpData.shortcuts]);

  const getGuideIcon = (name: string) => {
    switch (name) {
      case 'Receipt': return <Receipt className="w-4 h-4 text-[#146C43]" />;
      case 'FileText': return <FileText className="w-4 h-4 text-[#146C43]" />;
      case 'CalendarClock': return <CalendarClock className="w-4 h-4 text-[#146C43]" />;
      case 'Database': return <Database className="w-4 h-4 text-[#146C43]" />;
      default: return <Sparkles className="w-4 h-4 text-[#146C43]" />;
    }
  };

  return (
    <div id="help-view" className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="border-b border-neutral-200/70 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          {helpData.title}
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          {helpData.subtitle}
        </p>
      </div>

      {/* Quick Workflows Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {helpData.quickGuides.map((guide) => (
          <div
            key={guide.id}
            className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-1.5 hover:border-neutral-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#EBF5F0] rounded-lg">
                {getGuideIcon(guide.iconName)}
              </div>
              <h3 className="text-xs font-semibold text-neutral-900">
                {guide.title}
              </h3>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              {guide.summary}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={helpData.searchPlaceholder}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-neutral-200/90 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:border-[#146C43] focus:ring-2 focus:ring-[#146C43]/15 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyboard Shortcuts Section (Show when category is 'All' or 'Shortcuts') */}
      {(selectedCategory === 'All' || selectedCategory === 'Shortcuts') && (
        <section className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <Command className="w-4 h-4 text-[#146C43]" />
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Keyboard Shortcuts
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {filteredShortcuts.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50/70 border border-neutral-100">
                <span className="text-[11px] text-neutral-600 font-medium">{s.action}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {s.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-mono font-semibold text-neutral-800 shadow-2xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Accordion Section */}
      {selectedCategory !== 'Shortcuts' && (
        <div className="bg-white border border-neutral-200/80 rounded-2xl divide-y divide-neutral-100 overflow-hidden shadow-xs">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((item) => {
              const isOpen = openItems[item.id] ?? false;
              return (
                <div key={item.id} className="p-4 transition-colors hover:bg-neutral-50/40">
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between text-left gap-3 cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-[#146C43] tracking-wide block mb-0.5">
                        {item.category}
                      </span>
                      <h3 className="text-xs font-semibold text-neutral-900">
                        {item.question}
                      </h3>
                    </div>

                    <div className="p-1 text-neutral-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-2.5 text-xs text-neutral-600 leading-relaxed pt-2 border-t border-neutral-100">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-neutral-400">
              {helpData.noResults}
            </div>
          )}
        </div>
      )}

      {/* Data Security Guarantee Footer */}
      <div className="p-4 bg-[#EBF5F0]/60 border border-[#146C43]/20 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-[#146C43] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-[#146C43]">Private &amp; Local Storage Guarantee</div>
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            Your records stay stored locally on your device. Zero cloud tracking, no telemetries, and complete data ownership.
          </p>
        </div>
      </div>
    </div>
  );
};
