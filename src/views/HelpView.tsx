import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { getHelpStrings } from '../utils/helpContent';

interface HelpViewProps {
  language?: string;
  onOpenSettings?: () => void;
}

export const HelpView: React.FC<HelpViewProps> = ({ language = 'en' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const helpData = useMemo(() => getHelpStrings(language), [language]);

  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({
    'add-record': true,
    'balance-calc': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFAQs = useMemo(() => {
    // Filter out any desktop app promotional items per user request
    const baseFaqs = helpData.faqs.filter((f) => f.id !== 'desktop-app');
    if (!searchQuery.trim()) return baseFaqs;
    const q = searchQuery.toLowerCase().trim();
    return baseFaqs.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery, helpData.faqs]);

  return (
    <div id="help-view" className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="border-b border-neutral-200/80 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          {helpData.title}
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          {helpData.subtitle}
        </p>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={helpData.searchPlaceholder}
          className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:border-neutral-900 transition-colors"
        />
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white border border-neutral-200/90 rounded-xl divide-y divide-neutral-100 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {filteredFAQs.length > 0 ? (
          filteredFAQs.map((item) => {
            const isOpen = openItems[item.id] ?? false;
            return (
              <div key={item.id} className="p-4 transition-colors hover:bg-neutral-50/50">
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center justify-between text-left gap-3 cursor-pointer"
                >
                  <div>
                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider block mb-0.5">
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
                  <div className="mt-2.5 text-xs text-neutral-600 leading-relaxed pt-2 border-t border-neutral-100 animate-in fade-in duration-100">
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

      {/* Core Principle Card */}
      <div className="p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-xl text-xs text-neutral-600 space-y-1.5">
        <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-neutral-700" />
          <span>{helpData.principleTitle}</span>
        </h4>
        <p className="leading-relaxed text-[11px] text-neutral-500">
          {helpData.principleBody}
        </p>
      </div>
    </div>
  );
};
