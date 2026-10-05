import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  TrendingUp, 
  Calendar,
  ChevronDown,
  FileText,
  Globe
} from 'lucide-react';
import { BusinessRecord, BusinessSettings, TimeFilterRange, CurrencyRateInfo } from '../types';
import { formatMoney, formatDisplayDate, parseDate, getTodayStr } from '../utils/formatters';
import { convertAmount, formatCurrency } from '../utils/currency';
import { useI18n } from '../utils/i18n';

interface MoneyViewProps {
  records: BusinessRecord[];
  settings: BusinessSettings;
  rateInfo?: CurrencyRateInfo;
  onOpenCalculator: () => void;
  onSelectRecord: (record: BusinessRecord) => void;
  onOpenNewRecord: () => void;
}

export const MoneyView: React.FC<MoneyViewProps> = ({
  records,
  settings,
  rateInfo,
  onOpenCalculator,
  onSelectRecord,
  onOpenNewRecord,
}) => {
  const { t } = useI18n(settings.language);
  const repCurrency = settings.reportingCurrency || settings.defaultCurrency || settings.currency || 'USD';
  const [timeRange, setTimeRange] = useState<TimeFilterRange>('30d');
  const [trendView, setTrendView] = useState<'net' | 'received' | 'spent' | 'both'>('both');
  const [customFrom, setCustomFrom] = useState<string>('2026-01-01');
  const [customTo, setCustomTo] = useState<string>(getTodayStr());
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const blurCashClass = settings.privacyMode
    ? 'filter blur-[7px] select-none hover:filter-none transition-[filter] duration-200 cursor-pointer'
    : '';
  const blurCashInlineClass = settings.privacyMode
    ? 'filter blur-[5px] select-none hover:filter-none transition-[filter] duration-200 cursor-pointer'
    : '';

  // Compute date bounds for selected range
  const { startDateStr, endDateStr } = useMemo(() => {
    const today = new Date(getTodayStr());
    let start = new Date(today);

    if (timeRange === '7d') {
      start.setDate(today.getDate() - 6);
    } else if (timeRange === '30d') {
      start.setDate(today.getDate() - 29);
    } else if (timeRange === '90d') {
      start.setDate(today.getDate() - 89);
    } else if (timeRange === 'this_year') {
      start = new Date(today.getFullYear(), 0, 1);
    } else if (timeRange === 'last_year') {
      start = new Date(today.getFullYear() - 1, 0, 1);
      const endLast = new Date(today.getFullYear() - 1, 11, 31);
      return {
        startDateStr: start.toISOString().split('T')[0],
        endDateStr: endLast.toISOString().split('T')[0],
      };
    } else if (timeRange === 'custom') {
      return {
        startDateStr: customFrom,
        endDateStr: customTo,
      };
    }

    const yS = start.getFullYear();
    const mS = String(start.getMonth() + 1).padStart(2, '0');
    const dS = String(start.getDate()).padStart(2, '0');

    const yE = today.getFullYear();
    const mE = String(today.getMonth() + 1).padStart(2, '0');
    const dE = String(today.getDate()).padStart(2, '0');

    return {
      startDateStr: `${yS}-${mS}-${dS}`,
      endDateStr: `${yE}-${mE}-${dE}`,
    };
  }, [timeRange, customFrom, customTo]);

  // Filter records within date range
  const periodRecords = useMemo(() => {
    return records.filter((r) => {
      if (!r.date) return false;
      return r.date >= startDateStr && r.date <= endDateStr;
    });
  }, [records, startDateStr, endDateStr]);

  // Overall financial calculations across period (converted to reporting currency)
  const { received, spent, net, expected, due } = useMemo(() => {
    let rec = 0;
    let sp = 0;
    let exp = 0;
    let du = 0;

    periodRecords.forEach((r) => {
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
            if (!r.isCompleted && unpaidPart > 0) exp += convertedUnpaid;
          } else {
            sp += convertedPaid;
            if (!r.isCompleted && unpaidPart > 0) du += convertedUnpaid;
          }
        } else {
          if (r.direction === 'received') {
            rec += converted;
          } else if (r.direction === 'paid') {
            sp += converted;
          } else if (r.direction === 'expected') {
            if (r.isCompleted) rec += converted;
            else exp += converted;
          } else if (r.direction === 'due') {
            if (r.isCompleted) sp += converted;
            else du += converted;
          }
        }
      }
    });

    return {
      received: rec,
      spent: sp,
      net: rec - sp,
      expected: exp,
      due: du,
    };
  }, [periodRecords, repCurrency, rateInfo]);

  // Generate Graph Data buckets
  const graphData = useMemo(() => {
    const sDate = parseDate(startDateStr);
    const eDate = parseDate(endDateStr);
    const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24)));

    // Grouping interval: if <= 31 days, daily; if <= 180 days, weekly; otherwise monthly
    const bucketCount = diffDays <= 14 ? diffDays + 1 : diffDays <= 90 ? Math.min(12, Math.ceil(diffDays / 7)) : 12;

    const buckets: Array<{
      label: string;
      dateStr: string;
      received: number;
      spent: number;
      net: number;
    }> = [];

    // Group period records into timeline
    if (diffDays <= 14) {
      // Daily points
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(sDate);
        d.setDate(sDate.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${day}`;

        let dayRec = 0;
        let daySp = 0;

        periodRecords.forEach((r) => {
          if (r.date === dStr) {
            const converted = convertAmount(r.amount || 0, r.currency || 'USD', repCurrency);
            if (r.type === 'money_in' || (r.type === 'payment' && r.direction === 'received')) {
              dayRec += converted;
            } else if (r.type === 'money_out' || (r.type === 'payment' && r.direction === 'paid')) {
              daySp += converted;
            }
          }
        });

        buckets.push({
          label: `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`,
          dateStr: dStr,
          received: dayRec,
          spent: daySp,
          net: dayRec - daySp,
        });
      }
    } else {
      // Split into equal segments
      const segmentDays = Math.max(1, Math.floor(diffDays / bucketCount));
      for (let i = 0; i < bucketCount; i++) {
        const segStart = new Date(sDate);
        segStart.setDate(sDate.getDate() + i * segmentDays);
        const segEnd = new Date(sDate);
        segEnd.setDate(sDate.getDate() + (i + 1) * segmentDays);

        const sStr = segStart.toISOString().split('T')[0];
        const eStr = segEnd.toISOString().split('T')[0];

        let segRec = 0;
        let segSp = 0;

        periodRecords.forEach((r) => {
          if (r.date >= sStr && (i === bucketCount - 1 ? r.date <= eStr : r.date < eStr)) {
            const converted = convertAmount(r.amount || 0, r.currency || 'USD', repCurrency);
            if (r.type === 'money_in' || (r.type === 'payment' && r.direction === 'received')) {
              segRec += converted;
            } else if (r.type === 'money_out' || (r.type === 'payment' && r.direction === 'paid')) {
              segSp += converted;
            }
          }
        });

        buckets.push({
          label: `${segStart.getDate()} ${segStart.toLocaleDateString('en-GB', { month: 'short' })}`,
          dateStr: sStr,
          received: segRec,
          spent: segSp,
          net: segRec - segSp,
        });
      }
    }

    return buckets;
  }, [periodRecords, startDateStr, endDateStr]);

  // Graph geometry
  const maxVal = useMemo(() => {
    let m = 1000;
    graphData.forEach((b) => {
      m = Math.max(m, b.received, b.spent, Math.abs(b.net));
    });
    return m * 1.15;
  }, [graphData]);

  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  const pointsReceived = graphData.map((d, i) => {
    const x = paddingX + (i / Math.max(1, graphData.length - 1)) * plotWidth;
    const y = svgHeight - paddingY - (d.received / maxVal) * plotHeight;
    return { x, y, val: d.received, ...d };
  });

  const pointsSpent = graphData.map((d, i) => {
    const x = paddingX + (i / Math.max(1, graphData.length - 1)) * plotWidth;
    const y = svgHeight - paddingY - (d.spent / maxVal) * plotHeight;
    return { x, y, val: d.spent, ...d };
  });

  const pointsNet = graphData.map((d, i) => {
    const x = paddingX + (i / Math.max(1, graphData.length - 1)) * plotWidth;
    // zero line is in middle if net can be negative
    const zeroY = svgHeight - paddingY - (0.5) * plotHeight;
    const y = zeroY - (d.net / (maxVal * 2)) * plotHeight;
    return { x, y, val: d.net, ...d };
  });

  const pathReceived = pointsReceived.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const pathSpent = pointsSpent.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const pathNet = pointsNet.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  return (
    <div id="money-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFEFED] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#191918]">Money</h1>
          <p className="text-xs text-[#787875] mt-0.5">
            Where is the money? · Plain language financial tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="money-calc-btn"
            onClick={onOpenCalculator}
            className="px-3 py-2 border border-[#D5D5D2] hover:bg-[#F5F5F3] text-[#191918] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Calculator className="w-4 h-4 text-[#146C43]" />
            <span>Business Calculator</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Overview (Plain Language: Received, Spent, Balance, Expected, Due) */}
      <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0F0EE]">
          <span className="text-xs font-semibold text-[#191918]">Summary in {repCurrency}</span>
          <span className="text-[11px] text-[#787875]">Unified across all currencies</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#F0F0EE]">
          {/* 1. Received */}
          <div className="flex flex-col justify-between">
            <span className="text-xs font-medium text-[#787875] h-4 flex items-center">Received</span>
            <div className="my-1.5 h-8 sm:h-9 flex items-baseline overflow-hidden">
              <span className={`text-lg sm:text-xl font-bold text-[#146C43] font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${blurCashClass}`} title={settings.privacyMode ? "Hover to reveal" : undefined}>
                {formatMoney(received, repCurrency)}
              </span>
            </div>
            <span className="text-[11px] text-[#787875] h-4 flex items-center truncate">Actual inflow</span>
          </div>

          {/* 2. Spent */}
          <div className="pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#787875] h-4 flex items-center">Spent</span>
            <div className="my-1.5 h-8 sm:h-9 flex items-baseline overflow-hidden">
              <span className={`text-lg sm:text-xl font-bold text-[#C0392B] font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${blurCashClass}`} title={settings.privacyMode ? "Hover to reveal" : undefined}>
                {formatMoney(spent, repCurrency)}
              </span>
            </div>
            <span className="text-[11px] text-[#787875] h-4 flex items-center truncate">Actual outflow</span>
          </div>

          {/* 3. Balance */}
          <div className="pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#787875] h-4 flex items-center">Balance</span>
            <div className="my-1.5 h-8 sm:h-9 flex items-baseline overflow-hidden">
              <span
                className={`text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${
                  net >= 0 ? 'text-[#191918]' : 'text-[#C0392B]'
                } ${blurCashClass}`}
                title={settings.privacyMode ? "Hover to reveal" : undefined}
              >
                {formatMoney(net, repCurrency)}
              </span>
            </div>
            <span className="text-[11px] text-[#787875] h-4 flex items-center truncate">Net movement</span>
          </div>

          {/* 4. Expected */}
          <div className="pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#787875] h-4 flex items-center">Expected</span>
            <div className="my-1.5 h-8 sm:h-9 flex items-baseline overflow-hidden">
              <span className={`text-lg sm:text-xl font-bold text-[#146C43] font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${blurCashClass}`} title={settings.privacyMode ? "Hover to reveal" : undefined}>
                {formatMoney(expected, repCurrency)}
              </span>
            </div>
            <span className="text-[11px] text-[#787875] h-4 flex items-center truncate">Receivables</span>
          </div>

          {/* 5. Due */}
          <div className="pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#787875] h-4 flex items-center">Due</span>
            <div className="my-1.5 h-8 sm:h-9 flex items-baseline overflow-hidden">
              <span className={`text-lg sm:text-xl font-bold text-[#C0392B] font-mono tracking-tight tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar ${blurCashClass}`} title={settings.privacyMode ? "Hover to reveal" : undefined}>
                {formatMoney(due, repCurrency)}
              </span>
            </div>
            <span className="text-[11px] text-[#787875] h-4 flex items-center truncate">Bills & debt</span>
          </div>
        </div>
      </div>

      {/* Single High-Quality Financial Graph (Section 8) */}
      <section id="money-graph-section" className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-2xs space-y-4">
        {/* Controls: Time period + Trends */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F0EE] pb-3">
          {/* Time range buttons */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium">
            {(
              [
                { id: '7d', label: '7 days' },
                { id: '30d', label: '30 days' },
                { id: '90d', label: '90 days' },
                { id: 'this_year', label: 'This year' },
                { id: 'last_year', label: 'Last year' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  timeRange === t.id
                    ? 'bg-[#146C43] text-white font-medium shadow-xs'
                    : 'text-[#787875] hover:bg-[#F5F5F3] hover:text-[#191918]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Trend selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setTrendView('both')}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                trendView === 'both' ? 'bg-[#F0F0EE] font-semibold text-[#191918]' : 'text-[#787875]'
              }`}
            >
              Comparison
            </button>
            <button
              onClick={() => setTrendView('received')}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                trendView === 'received' ? 'bg-[#EBF5F0] font-semibold text-[#146C43]' : 'text-[#787875]'
              }`}
            >
              Received
            </button>
            <button
              onClick={() => setTrendView('spent')}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                trendView === 'spent' ? 'bg-[#FEF2F2] font-semibold text-[#C0392B]' : 'text-[#787875]'
              }`}
            >
              Spent
            </button>
            <button
              onClick={() => setTrendView('net')}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                trendView === 'net' ? 'bg-[#F0F4F8] font-semibold text-[#2C5282]' : 'text-[#787875]'
              }`}
            >
              Net
            </button>
          </div>
        </div>

        {/* Custom Date Range Selectors if selected */}
        {timeRange === 'custom' && (
          <div className="flex items-center gap-3 p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] text-xs">
            <span className="font-medium text-[#787875]">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#D5D5D2] rounded text-xs"
            />
            <span className="font-medium text-[#787875]">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#D5D5D2] rounded text-xs"
            />
          </div>
        )}

        {/* Responsive SVG Chart */}
        <div className="relative pt-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 sm:h-56 select-none overflow-visible"
          >
            {/* Grid horizontal lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = svgHeight - paddingY - ratio * plotHeight;
              return (
                <g key={ratio}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="#F0F0EE"
                    strokeDasharray={ratio === 0 ? '' : '3 3'}
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#A0A09C"
                    fontFamily="monospace"
                  >
                    {Math.round((ratio * maxVal) / 1000)}k
                  </text>
                </g>
              );
            })}

            {/* Paths */}
            {(trendView === 'both' || trendView === 'received') && (
              <path
                d={pathReceived}
                fill="none"
                stroke="#146C43"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {(trendView === 'both' || trendView === 'spent') && (
              <path
                d={pathSpent}
                fill="none"
                stroke="#C0392B"
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {trendView === 'net' && (
              <path
                d={pathNet}
                fill="none"
                stroke="#2C5282"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Dots & Hover Detection */}
            {graphData.map((d, i) => {
              const pR = pointsReceived[i];
              const pS = pointsSpent[i];
              const isHovered = hoveredPointIndex === i;

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredPointIndex(i)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                  className="cursor-pointer"
                >
                  {/* Invisible touch/hover hitbox */}
                  <rect
                    x={pR.x - 12}
                    y={paddingY}
                    width={24}
                    height={plotHeight}
                    fill="transparent"
                  />

                  {/* Vertical guide line on hover */}
                  {isHovered && (
                    <line
                      x1={pR.x}
                      y1={paddingY}
                      x2={pR.x}
                      y2={svgHeight - paddingY}
                      stroke="#A0A09C"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Dots */}
                  {(trendView === 'both' || trendView === 'received') && (
                    <circle
                      cx={pR.x}
                      cy={pR.y}
                      r={isHovered ? 5 : 3}
                      fill="#FFFFFF"
                      stroke="#146C43"
                      strokeWidth="2"
                    />
                  )}

                  {(trendView === 'both' || trendView === 'spent') && (
                    <circle
                      cx={pS.x}
                      cy={pS.y}
                      r={isHovered ? 4 : 2.5}
                      fill="#FFFFFF"
                      stroke="#C0392B"
                      strokeWidth="2"
                    />
                  )}

                  {/* X-axis date labels */}
                  {(i === 0 || i === graphData.length - 1 || i % Math.ceil(graphData.length / 5) === 0) && (
                    <text
                      x={pR.x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#787875"
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover Floating Details Banner */}
          {hoveredPointIndex !== null && graphData[hoveredPointIndex] && (
            <div className="mt-2 p-2.5 bg-[#F9F9F8] border border-[#E8E8E6] rounded-lg flex items-center justify-between text-xs animate-in fade-in">
              <span className="font-semibold text-[#191918]">
                {graphData[hoveredPointIndex].label}
              </span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-[#146C43]">
                  Received: {formatMoney(graphData[hoveredPointIndex].received, repCurrency)}
                </span>
                <span className="text-[#C0392B]">
                  Spent: {formatMoney(graphData[hoveredPointIndex].spent, repCurrency)}
                </span>
                <span className="font-bold text-[#191918]">
                  Net: {formatMoney(graphData[hoveredPointIndex].net, repCurrency)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Underlying Financial Records for this period */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[#787875]">
            Transactions in this period ({periodRecords.length})
          </h2>
          <span className="text-xs text-[#787875]">
            {formatDisplayDate(startDateStr, { short: true })} – {formatDisplayDate(endDateStr, { short: true })}
          </span>
        </div>

        <div className="bg-white border border-[#E8E8E6] rounded-xl divide-y divide-[#F5F5F3] overflow-hidden">
          {periodRecords.length > 0 ? (
            periodRecords.map((r) => {
              const isMoneyIn = r.type === 'money_in' || (r.type === 'payment' && r.direction === 'received');
              const isMoneyOut = r.type === 'money_out' || (r.type === 'payment' && (r.direction === 'paid' || r.direction === 'due'));

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#FDFCFB] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        isMoneyIn ? 'bg-[#EBF5F0] text-[#146C43]' : 'bg-[#FEF2F2] text-[#C0392B]'
                      }`}
                    >
                      {isMoneyIn ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>

                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#191918] truncate">
                        {r.title}
                        {r.clientOrParty && <span className="text-[#787875] font-normal"> · {r.clientOrParty}</span>}
                      </div>
                      <div className="text-[11px] text-[#787875] mt-0.5">
                        {formatDisplayDate(r.date, { short: true })} {r.time && `· ${r.time}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold font-mono ${blurCashInlineClass} ${
                        isMoneyIn ? 'text-[#146C43]' : 'text-[#C0392B]'
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
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-[#787875]">
              No financial records in this period.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
