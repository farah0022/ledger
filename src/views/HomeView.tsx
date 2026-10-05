import React, { useMemo } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  ArrowRight,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { BusinessRecord, BusinessSettings, TimeItem, CurrencyRateInfo } from '../types';
import { 
  formatMoney, 
  formatDisplayDate, 
  getTodayStr, 
  deriveTimeItemsFromRecord 
} from '../utils/formatters';
import { convertAmount, formatCurrency } from '../utils/currency';
import { useI18n } from '../utils/i18n';
import { NavTab } from '../components/Sidebar';

interface HomeViewProps {
  records: BusinessRecord[];
  settings: BusinessSettings;
  rateInfo?: CurrencyRateInfo;
  onNavigate: (tab: NavTab) => void;
  onOpenNewRecord: () => void;
  onOpenAccountModal?: () => void;
  onSelectRecord: (record: BusinessRecord) => void;
  onToggleTimeComplete: (timeItem: TimeItem) => void;
  onUpdateSettings?: (settings: Partial<BusinessSettings>) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  records,
  settings,
  rateInfo,
  onNavigate,
  onOpenNewRecord,
  onOpenAccountModal,
  onSelectRecord,
  onToggleTimeComplete,
  onUpdateSettings,
}) => {
  const { t } = useI18n(settings.language);
  const repCurrency = settings.reportingCurrency || settings.defaultCurrency || settings.currency || 'USD';
  const todayStr = getTodayStr();

  // Dynamic greeting based on current local hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const blurCashClass = settings.privacyMode
    ? 'filter blur-[7px] select-none hover:filter-none transition-[filter] duration-200 cursor-pointer'
    : '';
  const blurCashInlineClass = settings.privacyMode
    ? 'filter blur-[5px] select-none hover:filter-none transition-[filter] duration-200 cursor-pointer'
    : '';

  // Calculate Money totals across all records with full accounting precision
  const { totalReceived, totalSpent, totalExpected, totalDue, currentBalance, projectedNet } = useMemo(() => {
    let rec = 0;
    let sp = 0;
    let exp = 0;
    let du = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const amt = r.amount || 0;
      const converted = convertAmount(amt, r.currency || 'USD', repCurrency, rateInfo);

      if (r.type === 'money_in') {
        rec += converted;
      } else if (r.type === 'money_out') {
        sp += converted;
      } else if (r.type === 'payment') {
        if (r.paymentPlan) {
          const totalPlan = r.paymentPlan.totalAmount || amt;
          const paidPart = r.paymentPlan.paidAmount || 0;
          const unpaidPart = Math.max(0, totalPlan - paidPart);

          const convertedPaid = convertAmount(paidPart, r.currency || 'USD', repCurrency, rateInfo);
          const convertedUnpaid = convertAmount(unpaidPart, r.currency || 'USD', repCurrency, rateInfo);

          if (r.direction === 'received' || r.direction === 'expected') {
            rec += convertedPaid;
            if (!r.isCompleted && unpaidPart > 0) {
              exp += convertedUnpaid;
            }
          } else {
            // due or paid
            sp += convertedPaid;
            if (!r.isCompleted && unpaidPart > 0) {
              du += convertedUnpaid;
            }
          }
        } else {
          // Standard payment
          if (r.direction === 'received') {
            rec += converted;
          } else if (r.direction === 'paid') {
            sp += converted;
          } else if (r.direction === 'expected') {
            if (r.isCompleted) {
              // Once marked completed, expected receivable is received
              rec += converted;
            } else {
              exp += converted;
            }
          } else if (r.direction === 'due') {
            if (r.isCompleted) {
              // Once marked completed, due payable is paid
              sp += converted;
            } else {
              du += converted;
            }
          }
        }
      }
    }

    const actual = rec - sp;
    const projected = actual + exp - du;

    return {
      totalReceived: rec,
      totalSpent: sp,
      totalExpected: exp,
      totalDue: du,
      currentBalance: actual,
      projectedNet: projected,
    };
  }, [records, repCurrency, rateInfo]);

  // Derive all Time items from records (memoized)
  const { todayItems, pendingTodayItems, completedTodayItems } = useMemo(() => {
    const allItems: TimeItem[] = [];
    for (let i = 0; i < records.length; i++) {
      allItems.push(...deriveTimeItemsFromRecord(records[i]));
    }
    const tItems = allItems.filter((t) => t.date === todayStr);
    return {
      todayItems: tItems,
      pendingTodayItems: tItems.filter((t) => !t.isCompleted),
      completedTodayItems: tItems.filter((t) => t.isCompleted),
    };
  }, [records, todayStr]);

  // Recent records (chronological, last 6, memoized)
  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => (b.date + (b.time || '00:00')).localeCompare(a.date + (a.time || '00:00')))
      .slice(0, 6);
  }, [records]);

  return (
    <div id="home-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-[#EFEFED] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191918]">
            {greeting}
          </h1>
          <p className="text-sm font-medium text-[#787875] mt-1">
            {formatDisplayDate(todayStr)}
            {settings.businessName?.trim() ? ` · ${settings.businessName.trim()}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="home-quick-record-btn"
            onClick={onOpenNewRecord}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Record</span>
          </button>
        </div>
      </div>

      {/* 1. MONEY SECTION (Clear, quiet summary) */}
      <section id="home-money-section">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#787875] flex items-center gap-2">
            <span>Money</span>
            <span className="text-[10px] text-[#9A9A96] font-normal lowercase">in {repCurrency}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (onUpdateSettings) {
                  onUpdateSettings({ privacyMode: !settings.privacyMode });
                }
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                settings.privacyMode
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent'
              }`}
              title={settings.privacyMode ? "Privacy mode active: balances blurred. Click to reveal" : "Hide cash balances from bystanders"}
            >
              {settings.privacyMode ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>{settings.privacyMode ? 'Cash Hidden' : 'Hide Cash'}</span>
            </button>

            <button
              onClick={() => onNavigate('money')}
              className="text-xs font-medium text-[#146C43] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Money</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-[#F0F0EE] grid grid-cols-1 sm:grid-cols-3">
          {/* Received */}
          <div className="pb-4 sm:pb-0 sm:pr-5 flex flex-col justify-between">
            <div className="text-xs text-[#787875] font-medium h-4 flex items-center">Money Received</div>
            <div className="my-2 h-9 sm:h-10 flex items-baseline overflow-hidden">
              <span
                className={`text-2xl sm:text-3xl font-bold text-[#146C43] font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${blurCashClass}`}
                title={settings.privacyMode ? "Hover to reveal" : undefined}
              >
                {formatMoney(totalReceived, repCurrency)}
              </span>
            </div>
            <div className="h-4 text-[11px] text-[#787875] flex items-center truncate">
              {totalExpected > 0 ? (
                <span className={blurCashInlineClass}>+ {formatMoney(totalExpected, repCurrency)} expected</span>
              ) : (
                <span className="text-[#A0A09C]">Inflows recorded</span>
              )}
            </div>
          </div>

          {/* Spent */}
          <div className="py-4 sm:py-0 sm:px-5 flex flex-col justify-between">
            <div className="text-xs text-[#787875] font-medium h-4 flex items-center">Money Spent</div>
            <div className="my-2 h-9 sm:h-10 flex items-baseline overflow-hidden">
              <span
                className={`text-2xl sm:text-3xl font-bold text-[#C0392B] font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${blurCashClass}`}
                title={settings.privacyMode ? "Hover to reveal" : undefined}
              >
                {formatMoney(totalSpent, repCurrency)}
              </span>
            </div>
            <div className="h-4 text-[11px] text-[#787875] flex items-center truncate">
              {totalDue > 0 ? (
                <span className={blurCashInlineClass}>{formatMoney(totalDue, repCurrency)} due</span>
              ) : (
                <span className="text-[#A0A09C]">Outflows recorded</span>
              )}
            </div>
          </div>

          {/* Current Balance */}
          <div className="pt-4 sm:pt-0 sm:pl-5 flex flex-col justify-between">
            <div className="text-xs text-[#787875] font-medium h-4 flex items-center">Actual Balance</div>
            <div className="my-2 h-9 sm:h-10 flex items-baseline overflow-hidden">
              <span
                className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${
                  currentBalance > 0
                    ? 'text-[#146C43]'
                    : currentBalance < 0
                    ? 'text-[#C0392B]'
                    : 'text-[#191918]'
                } ${blurCashClass}`}
                title={settings.privacyMode ? "Hover to reveal" : undefined}
              >
                {formatMoney(currentBalance, repCurrency)}
              </span>
            </div>
            <div className="h-4 text-[11px] text-[#787875] flex items-center truncate">
              Received − Spent
            </div>
          </div>
        </div>

        {/* Projected Position summary */}
        {(totalExpected > 0 || totalDue > 0) && (
          <div className="mt-2.5 px-4 py-2 bg-neutral-50/80 border border-neutral-200/70 rounded-lg flex items-center justify-between text-xs text-neutral-600">
            <span className="text-[11px] font-medium text-neutral-500">
              Projected Net Position (after pending receivables & bills):
            </span>
            <span className={`font-mono font-semibold text-xs ${blurCashInlineClass} ${
              projectedNet >= 0 ? 'text-neutral-900' : 'text-[#C0392B]'
            }`}>
              {formatMoney(projectedNet, repCurrency)}
            </span>
          </div>
        )}
      </section>

      {/* 2. TODAY SECTION (What matters today) */}
      <section id="home-today-section">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#787875]">
            {t('home.today')}
          </div>
          <button
            onClick={() => onNavigate('time')}
            className="text-xs font-medium text-[#146C43] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t('home.viewTime')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-2xs">
          {todayItems.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs text-[#787875] pb-2 border-b border-[#F5F5F3] flex items-center gap-2">
                <span>
                  {pendingTodayItems.length === 0
                    ? 'All scheduled commitments for today are completed'
                    : `${pendingTodayItems.length} item${pendingTodayItems.length > 1 ? 's' : ''} require attention`}
                </span>
              </div>

              <div className="divide-y divide-[#F5F5F3]">
                {todayItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm first:pt-0 last:pb-0 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onToggleTimeComplete(item)}
                        className="text-[#787875] hover:text-[#146C43] cursor-pointer shrink-0 transition-colors"
                        title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-[#146C43]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#90908C]" />
                        )}
                      </button>

                      <div className="truncate">
                        <span
                          className={`font-medium truncate block ${
                            item.isCompleted ? 'line-through text-[#90908C]' : 'text-[#191918]'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.time && (
                          <span className="text-xs text-[#787875] block mt-0.5">
                            {item.time}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {item.amount !== undefined && (
                        <span className="font-semibold text-xs font-mono text-[#191918]">
                          {formatCurrency(item.amount, item.currency || repCurrency)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#787875]">
              No commitments scheduled for today. All quiet.
            </div>
          )}
        </div>
      </section>

      {/* 3. RECENT ACTIVITY (What happened recently) */}
      <section id="home-recent-section">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#787875]">
            Recent Activity
          </div>
          <button
            onClick={() => onNavigate('records')}
            className="text-xs font-medium text-[#146C43] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t('home.viewRecords')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white border border-[#E8E8E6] rounded-xl shadow-2xs divide-y divide-[#F5F5F3] overflow-hidden">
          {recentRecords.map((r) => {
            const isMoneyIn = r.type === 'money_in' || (r.type === 'payment' && r.direction === 'received');
            const isMoneyOut = r.type === 'money_out' || (r.type === 'payment' && (r.direction === 'paid' || r.direction === 'due'));
            const isPayment = r.type === 'payment';
            const itemCurrency = r.currency || repCurrency;

            return (
              <div
                key={r.id}
                onClick={() => onSelectRecord(r)}
                className="p-4 flex items-center justify-between gap-4 hover:bg-[#FDFCFB] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isMoneyIn
                        ? 'bg-[#EBF5F0] text-[#146C43]'
                        : isMoneyOut
                        ? 'bg-[#FEF2F2] text-[#C0392B]'
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
                    ) : (
                      <Calendar className="w-4 h-4" />
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
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {r.amount !== undefined ? (
                    <div>
                      <div
                        className={`text-sm font-bold font-mono ${blurCashInlineClass} ${
                          isMoneyIn
                            ? 'text-[#146C43]'
                            : isMoneyOut
                            ? 'text-[#C0392B]'
                            : 'text-[#191918]'
                        }`}
                        title={settings.privacyMode ? "Hover to reveal" : undefined}
                      >
                        {formatCurrency(r.amount, itemCurrency, {
                          sign: isMoneyOut ? 'minus' : isMoneyIn ? 'plus' : undefined,
                          showSign: isMoneyIn || isMoneyOut,
                        })}
                      </div>
                      {r.currency && repCurrency && r.currency !== repCurrency && (
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          ≈ {formatCurrency(convertAmount(r.amount, r.currency, repCurrency, rateInfo), repCurrency, {
                            sign: isMoneyOut ? 'minus' : isMoneyIn ? 'plus' : undefined,
                            showSign: isMoneyIn || isMoneyOut,
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#787875] capitalize">
                      {r.type}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
