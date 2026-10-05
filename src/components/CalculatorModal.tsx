import React, { useState, useReducer, useEffect } from 'react';
import { X, Calculator, Percent, Tag, TrendingUp, Users, ArrowRight, ArrowRightLeft } from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import { convertAmount, formatCurrency, SUPPORTED_CURRENCIES, getCachedRateInfo } from '../utils/currency';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onRecordAmount: (amount: number, note?: string) => void;
}

type CalcMode = 'standard' | 'discount' | 'markup' | 'margin' | 'split' | 'convert';

interface CalcState {
  display: string;
  prevValue: number | null;
  operation: string | null;
  clearOnNext: boolean;
}

type CalcAction =
  | { type: 'DIGIT'; digit: string }
  | { type: 'DECIMAL' }
  | { type: 'OPERATION'; op: string }
  | { type: 'EQUALS' }
  | { type: 'CLEAR' }
  | { type: 'BACKSPACE' }
  | { type: 'PERCENT' };

const initialCalcState: CalcState = {
  display: '0',
  prevValue: null,
  operation: null,
  clearOnNext: false,
};

function compute(a: number, b: number, op: string): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
    case '*':
      return a * b;
    case '÷':
    case '/':
      return b !== 0 ? a / b : 0;
    default:
      return b;
  }
}

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'DIGIT': {
      if (state.clearOnNext) {
        return {
          ...state,
          display: action.digit,
          clearOnNext: false,
        };
      }
      return {
        ...state,
        display: state.display === '0' ? action.digit : state.display + action.digit,
      };
    }
    case 'DECIMAL': {
      if (state.clearOnNext) {
        return {
          ...state,
          display: '0.',
          clearOnNext: false,
        };
      }
      if (!state.display.includes('.')) {
        return {
          ...state,
          display: state.display + '.',
        };
      }
      return state;
    }
    case 'OPERATION': {
      const current = parseFloat(state.display);
      if (state.prevValue === null) {
        return {
          ...state,
          prevValue: current,
          operation: action.op,
          clearOnNext: true,
        };
      }
      if (state.operation && !state.clearOnNext) {
        const result = compute(state.prevValue, current, state.operation);
        const rounded = Number.isFinite(result) ? Number(result.toFixed(6)) : 0;
        return {
          ...state,
          prevValue: rounded,
          display: String(rounded),
          operation: action.op,
          clearOnNext: true,
        };
      }
      return {
        ...state,
        operation: action.op,
        clearOnNext: true,
      };
    }
    case 'EQUALS': {
      if (state.prevValue === null || !state.operation) return state;
      const current = parseFloat(state.display);
      const result = compute(state.prevValue, current, state.operation);
      const formatted = Number.isFinite(result) ? String(Number(result.toFixed(6))) : '0';
      return {
        ...state,
        display: formatted,
        prevValue: null,
        operation: null,
        clearOnNext: true,
      };
    }
    case 'CLEAR':
      return initialCalcState;
    case 'BACKSPACE': {
      if (state.clearOnNext) {
        return {
          ...state,
          display: '0',
          clearOnNext: false,
        };
      }
      const next =
        state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith('-'))
          ? '0'
          : state.display.slice(0, -1);
      return {
        ...state,
        display: next,
      };
    }
    case 'PERCENT': {
      const current = parseFloat(state.display);
      return {
        ...state,
        display: isNaN(current) ? '0' : String(current / 100),
      };
    }
    default:
      return state;
  }
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  currency,
  onRecordAmount,
}) => {
  const [mode, setMode] = useState<CalcMode>('standard');
  const [calcState, dispatch] = useReducer(calcReducer, initialCalcState);

  // Business presets states
  // 1. Discount
  const [discountPrice, setDiscountPrice] = useState<string>('10000');
  const [discountPercent, setDiscountPercent] = useState<string>('15');

  // 2. Markup
  const [markupCost, setMarkupCost] = useState<string>('5000');
  const [markupPercent, setMarkupPercent] = useState<string>('30');

  // 3. Margin
  const [marginRevenue, setMarginRevenue] = useState<string>('12000');
  const [marginCost, setMarginCost] = useState<string>('8000');

  // 4. Split
  const [splitTotal, setSplitTotal] = useState<string>('15000');
  const [splitCount, setSplitCount] = useState<string>('3');

  // 5. Currency Converter
  const [convAmount, setConvAmount] = useState<string>('100');
  const [convFrom, setConvFrom] = useState<string>('USD');
  const [convTo, setConvTo] = useState<string>(currency === 'USD' ? 'EUR' : currency);

  // Fast keyboard event binding - unconditionally mounted
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Always close on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // If user is currently focused in a custom input in another mode, let them type naturally
      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isInputFocused = tagName === 'input' || tagName === 'textarea';

      if (isInputFocused && mode !== 'standard') {
        return;
      }

      // Number key checking (top row & numpad)
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        dispatch({ type: 'DIGIT', digit: e.key });
        return;
      }

      if (e.code && e.code.startsWith('Numpad') && e.code.length === 7 && e.code[6] >= '0' && e.code[6] <= '9') {
        e.preventDefault();
        dispatch({ type: 'DIGIT', digit: e.code[6] });
        return;
      }

      if (e.key === '.' || e.key === ',' || e.code === 'NumpadDecimal') {
        e.preventDefault();
        dispatch({ type: 'DECIMAL' });
        return;
      }

      if (e.key === '+' || e.code === 'NumpadAdd') {
        e.preventDefault();
        dispatch({ type: 'OPERATION', op: '+' });
        return;
      }

      if (e.key === '-' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        dispatch({ type: 'OPERATION', op: '-' });
        return;
      }

      if (e.key === '*' || e.key === 'x' || e.key === 'X' || e.code === 'NumpadMultiply') {
        e.preventDefault();
        dispatch({ type: 'OPERATION', op: '×' });
        return;
      }

      if (e.key === '/' || e.code === 'NumpadDivide') {
        e.preventDefault();
        dispatch({ type: 'OPERATION', op: '÷' });
        return;
      }

      if (e.key === 'Enter' || e.key === '=' || e.code === 'NumpadEnter') {
        e.preventDefault();
        dispatch({ type: 'EQUALS' });
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'BACKSPACE' });
        return;
      }

      if (e.key === 'c' || e.key === 'C' || e.key === 'Delete') {
        e.preventDefault();
        dispatch({ type: 'CLEAR' });
        return;
      }

      if (e.key === '%') {
        e.preventDefault();
        dispatch({ type: 'PERCENT' });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, mode, onClose]);

  // Calculations for business presets
  const dPrice = parseFloat(discountPrice) || 0;
  const dPercent = parseFloat(discountPercent) || 0;
  const discountSaved = (dPrice * dPercent) / 100;
  const discountFinal = Math.max(0, dPrice - discountSaved);

  const mCost = parseFloat(markupCost) || 0;
  const mPercent = parseFloat(markupPercent) || 0;
  const markupProfit = (mCost * mPercent) / 100;
  const markupSelling = mCost + markupProfit;

  const rev = parseFloat(marginRevenue) || 0;
  const cost = parseFloat(marginCost) || 0;
  const marginProfit = rev - cost;
  const marginPercentValue = rev > 0 ? ((marginProfit / rev) * 100).toFixed(1) : '0';

  const sTotal = parseFloat(splitTotal) || 0;
  const sCount = Math.max(1, parseInt(splitCount) || 1);
  const splitPerPerson = sTotal / sCount;

  // Unconditionally evaluate hooks; return null here if not open
  if (!isOpen) return null;

  return (
    <div
      id="calc-modal-backdrop"
      className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="calc-modal-dialog"
        className="bg-[#FFFFFF] w-full max-w-sm rounded-xl shadow-xl border border-[#E8E8E6] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F0EE]">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#146C43]" />
            <h2 className="text-sm font-semibold text-[#191918]">Business Calculator</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#787875] hover:text-[#191918] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-[#FBFBFA] border-b border-[#F0F0EE] p-1 gap-1 text-[11px] font-medium overflow-x-auto">
          <button
            onClick={() => setMode('standard')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'standard' ? 'bg-white shadow-xs text-[#146C43] font-semibold' : 'text-[#787875] hover:text-[#191918]'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setMode('discount')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'discount' ? 'bg-white shadow-xs text-[#146C43] font-semibold' : 'text-[#787875] hover:text-[#191918]'
            }`}
          >
            Discount
          </button>
          <button
            onClick={() => setMode('markup')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'markup' ? 'bg-white shadow-xs text-[#146C43] font-semibold' : 'text-[#787875] hover:text-[#191918]'
            }`}
          >
            Markup
          </button>
          <button
            onClick={() => setMode('margin')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'margin' ? 'bg-white shadow-xs text-[#146C43] font-semibold' : 'text-[#787875] hover:text-[#191918]'
            }`}
          >
            Margin
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'split' ? 'bg-white shadow-xs text-[#146C43] font-semibold' : 'text-[#787875] hover:text-[#191918]'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setMode('convert')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'convert' ? 'bg-white shadow-xs text-[#146C43] font-semibold' : 'text-[#787875] hover:text-[#191918]'
            }`}
          >
            Convert
          </button>
        </div>

        {/* Mode Content */}
        <div className="p-4">
          {mode === 'standard' && (
            <div className="space-y-3">
              {/* Screen */}
              <div className="bg-[#FBFBFA] border border-[#E8E8E6] rounded-lg p-3 text-right">
                <div className="text-[11px] text-[#787875] h-4 font-mono">
                  {calcState.prevValue !== null ? `${calcState.prevValue} ${calcState.operation || ''}` : ''}
                </div>
                <div className="text-2xl font-bold font-mono text-[#191918] truncate">
                  {calcState.display}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-1.5 font-medium text-sm">
                <button type="button" onClick={() => dispatch({ type: 'CLEAR' })} title="Clear (C or Del)" className="p-3 bg-[#F5F5F3] hover:bg-[#EBEBE8] rounded text-[#C0392B] cursor-pointer active:scale-95 transition-transform">C</button>
                <button type="button" onClick={() => dispatch({ type: 'BACKSPACE' })} title="Backspace" className="p-3 bg-[#F5F5F3] hover:bg-[#EBEBE8] rounded text-[#595956] cursor-pointer active:scale-95 transition-transform">⌫</button>
                <button type="button" onClick={() => dispatch({ type: 'PERCENT' })} title="Percent (%)" className="p-3 bg-[#F5F5F3] hover:bg-[#EBEBE8] rounded text-[#595956] cursor-pointer active:scale-95 transition-transform">%</button>
                <button type="button" onClick={() => dispatch({ type: 'OPERATION', op: '÷' })} title="Divide (/)" className="p-3 bg-[#F5F5F3] hover:bg-[#EBEBE8] rounded text-[#146C43] cursor-pointer active:scale-95 transition-transform">÷</button>

                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '7' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">7</button>
                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '8' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">8</button>
                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '9' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">9</button>
                <button type="button" onClick={() => dispatch({ type: 'OPERATION', op: '×' })} title="Multiply (*)" className="p-3 bg-[#F5F5F3] hover:bg-[#EBEBE8] rounded text-[#146C43] cursor-pointer active:scale-95 transition-transform">×</button>

                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '4' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">4</button>
                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '5' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">5</button>
                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '6' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">6</button>
                <button type="button" onClick={() => dispatch({ type: 'OPERATION', op: '-' })} title="Subtract (-)" className="p-3 bg-[#F5F5F3] hover:bg-[#EBEBE8] rounded text-[#146C43] cursor-pointer active:scale-95 transition-transform">-</button>

                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '1' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">1</button>
                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '2' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">2</button>
                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '3' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">3</button>
                <button type="button" onClick={() => dispatch({ type: 'OPERATION', op: '+' })} title="Add (+)" className="p-3 bg-[#F5F5F3] hover:bg-[#EBEBE8] rounded text-[#146C43] cursor-pointer active:scale-95 transition-transform">+</button>

                <button type="button" onClick={() => dispatch({ type: 'DIGIT', digit: '0' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] col-span-2 cursor-pointer active:scale-95 transition-transform">0</button>
                <button type="button" onClick={() => dispatch({ type: 'DECIMAL' })} className="p-3 bg-white border border-[#E8E8E6] hover:bg-[#F9F9F8] rounded text-[#191918] cursor-pointer active:scale-95 transition-transform">.</button>
                <button type="button" onClick={() => dispatch({ type: 'EQUALS' })} title="Calculate (Enter or =)" className="p-3 bg-[#146C43] hover:bg-[#0F5132] text-white rounded font-bold flex items-center justify-center cursor-pointer active:scale-95 transition-transform">=</button>
              </div>

              {/* Record button */}
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(calcState.display);
                  if (!isNaN(val) && val > 0) {
                    onRecordAmount(val, 'Calculated amount');
                    onClose();
                  }
                }}
                className="w-full mt-2 py-2 text-xs font-medium text-[#146C43] bg-[#EBF5F0] hover:bg-[#DFEFE7] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Record this amount</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Discount Mode */}
          {mode === 'discount' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Original Price ({currency})
                </label>
                <input
                  type="number"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>

              <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-1 mt-2">
                <div className="flex justify-between text-xs text-[#787875]">
                  <span>Discount saved:</span>
                  <span className="text-[#C0392B] font-medium">{formatMoney(discountSaved, currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#191918] pt-1 border-t border-[#F0F0EE]">
                  <span>Final Price:</span>
                  <span className="text-[#146C43]">{formatMoney(discountFinal, currency)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onRecordAmount(discountFinal, `Discounted price (${discountPercent}% off)`);
                  onClose();
                }}
                className="w-full py-2 text-xs font-medium text-white bg-[#146C43] hover:bg-[#0F5132] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span>Record {formatMoney(discountFinal, currency)}</span>
              </button>
            </div>
          )}

          {/* Markup Mode */}
          {mode === 'markup' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Cost ({currency})
                </label>
                <input
                  type="number"
                  value={markupCost}
                  onChange={(e) => setMarkupCost(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Markup (%)
                </label>
                <input
                  type="number"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>

              <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-1 mt-2">
                <div className="flex justify-between text-xs text-[#787875]">
                  <span>Gross Profit:</span>
                  <span className="text-[#146C43] font-medium">{formatMoney(markupProfit, currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#191918] pt-1 border-t border-[#F0F0EE]">
                  <span>Selling Price:</span>
                  <span className="text-[#146C43]">{formatMoney(markupSelling, currency)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onRecordAmount(markupSelling, `Markup selling price`);
                  onClose();
                }}
                className="w-full py-2 text-xs font-medium text-white bg-[#146C43] hover:bg-[#0F5132] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span>Record {formatMoney(markupSelling, currency)}</span>
              </button>
            </div>
          )}

          {/* Margin Mode */}
          {mode === 'margin' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Selling Price / Revenue ({currency})
                </label>
                <input
                  type="number"
                  value={marginRevenue}
                  onChange={(e) => setMarginRevenue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Cost ({currency})
                </label>
                <input
                  type="number"
                  value={marginCost}
                  onChange={(e) => setMarginCost(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>

              <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-1 mt-2">
                <div className="flex justify-between text-xs text-[#787875]">
                  <span>Gross Profit:</span>
                  <span className="text-[#191918] font-medium">{formatMoney(marginProfit, currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#191918] pt-1 border-t border-[#F0F0EE]">
                  <span>Profit Margin:</span>
                  <span className="text-[#146C43]">{marginPercentValue}%</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onRecordAmount(marginProfit, `Gross profit`);
                  onClose();
                }}
                className="w-full py-2 text-xs font-medium text-white bg-[#146C43] hover:bg-[#0F5132] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span>Record Profit {formatMoney(marginProfit, currency)}</span>
              </button>
            </div>
          )}

          {/* Split Mode */}
          {mode === 'split' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Total Amount ({currency})
                </label>
                <input
                  type="number"
                  value={splitTotal}
                  onChange={(e) => setSplitTotal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Number of Shares / Persons
                </label>
                <input
                  type="number"
                  min={1}
                  value={splitCount}
                  onChange={(e) => setSplitCount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>

              <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-1 mt-2">
                <div className="flex justify-between text-sm font-bold text-[#191918]">
                  <span>Each Share:</span>
                  <span className="text-[#146C43]">{formatMoney(splitPerPerson, currency)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onRecordAmount(splitPerPerson, `Split share (1/${sCount})`);
                  onClose();
                }}
                className="w-full py-2 text-xs font-medium text-white bg-[#146C43] hover:bg-[#0F5132] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span>Record {formatMoney(splitPerPerson, currency)}</span>
              </button>
            </div>
          )}

          {/* Currency Converter Mode */}
          {mode === 'convert' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#787875] mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={convAmount}
                  onChange={(e) => setConvAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[#787875] mb-1">
                    From
                  </label>
                  <select
                    value={convFrom}
                    onChange={(e) => setConvFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D2] rounded-lg text-xs"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#787875] mb-1">
                    To
                  </label>
                  <select
                    value={convTo}
                    onChange={(e) => setConvTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D2] rounded-lg text-xs"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const num = parseFloat(convAmount) || 0;
                const converted = convertAmount(num, convFrom, convTo);
                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-1 mt-1">
                      <div className="text-xs text-[#787875]">
                        {formatCurrency(num, convFrom)} equals:
                      </div>
                      <div className="text-lg font-bold text-[#146C43] tabular-nums">
                        {formatCurrency(converted, convTo)}
                      </div>
                      <div className="text-[10px] text-[#9A9A96]">
                        Using open exchange benchmark rate
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onRecordAmount(converted, `Converted ${num} ${convFrom} to ${convTo}`);
                        onClose();
                      }}
                      className="w-full py-2 text-xs font-medium text-white bg-[#146C43] hover:bg-[#0F5132] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Record {formatCurrency(converted, convTo)}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
