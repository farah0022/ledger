import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Check, 
  Plus, 
  Trash2, 
  Sliders, 
  FileText, 
  Building2, 
  CreditCard, 
  Receipt, 
  Percent, 
  Calendar,
  PenTool,
  HelpCircle
} from 'lucide-react';
import { BusinessRecord, BusinessSettings } from '../types';
import { formatMoney, formatDisplayDate, getTodayStr } from '../utils/formatters';
import { generateInvoicePDF, InvoiceItem, InvoiceData } from '../utils/pdfInvoiceGenerator';
import { BrandLogo } from './BrandLogo';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BusinessRecord | null;
  settings: BusinessSettings;
  onSaveInvoiceNumber?: (recordId: string, invoiceNum: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  record,
  settings,
  onSaveInvoiceNumber,
}) => {
  if (!isOpen || !record) return null;

  const defaultCurrency = settings.defaultCurrency || settings.currency || 'USD';

  // Core Invoice Fields
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    record.invoiceNumber || `${settings.invoicePrefix || 'INV-'}${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [issueDate, setIssueDate] = useState<string>(record.date || getTodayStr());
  const [clientName, setClientName] = useState<string>(record.clientOrParty || 'Valued Client');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  
  // Payment Terms & Due Date
  const [paymentTerms, setPaymentTerms] = useState<string>(settings.defaultPaymentTerms || 'due_on_receipt');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date(record.date || getTodayStr());
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Optional Feature Toggles
  const [showOptionsPanel, setShowOptionsPanel] = useState<boolean>(false);
  const [enableDueDate, setEnableDueDate] = useState<boolean>(true);
  const [enablePoNumber, setEnablePoNumber] = useState<boolean>(false);
  const [enableClientDetails, setEnableClientDetails] = useState<boolean>(false);
  const [enableTax, setEnableTax] = useState<boolean>(Boolean(settings.taxRateDefault && settings.taxRateDefault > 0));
  const [taxRate, setTaxRate] = useState<number>(settings.taxRateDefault || 10);
  const [enableDiscount, setEnableDiscount] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [enableBankDetails, setEnableBankDetails] = useState<boolean>(Boolean(settings.paymentDetails));
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [routingOrSwift, setRoutingOrSwift] = useState<string>('');
  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    settings.paymentDetails || 'Direct bank transfer or wire remittance. Please reference the invoice number.'
  );
  const [enableNotes, setEnableNotes] = useState<boolean>(Boolean(settings.invoiceNotes));
  const [notes, setNotes] = useState<string>(settings.invoiceNotes || 'Thank you for your prompt business.');
  const [terms, setTerms] = useState<string>('Payment is requested within the indicated term. Inquiries regarding this invoice should be directed to the billing contact above.');
  const [enableSignature, setEnableSignature] = useState<boolean>(false);
  const [signatoryName, setSignatoryName] = useState<string>(settings.businessName || '');

  // Line Items List (allows adding multiple items or editing current record item)
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      description: record.title || 'Professional Services',
      details: record.description || undefined,
      quantity: 1,
      unitPrice: record.amount || 0,
    }
  ]);

  const [copied, setCopied] = useState<boolean>(false);

  // Subtotal, Tax, Discount, Grand Total calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountVal = enableDiscount ? Math.max(0, discountAmount || 0) : 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxVal = enableTax ? taxableAmount * (taxRate / 100) : 0;
  const grandTotal = taxableAmount + taxVal;

  const invoiceData: InvoiceData = {
    invoiceNumber,
    issueDate: formatDisplayDate(issueDate),
    dueDate: enableDueDate ? formatDisplayDate(dueDate) : undefined,
    paymentTerms,
    poNumber: enablePoNumber ? poNumber : undefined,
    status: record.direction === 'received' ? 'paid' : 'due',
    clientName,
    clientEmail: enableClientDetails ? clientEmail : undefined,
    clientAddress: enableClientDetails ? clientAddress : undefined,
    businessName: settings.businessName?.trim() || '',
    businessLogo: settings.businessLogo?.trim() || undefined,
    contactInfo: settings.contactInfo?.trim() || '',
    items,
    currency: defaultCurrency,
    enableTax,
    taxRate,
    enableDiscount,
    discountAmount,
    enableBankDetails,
    bankName: enableBankDetails ? bankName : undefined,
    accountNumber: enableBankDetails ? accountNumber : undefined,
    routingOrSwift: enableBankDetails ? routingOrSwift : undefined,
    paymentInstructions: enableBankDetails ? paymentInstructions : undefined,
    notes: enableNotes ? notes : undefined,
    terms: enableNotes ? terms : undefined,
    enableSignature,
    signatoryName: enableSignature ? signatoryName : undefined,
  };

  // 1. Separate Download PDF function (Client-side vector PDF generation via jsPDF)
  const handleDownloadPDF = () => {
    if (record.id && onSaveInvoiceNumber) {
      onSaveInvoiceNumber(record.id, invoiceNumber);
    }
    const doc = generateInvoicePDF(invoiceData);
    doc.save(`${invoiceNumber.trim() || 'invoice'}.pdf`);
  };

  // 2. Separate Native Print function
  const handlePrint = () => {
    if (record.id && onSaveInvoiceNumber) {
      onSaveInvoiceNumber(record.id, invoiceNumber);
    }
    const originalTitle = document.title;
    document.title = `${invoiceNumber} - ${settings.businessName || 'Invoice'}`;
    window.print();
    document.title = originalTitle;
  };

  // 3. Quick Copy Info
  const handleCopyText = () => {
    const text = `INVOICE ${invoiceNumber}\n${settings.businessName}\nDate: ${formatDisplayDate(issueDate)}${enableDueDate ? `\nDue: ${formatDisplayDate(dueDate)}` : ''}\nClient: ${clientName}\nTotal Due: ${formatMoney(grandTotal, defaultCurrency)}\n${enableBankDetails && paymentInstructions ? `Payment: ${paymentInstructions}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Line Item Management
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: 'Additional Service / Deliverable',
        quantity: 1,
        unitPrice: 0,
      }
    ]);
  };

  const handleUpdateItem = (id: string, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div
      id="invoice-modal-backdrop"
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="invoice-modal-dialog"
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50/70 no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm text-slate-800">Invoice Document</span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#EBF5F0] text-[#146C43] border border-[#146C43]/20 font-medium">
              Ready to print or save
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Customize / Optional Features Toggle */}
            <button
              type="button"
              onClick={() => setShowOptionsPanel(!showOptionsPanel)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showOptionsPanel 
                  ? 'bg-[#EBF5F0] border-[#146C43]/30 text-[#146C43]' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Add optional features like Tax, Discount, Due Date, Bank Details, and Custom Items"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showOptionsPanel ? 'Hide Options' : 'Invoice Options'}</span>
            </button>

            {/* Copy Info Button */}
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-transparent"
              title="Copy invoice details to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#146C43]" /> : null}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* SEPARATE BUTTON 1: Download PDF */}
            <button
              id="download-pdf-invoice-btn"
              type="button"
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#146C43] hover:bg-[#0F5132] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download standalone vector PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {/* SEPARATE BUTTON 2: Print Invoice */}
            <button
              id="print-invoice-btn"
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Open browser print dialog"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            {/* Close button */}
            <button
              id="close-invoice-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Features Drawer / Settings Panel (when toggled) */}
        {showOptionsPanel && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 overflow-y-auto max-h-56 no-print space-y-3.5 text-xs text-slate-700">
            <div className="flex items-center justify-between font-semibold text-slate-800 text-xs">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#146C43]" />
                Optional Features & Customization
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Changes reflect in real-time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Due Date & Terms */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableDueDate}
                    onChange={(e) => setEnableDueDate(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>Payment Due Date</span>
                </label>
                {enableDueDate && (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                  />
                )}
              </div>

              {/* Tax / VAT Rate */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableTax}
                    onChange={(e) => setEnableTax(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>Sales Tax / VAT (%)</span>
                </label>
                {enableTax && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                      placeholder="e.g. 10"
                    />
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableDiscount}
                    onChange={(e) => setEnableDiscount(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>Discount Amount</span>
                </label>
                {enableDiscount && (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                    placeholder={`e.g. 50 ${defaultCurrency}`}
                  />
                )}
              </div>

              {/* PO Number */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enablePoNumber}
                    onChange={(e) => setEnablePoNumber(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>PO / Reference #</span>
                </label>
                {enablePoNumber && (
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-84920"
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                  />
                )}
              </div>

              {/* Client Extra Details */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableClientDetails}
                    onChange={(e) => setEnableClientDetails(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>Client Email / Address</span>
                </label>
                {enableClientDetails && (
                  <div className="space-y-1.5">
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                    />
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="123 Business Way, City"
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Signature Line */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableSignature}
                    onChange={(e) => setEnableSignature(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>Authorized Signature</span>
                </label>
                {enableSignature && (
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Signatory Name / Title"
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                  />
                )}
              </div>
            </div>

            {/* Bank details & Notes configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableBankDetails}
                    onChange={(e) => setEnableBankDetails(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>Bank & Remittance Details</span>
                </label>
                {enableBankDetails && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank Name"
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                      />
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Account / IBAN"
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                      />
                    </div>
                    <input
                      type="text"
                      value={routingOrSwift}
                      onChange={(e) => setRoutingOrSwift(e.target.value)}
                      placeholder="SWIFT / Routing Code"
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                    />
                    <textarea
                      rows={2}
                      value={paymentInstructions}
                      onChange={(e) => setPaymentInstructions(e.target.value)}
                      placeholder="Remittance / Mobile Money / PayPal instructions"
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableNotes}
                    onChange={(e) => setEnableNotes(e.target.checked)}
                    className="rounded border-slate-300 accent-[#146C43] text-[#146C43] focus:ring-[#146C43]"
                  />
                  <span>Invoice Notes & Terms</span>
                </label>
                {enableNotes && (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Invoice Note (e.g. Thank you for your business)"
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                    />
                    <textarea
                      rows={2}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="Terms & Conditions (e.g. Net 15 days)"
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Printable Document Paper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70">
          <div
            id="printable-invoice"
            className="max-w-2xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-sm border border-slate-200/90 text-slate-800 text-sm"
          >
            {/* Header: Business & Invoice Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
              <div className="flex items-start gap-3.5">
                {settings.businessLogo && settings.businessLogo.trim() && (
                  <BrandLogo
                    logoUrl={settings.businessLogo}
                    businessName={settings.businessName}
                    size="lg"
                    className="shrink-0 mt-0.5"
                    badgeClassName="shadow-none border-slate-200"
                  />
                )}
                {(settings.businessName?.trim() || settings.contactInfo?.trim()) ? (
                  <div>
                    {settings.businessName?.trim() && (
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {settings.businessName.trim()}
                      </h1>
                    )}
                    {settings.contactInfo?.trim() && (
                      <p className="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                        {settings.contactInfo.trim()}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-xs uppercase tracking-wider text-[#146C43] font-bold">
                  Invoice
                </div>
                <div className="text-base font-mono font-semibold text-slate-900 mt-0.5">
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="font-mono text-base font-semibold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-[#146C43] outline-none w-36 text-left sm:text-right no-print"
                  />
                  <span className="hidden print:inline">{invoiceNumber}</span>
                </div>

                <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                  <div>Date: <span className="font-medium text-slate-700">{formatDisplayDate(issueDate)}</span></div>
                  {enableDueDate && (
                    <div>Due: <span className="font-medium text-slate-700">{formatDisplayDate(dueDate)}</span></div>
                  )}
                  {enablePoNumber && poNumber && (
                    <div>PO Ref: <span className="font-mono font-medium text-slate-700">{poNumber}</span></div>
                  )}
                </div>

                <div className="mt-2.5">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                      record.direction === 'received'
                        ? 'bg-[#EBF5F0] text-[#146C43] border border-[#146C43]/20'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {record.direction === 'received' ? 'Paid / Settled' : 'Payment Expected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To & Client Details */}
            <div className="py-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Billed To
                </div>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="font-semibold text-base text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-[#146C43] outline-none w-full max-w-sm no-print"
                  placeholder="Client Name or Company"
                />
                <span className="hidden print:inline font-semibold text-base text-slate-900">
                  {clientName}
                </span>

                {enableClientDetails && (
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {clientEmail && <div>{clientEmail}</div>}
                    {clientAddress && <div>{clientAddress}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-5">
              <div className="flex items-center justify-between mb-2 no-print">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Itemized Charges
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs text-[#146C43] hover:text-[#0F5132] font-medium flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-[#EBF5F0] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50/60">
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-3 text-center font-semibold w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-28">Rate</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-28">Amount</th>
                    <th className="py-2.5 px-2 w-8 no-print"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const rowTotal = item.quantity * item.unitPrice;
                    return (
                      <tr key={item.id} className="group">
                        <td className="py-3 px-3 align-top">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            className="font-medium text-slate-900 bg-transparent border-b border-transparent focus:border-[#146C43] outline-none w-full text-xs sm:text-sm no-print"
                            placeholder="Item name / description"
                          />
                          <span className="hidden print:inline font-medium text-slate-900">
                            {item.description}
                          </span>
                          <input
                            type="text"
                            value={item.details || ''}
                            onChange={(e) => handleUpdateItem(item.id, { details: e.target.value })}
                            className="text-xs text-slate-500 bg-transparent border-b border-transparent focus:border-slate-300 outline-none w-full mt-0.5 no-print"
                            placeholder="Optional line notes or milestones"
                          />
                          {item.details && (
                            <div className="hidden print:block text-xs text-slate-500 mt-0.5">
                              {item.details}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-12 text-center text-xs font-mono bg-slate-50 border border-slate-200 rounded py-0.5 outline-none focus:border-[#146C43] no-print"
                          />
                          <span className="hidden print:inline text-xs font-mono">{item.quantity}</span>
                        </td>
                        <td className="py-3 px-3 align-top text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-24 text-right text-xs font-mono bg-slate-50 border border-slate-200 rounded py-0.5 px-1 outline-none focus:border-[#146C43] no-print"
                          />
                          <span className="hidden print:inline text-xs font-mono">
                            {formatMoney(item.unitPrice, defaultCurrency)}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono font-semibold text-slate-900 text-xs sm:text-sm">
                          {formatMoney(rowTotal, defaultCurrency)}
                        </td>
                        <td className="py-3 px-2 align-top text-right no-print">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                <div className="w-full max-w-xs space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium text-slate-800">
                      {formatMoney(subtotal, defaultCurrency)}
                    </span>
                  </div>

                  {enableDiscount && discountVal > 0 && (
                    <div className="flex justify-between items-center text-rose-600">
                      <span>Discount</span>
                      <span className="font-mono font-medium">
                        - {formatMoney(discountVal, defaultCurrency)}
                      </span>
                    </div>
                  )}

                  {enableTax && taxRate > 0 && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Sales Tax / VAT ({taxRate}%)</span>
                      <span className="font-mono font-medium text-slate-800">
                        {formatMoney(taxVal, defaultCurrency)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg">
                    <span>Total Due</span>
                    <span className="font-mono text-base text-[#146C43]">
                      {formatMoney(grandTotal, defaultCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Bank Remittance Instructions */}
            {enableBankDetails && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Payment Instructions & Remittance
                </div>
                <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-700">
                  {bankName && (
                    <div>Bank Name: <span className="font-semibold text-slate-900">{bankName}</span></div>
                  )}
                  {accountNumber && (
                    <div>Account / IBAN: <span className="font-mono font-semibold text-slate-900">{accountNumber}</span></div>
                  )}
                  {routingOrSwift && (
                    <div>SWIFT / Routing: <span className="font-mono font-semibold text-slate-900">{routingOrSwift}</span></div>
                  )}
                  {paymentInstructions && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {paymentInstructions}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notes & Terms */}
            {enableNotes && (notes || terms) && (
              <div className="mt-5 pt-4 border-t border-slate-200 space-y-2 text-xs">
                {notes && (
                  <div>
                    <span className="font-semibold text-slate-800">Note: </span>
                    <span className="text-slate-600">{notes}</span>
                  </div>
                )}
                {terms && (
                  <div className="text-[11px] text-slate-500 leading-relaxed italic">
                    {terms}
                  </div>
                )}
              </div>
            )}

            {/* Signature Block */}
            {enableSignature && (
              <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                <div className="w-56 text-center">
                  <div className="border-b border-dashed border-slate-400 h-8 mb-1"></div>
                  <div className="text-xs font-medium text-slate-700">Authorized Signature & Date</div>
                  {signatoryName && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{signatoryName}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
