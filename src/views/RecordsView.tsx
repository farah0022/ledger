import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  FileText, 
  Calendar, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Receipt,
  CheckCircle2,
  Circle,
  Image as ImageIcon
} from 'lucide-react';
import { BusinessRecord, BusinessSettings, RecordType, CurrencyRateInfo } from '../types';
import { 
  formatMoney, 
  getDateGroupHeader, 
  parseDate, 
  getTodayStr 
} from '../utils/formatters';
import { exportRecordsToCSV } from '../utils/storage';
import { convertAmount, formatCurrency } from '../utils/currency';
import { ImageLightboxModal } from '../components/ImageLightboxModal';

interface RecordsViewProps {
  records: BusinessRecord[];
  settings: BusinessSettings;
  rateInfo?: CurrencyRateInfo;
  onOpenNewRecord: () => void;
  onEditRecord: (record: BusinessRecord) => void;
  onDeleteRecord: (record: BusinessRecord) => void;
  onCreateInvoice: (record: BusinessRecord) => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  records,
  settings,
  rateInfo,
  onOpenNewRecord,
  onEditRecord,
  onDeleteRecord,
  onCreateInvoice,
}) => {
  const repCurrency = settings.reportingCurrency || settings.defaultCurrency || settings.currency || 'USD';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<RecordType | 'all'>('all');
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  const blurCashClass = settings.privacyMode
    ? 'filter blur-[6px] select-none hover:filter-none transition-[filter] duration-200 cursor-pointer'
    : '';

  // Filter records by search and type
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedType !== 'all' && r.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = (r.title || '').toLowerCase().includes(query);
        const matchesDesc = (r.description || '').toLowerCase().includes(query);
        const matchesClient = (r.clientOrParty || '').toLowerCase().includes(query);
        const matchesAmount = r.amount !== undefined && String(r.amount).includes(query);
        const matchesDate = (r.date || '').includes(query);
        return matchesTitle || matchesDesc || matchesClient || matchesAmount || matchesDate;
      }
      return true;
    });
  }, [records, selectedType, searchQuery]);

  // Group chronologically by date
  const groupedRecords = useMemo(() => {
    const sorted = [...filteredRecords].sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time || '00:00'}`;
      const dateTimeB = `${b.date}T${b.time || '00:00'}`;
      return dateTimeB.localeCompare(dateTimeA);
    });

    const groups: { [dateStr: string]: BusinessRecord[] } = {};
    sorted.forEach((record) => {
      if (!groups[record.date]) {
        groups[record.date] = [];
      }
      groups[record.date].push(record);
    });

    return groups;
  }, [filteredRecords]);

  const dateKeys = Object.keys(groupedRecords);

  const isFiltered = searchQuery.trim() !== '' || selectedType !== 'all';

  const handleExportFilteredCSV = () => {
    if (filteredRecords.length === 0) return;
    const typePart = selectedType !== 'all' ? `-${selectedType}` : '';
    const filename = isFiltered
      ? `records-filtered${typePart}-${getTodayStr()}.csv`
      : `records-export-${getTodayStr()}.csv`;
    exportRecordsToCSV(filteredRecords, filename);
  };

  const openImages = (images: string[], title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxImages(images);
    setLightboxTitle(title);
  };

  return (
    <div id="records-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-150">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFEFED] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#191918]">Records</h1>
          <p className="text-xs text-[#787875] mt-0.5">
            {records.length} total entries
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="export-records-csv-btn"
            onClick={handleExportFilteredCSV}
            disabled={filteredRecords.length === 0}
            className={`px-3.5 py-2 border rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              filteredRecords.length === 0
                ? 'border-[#E8E8E6] bg-[#F5F5F3] text-[#AFAFAF] cursor-not-allowed'
                : 'border-[#D5D5D2] hover:bg-[#F5F5F3] text-[#191918]'
            }`}
            title={
              filteredRecords.length === 0
                ? 'No records match current filter to export'
                : isFiltered
                ? `Export ${filteredRecords.length} filtered record(s) as CSV`
                : 'Export all records as CSV'
            }
          >
            <Download className={`w-3.5 h-3.5 ${filteredRecords.length > 0 ? 'text-[#146C43]' : 'text-[#AFAFAF]'}`} />
            <span>
              {isFiltered ? `Export Filtered CSV (${filteredRecords.length})` : 'Export CSV'}
            </span>
          </button>

          <button
            id="new-record-btn"
            onClick={onOpenNewRecord}
            className="px-4 py-2 bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Record</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#787875]" />
            <input
              type="text"
              placeholder="Search records by title, party, note, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#D5D5D2] rounded-lg text-xs text-[#191918] placeholder:text-[#AFAFAF] focus:outline-hidden focus:border-[#146C43] transition-colors"
            />
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'money_in', label: 'Income' },
              { id: 'money_out', label: 'Expenses' },
              { id: 'payment', label: 'Payments' },
              { id: 'event', label: 'Events' },
              { id: 'note', label: 'Notes' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id as RecordType | 'all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-[#146C43] text-white font-semibold'
                    : 'bg-white border border-[#D5D5D2] text-[#595956] hover:bg-[#F5F5F3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filter Bar Summary */}
        {isFiltered && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8F8F6] border border-[#E8E8E6] rounded-lg px-3.5 py-2 text-xs text-[#595956]">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#146C43] shrink-0" />
              <span>
                Showing <strong className="font-semibold text-[#191918]">{filteredRecords.length}</strong> of {records.length} records
                {selectedType !== 'all' && (
                  <span className="ml-1 text-[#787875]">({selectedType.replace('_', ' ')})</span>
                )}
                {searchQuery.trim() && (
                  <span className="ml-1 text-[#787875]">matching &quot;{searchQuery.trim()}&quot;</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {filteredRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportFilteredCSV}
                  className="text-[11px] font-semibold text-[#146C43] hover:text-[#0F5132] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Download this filtered list as CSV"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                }}
                className="text-[11px] text-[#787875] hover:text-[#191918] cursor-pointer underline decoration-[#D5D5D2] transition-colors"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chronological List of Groups */}
      <div className="space-y-6">
        {dateKeys.length > 0 ? (
          dateKeys.map((dateStr) => {
            const groupRecords = groupedRecords[dateStr];
            const groupHeader = getDateGroupHeader(dateStr);

            return (
              <section key={dateStr} className="space-y-2">
                <div className="sticky top-14 bg-[#FBFBFA]/90 backdrop-blur-xs py-1.5 z-5 flex items-center justify-between border-b border-[#EFEFED]">
                  <h2 className="text-xs font-semibold text-[#787875] uppercase tracking-wider">
                    {groupHeader}
                  </h2>
                  <span className="text-[11px] text-[#AFAFAF]">
                    {groupRecords.length} {groupRecords.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="bg-white border border-[#E8E8E6] rounded-xl divide-y divide-[#F0F0EE] shadow-2xs overflow-hidden">
                  {groupRecords.map((r) => {
                    const isMoneyIn = r.type === 'money_in' || (r.type === 'payment' && r.direction === 'received');
                    const isMoneyOut = r.type === 'money_out' || (r.type === 'payment' && (r.direction === 'paid' || r.direction === 'due'));
                    const isPayment = r.type === 'payment' && r.direction !== 'received' && r.direction !== 'paid' && r.direction !== 'due';
                    const isEvent = r.type === 'event';
                    const hasImages = r.images && r.images.length > 0;

                    return (
                      <div
                        key={r.id}
                        onClick={() => onEditRecord(r)}
                        className="p-3.5 sm:p-4 hover:bg-[#FBFBFA] transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                      >
                        {/* Left Info */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isMoneyIn
                                ? 'bg-[#EBF5F0] text-[#146C43]'
                                : isMoneyOut
                                ? 'bg-[#FEF2F2] text-[#C0392B]'
                                : isPayment
                                ? 'bg-[#F0F4F8] text-[#2C5282]'
                                : isEvent
                                ? 'bg-[#F5F5F3] text-[#595956]'
                                : 'bg-[#F5F5F3] text-[#787875]'
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

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#191918]">
                                {r.title}
                              </span>
                              {r.clientOrParty && (
                                <span className="text-xs text-[#787875]">
                                  · {r.clientOrParty}
                                </span>
                              )}
                              {r.direction === 'due' && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#C0392B]">
                                  Due
                                </span>
                              )}
                              {r.direction === 'expected' && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#EBF5F0] text-[#146C43]">
                                  Expected
                                </span>
                              )}
                              {r.paymentPlan && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F4F8] text-[#2C5282]">
                                  Plan: {formatCurrency(r.paymentPlan.installmentAmount, r.currency || settings.defaultCurrency || 'USD')}/mo
                                </span>
                              )}
                              {r.direction === 'paid' && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#C0392B]">
                                  Paid
                                </span>
                              )}
                              {r.direction === 'received' && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#EBF5F0] text-[#146C43]">
                                  Received
                                </span>
                              )}
                              {r.recurring && r.recurring.frequency !== 'none' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F5F3] text-[#595956]">
                                  Every {r.recurring.dayOfMonth || 25}th
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-[#787875] mt-1 flex-wrap">
                              {r.time && <span className="font-mono">{r.time}</span>}
                              {r.description && (
                                <span className="truncate max-w-xs sm:max-w-md">
                                  {r.description}
                                </span>
                              )}
                            </div>

                            {/* Picture thumbnails if present */}
                            {hasImages && (
                              <div className="flex items-center gap-1.5 mt-2">
                                {r.images!.map((img, imgIdx) => (
                                  <button
                                    key={imgIdx}
                                    type="button"
                                    onClick={(e) => openImages(r.images!, r.title, e)}
                                    className="w-7 h-7 rounded border border-[#E0E0DE] overflow-hidden bg-[#F5F5F3] hover:scale-105 transition-transform cursor-pointer"
                                    title="View picture"
                                  >
                                    <img src={img} alt="Attachment" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                                <span className="text-[10px] text-[#787875] flex items-center gap-0.5 ml-0.5">
                                  <ImageIcon className="w-3 h-3 text-[#146C43]" />
                                  <span>{r.images!.length} photo{r.images!.length > 1 ? 's' : ''}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Amount & Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                          {r.amount !== undefined && (
                            <div className="text-right">
                              <div
                                className={`text-base font-bold font-mono tracking-tight ${blurCashClass} ${
                                  isMoneyIn
                                    ? 'text-[#146C43]'
                                    : isMoneyOut
                                    ? 'text-[#C0392B]'
                                    : 'text-[#191918]'
                                }`}
                                title={settings.privacyMode ? "Hover to reveal" : undefined}
                              >
                                {formatMoney(r.amount, r.currency || settings.defaultCurrency || 'USD', isMoneyOut ? 'minus' : isMoneyIn ? 'plus' : false)}
                              </div>
                              {r.currency && repCurrency && r.currency !== repCurrency && (
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                  ≈ {formatMoney(convertAmount(r.amount, r.currency, repCurrency, rateInfo), repCurrency, isMoneyOut ? 'minus' : isMoneyIn ? 'plus' : false)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick Action buttons */}
                          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {(isMoneyIn || r.type === 'payment') && r.amount && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateInvoice(r);
                                }}
                                className="p-1.5 text-[#787875] hover:text-[#146C43] hover:bg-[#EBF5F0] rounded transition-colors cursor-pointer"
                                title="Create Invoice"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditRecord(r);
                              }}
                              className="p-1.5 text-[#787875] hover:text-[#191918] hover:bg-[#F5F5F3] rounded transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRecord(r);
                              }}
                              className="p-1.5 text-[#787875] hover:text-[#C0392B] hover:bg-[#FEF2F2] rounded transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <div className="py-16 text-center bg-white border border-[#E8E8E6] rounded-xl p-8">
            <p className="text-sm font-medium text-[#191918]">No records found</p>
            <p className="text-xs text-[#787875] mt-1">
              {searchQuery ? 'Try adjusting your search or filters.' : 'Click "+ New Record" to record your first transaction, note, or photo.'}
            </p>
            <button
              onClick={onOpenNewRecord}
              className="mt-4 px-4 py-2 bg-[#146C43] text-white text-xs font-semibold rounded-lg hover:bg-[#0F5132] transition-colors cursor-pointer"
            >
              + New Record
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImages && (
        <ImageLightboxModal
          isOpen={true}
          onClose={() => setLightboxImages(null)}
          images={lightboxImages}
          title={lightboxTitle}
        />
      )}
    </div>
  );
};
