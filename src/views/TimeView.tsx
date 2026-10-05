import React, { useState, useMemo } from 'react';
import { 
  CalendarClock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  TrendingDown,
  Layers
} from 'lucide-react';
import { BusinessRecord, BusinessSettings, TimeItem } from '../types';
import { 
  formatMoney, 
  formatDisplayDate, 
  getTodayStr, 
  parseDate, 
  deriveTimeItemsFromRecord, 
  calculatePaymentPlan 
} from '../utils/formatters';
import { useLiveClock } from '../utils/timezone';

interface TimeViewProps {
  records: BusinessRecord[];
  settings: BusinessSettings;
  onOpenNewRecord: () => void;
  onSelectRecord: (record: BusinessRecord) => void;
  onToggleComplete: (item: TimeItem) => void;
}

type TimeSubTab = 'memory' | 'calendar' | 'plans';
type CalendarMode = 'month' | 'week' | 'day';

export const TimeView: React.FC<TimeViewProps> = ({
  records,
  settings,
  onOpenNewRecord,
  onSelectRecord,
  onToggleComplete,
}) => {
  const [subTab, setSubTab] = useState<TimeSubTab>('memory');
  const [calMode, setCalMode] = useState<CalendarMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(getTodayStr()));
  const [selectedDay, setSelectedDay] = useState<string>(getTodayStr());

  const todayStr = getTodayStr();
  const defaultCurrency = settings.defaultCurrency || settings.currency || 'USD';

  // Aggregate all derived TimeItems
  const allItems: TimeItem[] = useMemo(() => {
    const list: TimeItem[] = [];
    records.forEach((r) => {
      list.push(...deriveTimeItemsFromRecord(r));
    });
    // Sort chronologically
    return list.sort((a, b) => {
      const dtA = `${a.date}T${a.time || '00:00'}`;
      const dtB = `${b.date}T${b.time || '00:00'}`;
      return dtA.localeCompare(dtB);
    });
  }, [records]);

  // Categorize for Agenda / Memory View:
  // Overdue (date < today && !isCompleted)
  // Today (date === today)
  // Tomorrow
  // Upcoming (date > tomorrow)
  // Completed
  const { overdueItems, todayItems, tomorrowItems, upcomingItems, completedItems } = useMemo(() => {
    const overdue: TimeItem[] = [];
    const today: TimeItem[] = [];
    const tomorrow: TimeItem[] = [];
    const upcoming: TimeItem[] = [];
    const completed: TimeItem[] = [];

    const tomorrowObj = new Date(parseDate(todayStr));
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

    allItems.forEach((item) => {
      if (item.isCompleted) {
        completed.push(item);
      } else if (item.date < todayStr) {
        overdue.push(item);
      } else if (item.date === todayStr) {
        today.push(item);
      } else if (item.date === tomorrowStr) {
        tomorrow.push(item);
      } else {
        upcoming.push(item);
      }
    });

    return {
      overdueItems: overdue,
      todayItems: today,
      tomorrowItems: tomorrow,
      upcomingItems: upcoming,
      completedItems: completed,
    };
  }, [allItems, todayStr]);

  // Active Payment Plans list (Section 14: Payments and Promises)
  const paymentPlanRecords = useMemo(() => {
    return records.filter((r) => r.type === 'payment' && r.paymentPlan);
  }, [records]);

  // Calendar calculations
  const monthYearStr = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  // Days for Month Calendar matrix
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // adjust for Monday start
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: TimeItem[];
    }> = [];

    // Leading padding from prev month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const dStr = prevDate.toISOString().split('T')[0];
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        items: allItems.filter((it) => it.date === dStr),
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const yStr = curDate.getFullYear();
      const mStr = String(curDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dStr = `${yStr}-${mStr}-${dayStr}`;

      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        items: allItems.filter((it) => it.date === dStr),
      });
    }

    // Trailing padding to make 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dStr = nextDate.toISOString().split('T')[0];
      days.push({
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        items: allItems.filter((it) => it.date === dStr),
      });
    }

    return days;
  }, [currentDate, allItems, todayStr]);

  const selectedDayItems = useMemo(() => {
    return allItems.filter((it) => it.date === selectedDay);
  }, [allItems, selectedDay]);

  return (
    <div id="time-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFEFED] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#191918]">Time</h1>
          <p className="text-xs text-[#787875] mt-0.5">
            What needs to happen next, and when? · Connected memory
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub tabs: Memory vs Calendar vs Payment Plans */}
          <div className="flex bg-[#F0F0EE] p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSubTab('memory')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                subTab === 'memory' ? 'bg-white shadow-xs text-[#191918] font-semibold' : 'text-[#787875]'
              }`}
            >
              Memory & Agenda
            </button>
            <button
              onClick={() => setSubTab('calendar')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                subTab === 'calendar' ? 'bg-white shadow-xs text-[#191918] font-semibold' : 'text-[#787875]'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setSubTab('plans')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                subTab === 'plans' ? 'bg-white shadow-xs text-[#191918] font-semibold' : 'text-[#787875]'
              }`}
            >
              Payment Plans
            </button>
          </div>
        </div>
      </div>

      {/* Modern, unboxed live time & date display */}
      <LiveTimeDisplay timezone={settings.timezone} todayStr={todayStr} />

      {/* SUB-VIEW 1: MEMORY & AGENDA (Clean plain list) */}
      {subTab === 'memory' && (
        <div className="space-y-6">
          {/* Overdue Warning if any */}
          {overdueItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C0392B]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overdue ({overdueItems.length})</span>
              </div>
              <div className="bg-white border border-[#FADBD8] rounded-xl divide-y divide-[#FEF2F2] overflow-hidden">
                {overdueItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={defaultCurrency}
                    onToggle={onToggleComplete}
                    onSelectRecord={onSelectRecord}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Today Section */}
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#146C43]">
              Today · {formatDisplayDate(todayStr)}
            </h2>
            <div className="bg-white border border-[#E8E8E6] rounded-xl divide-y divide-[#F5F5F3] overflow-hidden">
              {todayItems.length > 0 ? (
                todayItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={defaultCurrency}
                    onToggle={onToggleComplete}
                    onSelectRecord={onSelectRecord}
                  />
                ))
              ) : (
                <div className="p-4 text-xs text-[#787875] text-center">
                  No pending commitments for today.
                </div>
              )}
            </div>
          </div>

          {/* Tomorrow Section */}
          {tomorrowItems.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#787875]">
                Tomorrow
              </h2>
              <div className="bg-white border border-[#E8E8E6] rounded-xl divide-y divide-[#F5F5F3] overflow-hidden">
                {tomorrowItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={defaultCurrency}
                    onToggle={onToggleComplete}
                    onSelectRecord={onSelectRecord}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#787875]">
              Upcoming Commitments
            </h2>
            <div className="bg-white border border-[#E8E8E6] rounded-xl divide-y divide-[#F5F5F3] overflow-hidden">
              {upcomingItems.length > 0 ? (
                upcomingItems.slice(0, 10).map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={defaultCurrency}
                    onToggle={onToggleComplete}
                    onSelectRecord={onSelectRecord}
                  />
                ))
              ) : (
                <div className="p-4 text-xs text-[#787875] text-center">
                  No upcoming commitments logged yet.
                </div>
              )}
            </div>
          </div>

          {/* Completed Section (collapsible/subtle) */}
          {completedItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#A0A09C]">
                Recently Completed ({completedItems.length})
              </h2>
              <div className="bg-[#FBFBFA] border border-[#E8E8E6] rounded-xl divide-y divide-[#F0F0EE] overflow-hidden opacity-75">
                {completedItems.slice(0, 5).map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={defaultCurrency}
                    onToggle={onToggleComplete}
                    onSelectRecord={onSelectRecord}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: CALENDAR (Day / Week / Month) */}
      {subTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between bg-white border border-[#E8E8E6] rounded-xl p-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-[#E0E0DE] hover:bg-[#F5F5F3] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-semibold text-[#191918] min-w-[130px]">
                {monthYearStr}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-[#E0E0DE] hover:bg-[#F5F5F3] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setCurrentDate(new Date(todayStr));
                setSelectedDay(todayStr);
              }}
              className="px-3 py-1 text-xs font-medium border border-[#D5D5D2] rounded-lg hover:bg-[#F5F5F3] cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Month Matrix Grid */}
          <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-2xs">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-[#F0F0EE] text-center text-[11px] font-semibold text-[#787875] py-2 bg-[#FBFBFA]">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#F0F0EE]">
              {calendarDays.map((d, idx) => {
                const isSelected = d.dateStr === selectedDay;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDay(d.dateStr)}
                    className={`min-h-[75px] sm:min-h-[90px] p-2 cursor-pointer transition-colors flex flex-col justify-between ${
                      !d.isCurrentMonth
                        ? 'bg-[#FCFCFA] text-[#C5C5C0]'
                        : isSelected
                        ? 'bg-[#EBF5F0]/60'
                        : 'hover:bg-[#F9F9F8]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                          d.isToday
                            ? 'bg-[#146C43] text-white'
                            : isSelected
                            ? 'font-bold text-[#146C43]'
                            : ''
                        }`}
                      >
                        {d.dayNumber}
                      </span>
                      {d.items.length > 0 && (
                        <span className="text-[10px] text-[#787875] font-mono">
                          {d.items.length}
                        </span>
                      )}
                    </div>

                    {/* Dots / mini indicators */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {d.items.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="text-[10px] truncate px-1 py-0.5 rounded font-medium bg-[#F5F5F3] text-[#191918]"
                        >
                          {item.title}
                        </div>
                      ))}
                      {d.items.length > 2 && (
                        <div className="text-[9px] text-[#787875] font-mono px-1">
                          +{d.items.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda Drawer below Calendar */}
          <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-2">
              <span className="text-xs font-semibold text-[#191918]">
                {formatDisplayDate(selectedDay)}
              </span>
              <span className="text-xs text-[#787875]">
                {selectedDayItems.length} commitment{selectedDayItems.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-[#F5F5F3]">
              {selectedDayItems.length > 0 ? (
                selectedDayItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={defaultCurrency}
                    onToggle={onToggleComplete}
                    onSelectRecord={onSelectRecord}
                  />
                ))
              ) : (
                <div className="py-4 text-center text-xs text-[#787875]">
                  No items scheduled for this date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: PAYMENTS AND PROMISES (Section 14) */}
      {subTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#787875]">
              Active Payment Plans & Expected Receivables
            </h2>
            <span className="text-xs text-[#787875]">
              Calculated automatically from records
            </span>
          </div>

          {paymentPlanRecords.length > 0 ? (
            <div className="space-y-4">
              {paymentPlanRecords.map((r) => {
                if (!r.paymentPlan) return null;
                const plan = calculatePaymentPlan(r.paymentPlan);
                const progressPct = Math.round((plan.paidAmount / plan.totalAmount) * 100);

                return (
                  <div
                    key={r.id}
                    className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F0EE] pb-3">
                      <div>
                        <h3 className="text-base font-bold text-[#191918]">
                          {r.title}
                        </h3>
                        {r.clientOrParty && (
                          <p className="text-xs text-[#787875] mt-0.5">
                            Client / Party: {r.clientOrParty}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right font-mono">
                        <div className="text-lg font-bold text-[#146C43]">
                          {formatMoney(plan.totalAmount, settings.currency)}
                        </div>
                        <div className="text-xs text-[#787875]">
                          Plan: {formatMoney(plan.installmentAmount, settings.currency)} / {r.paymentPlan.frequency}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#146C43]">
                          Paid: {formatMoney(plan.paidAmount, settings.currency)} ({progressPct}%)
                        </span>
                        <span className="text-[#787875]">
                          Remaining: {formatMoney(plan.remainingBalance, settings.currency)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F0F0EE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#146C43] rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown per Section 14: 6 × KSh 3,000, Final payment KSh 2,000 */}
                    <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] text-xs space-y-1 text-[#595956]">
                      <div className="font-semibold text-[#191918]">
                        Schedule Structure: {plan.fullInstallmentsCount} × {settings.currency} {plan.installmentAmount.toLocaleString()}
                        {plan.finalPaymentAmount !== plan.installmentAmount && (
                          <span> + final payment of {settings.currency} {plan.finalPaymentAmount.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#787875]">
                        Next installment: {plan.installments.find((i) => !i.isPaid)?.dueDate || 'Complete'} · 
                        Expected completion: {plan.installments[plan.installments.length - 1]?.dueDate}
                      </div>
                    </div>

                    {/* Installments List */}
                    <div className="divide-y divide-[#F5F5F3] pt-1">
                      {plan.installments.map((inst) => (
                        <div
                          key={inst.number}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[#787875]">#{inst.number}</span>
                            <span className="font-medium text-[#191918]">
                              Due {formatDisplayDate(inst.dueDate, { short: true })}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 font-mono">
                            <span>{formatMoney(inst.amount, settings.currency)}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inst.isPaid
                                  ? 'bg-[#EBF5F0] text-[#146C43]'
                                  : 'bg-[#F5F5F3] text-[#787875]'
                              }`}
                            >
                              {inst.isPaid ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 bg-white border border-[#E8E8E6] rounded-xl text-center text-xs text-[#787875] p-6">
              No installment payment plans currently registered. When recording a payment, open "More options" and check "Enable payment plan".
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper row component for Time Items
const ItemRow: React.FC<{
  item: TimeItem;
  currency: string;
  onToggle: (item: TimeItem) => void;
  onSelectRecord: (record: BusinessRecord) => void;
}> = ({ item, currency, onToggle, onSelectRecord }) => {
  return (
    <div className="p-3.5 flex items-center justify-between gap-3 text-sm hover:bg-[#FDFCFB] transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => onToggle(item)}
          className="text-[#787875] hover:text-[#146C43] transition-colors cursor-pointer shrink-0"
        >
          {item.isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-[#146C43]" />
          ) : (
            <Circle className="w-4 h-4 text-[#A0A09C]" />
          )}
        </button>

        <div className="truncate">
          <span
            onClick={() => onSelectRecord(item.sourceRecord)}
            className={`font-medium cursor-pointer hover:underline ${
              item.isCompleted ? 'line-through text-[#A0A09C]' : 'text-[#191918]'
            }`}
          >
            {item.title}
          </span>
          <div className="text-xs text-[#787875] flex items-center gap-2 mt-0.5">
            <span>{formatDisplayDate(item.date, { short: true })}</span>
            {item.time && <span>· {item.time}</span>}
            <span aria-hidden="true">·</span>
            <span className="capitalize text-xs text-[#787875]">
              {item.type.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {item.amount !== undefined && (
        <span
          className={`text-xs font-mono font-bold shrink-0 ${
            item.type === 'bill' || item.direction === 'due' || item.direction === 'paid'
              ? 'text-[#C0392B]'
              : item.direction === 'expected' || item.direction === 'received'
              ? 'text-[#146C43]'
              : 'text-[#191918]'
          }`}
        >
          {formatMoney(
            item.amount,
            item.currency || item.sourceRecord?.currency || currency,
            item.type === 'bill' || item.direction === 'due' || item.direction === 'paid'
              ? 'minus'
              : item.direction === 'expected' || item.direction === 'received'
              ? 'plus'
              : false
          )}
        </span>
      )}
    </div>
  );
};

// Isolated, memoized live clock to prevent re-rendering the whole TimeView page every second
const LiveTimeDisplay: React.FC<{ timezone?: string; todayStr: string }> = React.memo(({ timezone, todayStr }) => {
  const { formattedTimeWithSeconds, cityName, utcOffset } = useLiveClock(timezone);
  return (
    <div className="pt-2 pb-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight tabular-nums text-[#191918]">
          {formattedTimeWithSeconds}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-[#787875] font-medium">
          <span className="text-[#191918] font-semibold">{cityName}</span>
          <span aria-hidden="true">·</span>
          <span>{utcOffset}</span>
        </div>
      </div>

      <div className="text-xs text-[#787875] font-medium sm:text-right">
        <span className="text-[#A0A09C] block text-[11px]">Calendar date</span>
        <span className="text-sm font-semibold text-[#191918]">{formatDisplayDate(todayStr)}</span>
      </div>
    </div>
  );
});
