import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowDownLeft, ArrowUpRight, Clock, FileText, Calendar, ArrowRight } from 'lucide-react';
import { BusinessRecord } from '../types';
import { formatMoney, formatDisplayDate } from '../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BusinessRecord[];
  currency: string;
  onSelectRecord: (record: BusinessRecord) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  records,
  currency,
  onSelectRecord,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  const filteredRecords = query.trim()
    ? records.filter((r) => {
        const titleMatch = (r.title || '').toLowerCase().includes(normalizedQuery);
        const descMatch = (r.description || '').toLowerCase().includes(normalizedQuery);
        const clientMatch = (r.clientOrParty || '').toLowerCase().includes(normalizedQuery);
        const dateMatch = (r.date || '').includes(normalizedQuery);
        const amountMatch = r.amount !== undefined && String(r.amount).includes(normalizedQuery);
        const invoiceMatch = (r.invoiceNumber || '').toLowerCase().includes(normalizedQuery);
        const typeMatch = r.type.replace('_', ' ').toLowerCase().includes(normalizedQuery);
        return titleMatch || descMatch || clientMatch || dateMatch || amountMatch || invoiceMatch || typeMatch;
      })
    : records.slice(0, 8); // Show recent items when query is empty

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 z-50 animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="search-modal-dialog"
        className="bg-[#FFFFFF] w-full max-w-xl rounded-xl shadow-2xl border border-[#E8E8E6] overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#F0F0EE] gap-3">
          <Search className="w-5 h-5 text-[#787875] shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search records, amounts, dates, notes, clients..."
            className="flex-1 bg-transparent text-sm text-[#191918] placeholder-[#90908C] outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#787875] hover:text-[#191918] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F5F5F3] text-[#787875]">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F5F5F3]">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((r) => {
              const isMoneyIn = r.type === 'money_in' || (r.type === 'payment' && r.direction === 'received');
              const isMoneyOut = r.type === 'money_out' || (r.type === 'payment' && (r.direction === 'paid' || r.direction === 'due'));
              const isPayment = r.type === 'payment' && r.direction !== 'received' && r.direction !== 'paid' && r.direction !== 'due';
              const isEvent = r.type === 'event';

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    onSelectRecord(r);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F9F9F8] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isMoneyIn
                          ? 'bg-[#EBF5F0] text-[#146C43]'
                          : isMoneyOut
                          ? 'bg-[#FDF2F2] text-[#C0392B]'
                          : isPayment
                          ? 'bg-[#F0F4F8] text-[#2C5282]'
                          : 'bg-[#F5F5F3] text-[#595956]'
                      }`}
                    >
                      {isMoneyIn ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : isMoneyOut ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : isPayment ? (
                        <Clock className="w-4 h-4" />
                      ) : isEvent ? (
                        <Calendar className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    <div className="truncate">
                      <div className="text-sm font-medium text-[#191918] truncate flex items-center gap-2">
                        <span>{r.title}</span>
                        {r.clientOrParty && (
                          <span className="text-xs text-[#787875] font-normal">
                            · {r.clientOrParty}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#787875] flex items-center gap-2 mt-0.5">
                        <span>{formatDisplayDate(r.date, { short: true })}</span>
                        {r.time && <span>{r.time}</span>}
                        {r.description && <span className="truncate">· {r.description}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {r.amount !== undefined && (
                      <span
                        className={`text-sm font-semibold font-mono ${
                          isMoneyIn
                            ? 'text-[#146C43]'
                            : isMoneyOut
                            ? 'text-[#C0392B]'
                            : 'text-[#191918]'
                        }`}
                      >
                        {formatMoney(r.amount, r.currency || currency, isMoneyOut ? 'minus' : isMoneyIn ? 'plus' : false)}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-[#A0A09C] group-hover:text-[#191918] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-[#787875]">
              No records found matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
