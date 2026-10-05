import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  FileText, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  ArrowRight,
  Image as ImageIcon,
  Upload,
  Trash2
} from 'lucide-react';
import { RecordType, PaymentDirection, BusinessRecord, PaymentPlan, RecurringFrequency, BusinessSettings } from '../types';
import { getTodayStr, calculatePaymentPlan } from '../utils/formatters';
import { SUPPORTED_CURRENCIES, formatCurrency } from '../utils/currency';
import { findPotentialDuplicate, DEFAULT_SETTINGS } from '../utils/storage';
import { useI18n } from '../utils/i18n';
import { ImageLightboxModal } from './ImageLightboxModal';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<BusinessRecord, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => void;
  initialRecord?: BusinessRecord | null;
  settings?: BusinessSettings;
  currency?: string;
}

// Client-side image compression to safely store pictures in local database
function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  settings,
  currency: propCurrency,
}) => {
  const effectiveSettings = settings || DEFAULT_SETTINGS;
  const effectiveLanguage = effectiveSettings.language || 'en';
  const { t } = useI18n(effectiveLanguage);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Core Record fields
  const [type, setType] = useState<RecordType>('money_in');
  const [amount, setAmount] = useState<string>('');
  const [recordCurrency, setRecordCurrency] = useState<string>(effectiveSettings.defaultCurrency || 'USD');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayStr());
  const [time, setTime] = useState<string>('');
  const [direction, setDirection] = useState<PaymentDirection>('received');
  
  // Pictures attachments state
  const [images, setImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Progressive disclosure options
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [clientOrParty, setClientOrParty] = useState<string>('');
  
  // Payment plan options
  const [enablePaymentPlan, setEnablePaymentPlan] = useState<boolean>(false);
  const [installmentAmount, setInstallmentAmount] = useState<string>('');
  const [planFrequency, setPlanFrequency] = useState<'monthly' | 'weekly'>('monthly');

  // Recurring options
  const [enableRecurring, setEnableRecurring] = useState<boolean>(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>('monthly');
  const [recurringDay, setRecurringDay] = useState<number>(25);

  // Reminder options
  const [reminderDays, setReminderDays] = useState<number>(1);

  // Duplicate warning state
  const [duplicateMatch, setDuplicateMatch] = useState<BusinessRecord | null>(null);
  const [dismissDuplicate, setDismissDuplicate] = useState<boolean>(false);

  // Errors
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDismissDuplicate(false);

      if (initialRecord) {
        setType(initialRecord.type);
        setAmount(initialRecord.amount !== undefined ? String(initialRecord.amount) : '');
        setRecordCurrency(initialRecord.currency || effectiveSettings.defaultCurrency || 'USD');
        setTitle(initialRecord.title || '');
        setDescription(initialRecord.description || '');
        setDate(initialRecord.date || getTodayStr());
        setTime(initialRecord.time || '');
        setDirection(initialRecord.direction || (initialRecord.type === 'money_in' ? 'received' : 'paid'));
        setClientOrParty(initialRecord.clientOrParty || '');
        setImages(initialRecord.images || []);
        
        if (initialRecord.paymentPlan) {
          setEnablePaymentPlan(true);
          setInstallmentAmount(String(initialRecord.paymentPlan.installmentAmount));
          setPlanFrequency(initialRecord.paymentPlan.frequency === 'weekly' ? 'weekly' : 'monthly');
          setShowMoreOptions(true);
        } else {
          setEnablePaymentPlan(false);
          setInstallmentAmount('');
        }

        if (initialRecord.recurring && initialRecord.recurring.frequency !== 'none') {
          setEnableRecurring(true);
          setRecurringFreq(initialRecord.recurring.frequency);
          setRecurringDay(initialRecord.recurring.dayOfMonth || 25);
          setShowMoreOptions(true);
        } else {
          setEnableRecurring(false);
        }

        if (initialRecord.reminderDaysBefore !== undefined) {
          setReminderDays(initialRecord.reminderDaysBefore);
        }
      } else {
        // Reset defaults for new record
        setType('money_in');
        setAmount('');
        setRecordCurrency(propCurrency || effectiveSettings.defaultCurrency || 'USD');
        setTitle('');
        setDescription('');
        setDate(getTodayStr());
        setTime('');
        setDirection('received');
        setClientOrParty('');
        setImages([]);
        setEnablePaymentPlan(false);
        setInstallmentAmount('');
        setEnableRecurring(false);
        setShowMoreOptions(false);
      }
    }
  }, [isOpen, initialRecord, effectiveSettings, propCurrency]);

  // Duplicate transaction check
  useEffect(() => {
    if (!effectiveSettings.autoDetectDuplicates || dismissDuplicate) {
      setDuplicateMatch(null);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || !title.trim() || !date) {
      setDuplicateMatch(null);
      return;
    }

    const match = findPotentialDuplicate({
      amount: parsedAmount,
      title,
      date,
      currency: recordCurrency,
      excludeId: initialRecord?.id,
    });

    setDuplicateMatch(match);
  }, [amount, title, date, recordCurrency, effectiveSettings.autoDetectDuplicates, dismissDuplicate, initialRecord]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i]);
        newImages.push(compressed);
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error('Failed to read image', err);
      setError('Could not process image attachment');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isMoneyType = type === 'money_in' || type === 'money_out' || type === 'payment';
    const parsedAmount = parseFloat(amount);

    if (isMoneyType) {
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Please enter a valid amount.');
        return;
      }
    }

    if (!date) {
      setError('Please choose a valid date.');
      return;
    }

    const finalTitle = title.trim() || (isMoneyType ? `${recordCurrency} ${parsedAmount}` : 'Untitled Record');

    let paymentPlanData: PaymentPlan | undefined = undefined;
    if (type === 'payment' && enablePaymentPlan && parsedAmount > 0) {
      const parsedInstallment = parseFloat(installmentAmount) || Math.round(parsedAmount / 3);
      paymentPlanData = {
        totalAmount: parsedAmount,
        installmentAmount: parsedInstallment,
        frequency: planFrequency,
        firstDueDate: date,
        paidAmount: initialRecord?.paymentPlan?.paidAmount || 0,
      };
    }

    const payload: Omit<BusinessRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      type,
      title: finalTitle,
      description: description.trim() || undefined,
      amount: isMoneyType ? parsedAmount : undefined,
      currency: recordCurrency,
      date,
      time: time.trim() || undefined,
      images: images.length > 0 ? images : undefined,
      direction:
        type === 'money_in'
          ? 'received'
          : type === 'money_out'
          ? 'paid'
          : type === 'payment'
          ? direction
          : undefined,
      clientOrParty: clientOrParty.trim() || undefined,
      paymentPlan: paymentPlanData,
      recurring: enableRecurring
        ? {
            frequency: recurringFreq,
            dayOfMonth: recurringDay,
          }
        : undefined,
      reminderDaysBefore: type === 'event' ? reminderDays : undefined,
      isCompleted:
        initialRecord?.isCompleted ??
        (type === 'money_in' ||
          type === 'money_out' ||
          direction === 'received' ||
          direction === 'paid'),
    };

    onSave(payload, initialRecord ? initialRecord.id : undefined);
    onClose();
  };

  const planPreview =
    type === 'payment' && enablePaymentPlan && parseFloat(amount) > 0 && parseFloat(installmentAmount) > 0
      ? calculatePaymentPlan({
          totalAmount: parseFloat(amount),
          installmentAmount: parseFloat(installmentAmount),
          frequency: planFrequency,
          firstDueDate: date,
        })
      : null;

  return (
    <>
      <div
        id="record-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      >
        <div
          id="record-modal-card"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl max-h-[90vh] bg-white border border-[#E8E8E6] rounded-xl shadow-xl flex flex-col overflow-hidden text-[#191918]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F0EE]">
            <h2 className="text-sm font-semibold text-[#191918]">
              {initialRecord ? 'Edit Record' : 'New Record'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#787875] hover:text-[#191918] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="p-2.5 rounded-lg bg-[#FFF2F0] border border-[#FFCCC7] text-xs text-[#D9363E]">
                {error}
              </div>
            )}

            {/* Duplicate Notice */}
            {duplicateMatch && (
              <div className="p-3 rounded-lg bg-[#FFFBE6] border border-[#FFE58F] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-[#D48806]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Potential Duplicate Transaction</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissDuplicate(true)}
                    className="text-[#8C8C8C] hover:text-[#191918] text-[11px] underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[#595956]">
                  A record with amount <strong>{formatCurrency(duplicateMatch.amount || 0, duplicateMatch.currency || recordCurrency)}</strong> titled &ldquo;{duplicateMatch.title}&rdquo; already exists on {duplicateMatch.date}.
                </p>
              </div>
            )}

            {/* Record Type Selector Tabs */}
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#F5F5F3] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setType('money_in');
                  setDirection('received');
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all cursor-pointer ${
                  type === 'money_in'
                    ? 'bg-white text-[#146C43] shadow-2xs font-semibold'
                    : 'text-[#787875] hover:text-[#191918]'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-[#146C43]" />
                <span>Money In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('money_out');
                  setDirection('paid');
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all cursor-pointer ${
                  type === 'money_out'
                    ? 'bg-white text-[#C0392B] shadow-2xs font-semibold'
                    : 'text-[#787875] hover:text-[#191918]'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-[#C0392B]" />
                <span>Money Out</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('payment');
                  setDirection('due');
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all cursor-pointer ${
                  type === 'payment'
                    ? 'bg-white text-[#B45309] shadow-2xs font-semibold'
                    : 'text-[#787875] hover:text-[#191918]'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#B45309]" />
                <span>Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setType('event')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all cursor-pointer ${
                  type === 'event'
                    ? 'bg-white text-[#191918] shadow-2xs font-semibold'
                    : 'text-[#787875] hover:text-[#191918]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#787875]" />
                <span>Event</span>
              </button>

              <button
                type="button"
                onClick={() => setType('note')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all cursor-pointer ${
                  type === 'note'
                    ? 'bg-white text-[#191918] shadow-2xs font-semibold'
                    : 'text-[#787875] hover:text-[#191918]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#787875]" />
                <span>Note</span>
              </button>
            </div>

            {/* Payment Direction Sub-selector */}
            {type === 'payment' && (
              <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-2">
                <span className="text-xs font-semibold text-[#191918] block">Payment Status & Direction:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    direction === 'paid' ? 'bg-white border-[#C0392B] text-[#C0392B] font-semibold' : 'bg-white/60 border-[#E8E8E6] text-[#595956] hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="payment_direction"
                      value="paid"
                      checked={direction === 'paid'}
                      onChange={() => setDirection('paid')}
                      className="accent-[#C0392B]"
                    />
                    <span>Paid (Money Spent)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    direction === 'received' ? 'bg-white border-[#146C43] text-[#146C43] font-semibold' : 'bg-white/60 border-[#E8E8E6] text-[#595956] hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="payment_direction"
                      value="received"
                      checked={direction === 'received'}
                      onChange={() => setDirection('received')}
                      className="accent-[#146C43]"
                    />
                    <span>Received (Money In)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    direction === 'due' ? 'bg-white border-[#B45309] text-[#B45309] font-semibold' : 'bg-white/60 border-[#E8E8E6] text-[#595956] hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="payment_direction"
                      value="due"
                      checked={direction === 'due'}
                      onChange={() => setDirection('due')}
                      className="accent-[#B45309]"
                    />
                    <span>We Owe (Upcoming Bill)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    direction === 'expected' ? 'bg-white border-[#2C5282] text-[#2C5282] font-semibold' : 'bg-white/60 border-[#E8E8E6] text-[#595956] hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="payment_direction"
                      value="expected"
                      checked={direction === 'expected'}
                      onChange={() => setDirection('expected')}
                      className="accent-[#2C5282]"
                    />
                    <span>Expected (Upcoming Invoice)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Amount and Currency Row */}
            {(type === 'money_in' || type === 'money_out' || type === 'payment') && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#787875]">
                  {t('common.amount')} <span className="text-[#C0392B]">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      required
                      autoFocus
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-lg font-mono font-medium text-[#191918] focus:outline-hidden focus:border-[#146C43] transition-colors"
                    />
                  </div>
                  <select
                    value={recordCurrency}
                    onChange={(e) => setRecordCurrency(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-xs font-semibold text-[#191918] focus:outline-hidden focus:border-[#146C43] cursor-pointer"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Title / Description */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#787875]">
                {t('common.title')} / Description
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'money_in'
                    ? 'e.g. Website development milestone'
                    : type === 'money_out'
                    ? 'e.g. Cloud hosting servers'
                    : type === 'payment'
                    ? 'e.g. Packaging batch invoice'
                    : type === 'event'
                    ? 'e.g. Client strategy meeting'
                    : 'e.g. Workshop inventory notes'
                }
                className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-sm text-[#191918] placeholder:text-[#AFAFAF] focus:outline-hidden focus:border-[#146C43] transition-colors"
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#787875]">
                  Date <span className="text-[#C0392B]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-xs text-[#191918] focus:outline-hidden focus:border-[#146C43]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#787875]">
                  Time (optional)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-xs text-[#191918] focus:outline-hidden focus:border-[#146C43]"
                />
              </div>
            </div>

            {/* Pictures / Photo Attachments */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#787875] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#146C43]" />
                  <span>Pictures & Attachments</span>
                  {images.length > 0 && <span className="text-[10px] text-[#787875]">({images.length})</span>}
                </label>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#146C43] hover:text-[#0F5132] cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Attach Picture</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Thumbnails grid */}
              {images.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-lg border border-[#E8E8E6] overflow-hidden bg-[#F5F5F3] cursor-pointer shadow-2xs"
                      onClick={() => setLightboxIndex(idx)}
                    >
                      <img
                        src={imgUrl}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(idx);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                        title="Remove picture"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border border-dashed border-[#D5D5D2] hover:border-[#146C43] hover:bg-[#FBFBFA] flex flex-col items-center justify-center text-[#787875] hover:text-[#146C43] transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px]">Add photo</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border border-dashed border-[#D5D5D2] hover:border-[#146C43] rounded-lg bg-[#FDFDFD] hover:bg-[#FBFBFA] flex items-center justify-center gap-2 text-xs text-[#787875] hover:text-[#146C43] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Click to attach photo, receipt, or invoice</span>
                </div>
              )}
            </div>

            {/* Progressive Disclosure: More Details & Advanced Rules */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="text-xs font-semibold text-[#146C43] hover:text-[#0F5132] flex items-center gap-1 cursor-pointer"
              >
                <span>{showMoreOptions ? 'Fewer details' : 'More options (Party, recurring, installments)'}</span>
                {showMoreOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showMoreOptions && (
              <div className="space-y-4 pt-2 border-t border-[#F0F0EE] animate-in fade-in duration-100">
                {/* Client or Party */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#787875]">
                    Client / Supplier / Party
                  </label>
                  <input
                    type="text"
                    value={clientOrParty}
                    onChange={(e) => setClientOrParty(e.target.value)}
                    placeholder="e.g. Apex Global, Alpha Packaging, etc."
                    className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-xs text-[#191918]"
                  />
                </div>

                {/* Extended Description / Note */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#787875]">
                    Detailed Note
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional context or notes..."
                    className="w-full px-3 py-2 bg-white border border-[#D5D5D2] rounded-lg text-xs text-[#191918] resize-none"
                  />
                </div>

                {/* Payment Plan (for Payment type) */}
                {type === 'payment' && (
                  <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-[#191918]">Payment Plan / Installments</span>
                        <p className="text-[11px] text-[#787875]">Split this total into regular installments</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={enablePaymentPlan}
                        onChange={(e) => setEnablePaymentPlan(e.target.checked)}
                        className="w-4 h-4 accent-[#146C43] rounded cursor-pointer"
                      />
                    </div>

                    {enablePaymentPlan && (
                      <div className="space-y-3 pt-2 border-t border-[#E8E8E6]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-[#787875] mb-1">
                              Installment Amount
                            </label>
                            <input
                              type="number"
                              value={installmentAmount}
                              onChange={(e) => setInstallmentAmount(e.target.value)}
                              placeholder="e.g. 3000"
                              className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D2] rounded text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-[#787875] mb-1">
                              Frequency
                            </label>
                            <select
                              value={planFrequency}
                              onChange={(e) => setPlanFrequency(e.target.value as 'monthly' | 'weekly')}
                              className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D2] rounded text-xs"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </div>
                        </div>

                        {planPreview && (
                          <div className="text-[11px] text-[#595956] space-y-1 bg-white p-2.5 rounded border border-[#E8E8E6]">
                            <div className="font-semibold text-[#146C43]">
                              Calculated: {planPreview.totalInstallmentsCount} installments
                            </div>
                            <div>
                              {planPreview.fullInstallmentsCount} payments of {formatCurrency(planPreview.installmentAmount, recordCurrency)}
                              {planPreview.finalPaymentAmount !== planPreview.installmentAmount && (
                                <span> + 1 final payment of {formatCurrency(planPreview.finalPaymentAmount, recordCurrency)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Recurring Schedule */}
                <div className="p-3 bg-[#FBFBFA] rounded-lg border border-[#E8E8E6] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#191918]">Recurring Schedule</span>
                      <p className="text-[11px] text-[#787875]">Automatically project future occurrences</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableRecurring}
                      onChange={(e) => setEnableRecurring(e.target.checked)}
                      className="w-4 h-4 accent-[#146C43] rounded cursor-pointer"
                    />
                  </div>

                  {enableRecurring && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E8E6]">
                      <div>
                        <label className="block text-[11px] font-medium text-[#787875] mb-1">
                          Frequency
                        </label>
                        <select
                          value={recurringFreq}
                          onChange={(e) => setRecurringFreq(e.target.value as RecurringFrequency)}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D2] rounded text-xs"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="weekly">Weekly</option>
                          <option value="daily">Daily</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      {recurringFreq === 'monthly' && (
                        <div>
                          <label className="block text-[11px] font-medium text-[#787875] mb-1">
                            Day of Month
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={recurringDay}
                            onChange={(e) => setRecurringDay(parseInt(e.target.value, 10))}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D2] rounded text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-4 border-t border-[#F0F0EE] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#595956] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#146C43] hover:bg-[#0F5132] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {initialRecord ? 'Update Record' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox for previewing attachments inside RecordModal */}
      {lightboxIndex !== null && (
        <ImageLightboxModal
          isOpen={true}
          onClose={() => setLightboxIndex(null)}
          images={images}
          initialIndex={lightboxIndex}
          title={title || 'Attached Picture'}
        />
      )}
    </>
  );
};
