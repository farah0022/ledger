import { jsPDF } from 'jspdf';
import { BusinessSettings } from '../types';

export interface InvoiceItem {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  paymentTerms?: string;
  poNumber?: string;
  status: 'paid' | 'due' | 'pending';

  // Client
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;

  // Business
  businessName: string;
  businessLogo?: string;
  contactInfo: string;

  // Items
  items: InvoiceItem[];
  currency: string;

  // Optional Add-ons
  enableTax: boolean;
  taxRate: number; // percentage, e.g. 10
  enableDiscount: boolean;
  discountAmount: number;

  // Payment info
  enableBankDetails: boolean;
  bankName?: string;
  accountNumber?: string;
  routingOrSwift?: string;
  paymentInstructions?: string;

  // Notes & terms
  notes?: string;
  terms?: string;

  // Signature
  enableSignature: boolean;
  signatoryName?: string;
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Palette
  const primaryColor = [30, 41, 59]; // slate-800
  const secondaryColor = [100, 116, 139]; // slate-500
  const accentColor = [20, 108, 67]; // #146C43 money green
  const borderColor = [226, 232, 240]; // slate-200
  const headerBgColor = [248, 250, 252]; // slate-50

  // 1. Top Bar / Document Header
  const contactLines = data.contactInfo && data.contactInfo.trim()
    ? data.contactInfo.trim().split('\n')
    : [];

  let leftY = y;
  const hasLogo = data.businessLogo && typeof data.businessLogo === 'string' && data.businessLogo.startsWith('data:image');
  const hasName = !!(data.businessName && data.businessName.trim());
  const cleanBusinessName = hasName ? data.businessName.trim() : '';

  if (hasLogo) {
    try {
      const isPng = (data.businessLogo as string).includes('image/png');
      doc.addImage(data.businessLogo as string, isPng ? 'PNG' : 'JPEG', margin, y - 6, 12, 12);
      
      if (hasName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(cleanBusinessName, margin + 15, y);
      }

      leftY = y + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      contactLines.slice(0, 3).forEach((line) => {
        doc.text(line.trim(), margin + (hasName ? 15 : 0), leftY);
        leftY += 4;
      });
    } catch {
      if (hasName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(cleanBusinessName, margin, y);
      }

      leftY = y + 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      contactLines.slice(0, 3).forEach((line) => {
        doc.text(line.trim(), margin, leftY);
        leftY += 4.5;
      });
    }
  } else if (hasName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(cleanBusinessName, margin, y);

    leftY = y + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    contactLines.slice(0, 3).forEach((line) => {
      doc.text(line.trim(), margin, leftY);
      leftY += 4.5;
    });
  } else if (contactLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    contactLines.slice(0, 3).forEach((line) => {
      doc.text(line.trim(), margin, leftY);
      leftY += 4.5;
    });
  }

  // INVOICE on top right
  doc.setFontSize(22);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });

  y += 7;

  // Invoice Details (right)

  let rightY = y;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Invoice #: `, pageWidth - margin - 35, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, pageWidth - margin, rightY, { align: 'right' });
  rightY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.text(`Issue Date: `, pageWidth - margin - 35, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.issueDate, pageWidth - margin, rightY, { align: 'right' });
  rightY += 4.5;

  if (data.dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Due Date: `, pageWidth - margin - 35, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dueDate, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4.5;
  }

  if (data.poNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`PO Ref: `, pageWidth - margin - 35, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.poNumber, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4.5;
  }

  // Status tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (data.status === 'paid') {
    doc.setFillColor(235, 245, 240);
    doc.setTextColor(20, 108, 67);
    doc.roundedRect(pageWidth - margin - 22, rightY - 3, 22, 5, 1, 1, 'F');
    doc.text('PAID', pageWidth - margin - 11, rightY + 0.6, { align: 'center' });
  } else {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.roundedRect(pageWidth - margin - 28, rightY - 3, 28, 5, 1, 1, 'F');
    doc.text('DUE PAYMENT', pageWidth - margin - 14, rightY + 0.6, { align: 'center' });
  }

  y = Math.max(leftY, rightY) + 7;

  // Divider
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // 2. Bill To Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('BILLED TO', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(data.clientName || 'Valued Client', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

  if (data.clientEmail) {
    doc.text(data.clientEmail, margin, y);
    y += 4.2;
  }
  if (data.clientAddress) {
    const addressLines = data.clientAddress.split('\n');
    addressLines.forEach((l) => {
      doc.text(l.trim(), margin, y);
      y += 4.2;
    });
  }

  y += 4;

  // 3. Line Items Table Header
  const colX = {
    desc: margin + 2,
    qty: margin + contentWidth - 75,
    rate: margin + contentWidth - 45,
    amount: margin + contentWidth - 2,
  };

  doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('ITEM DESCRIPTION', colX.desc, y + 4.8);
  doc.text('QTY', colX.qty, y + 4.8, { align: 'center' });
  doc.text('RATE', colX.rate, y + 4.8, { align: 'right' });
  doc.text('AMOUNT', colX.amount, y + 4.8, { align: 'right' });

  y += 7;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let subtotal = 0;

  data.items.forEach((item) => {
    const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);
    subtotal += itemTotal;

    const rowStartY = y;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(item.description || 'Service / Product', colX.desc, y + 4.5);

    let rowHeight = 6.5;

    if (item.details) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      const detailsLines = doc.splitTextToSize(item.details, contentWidth - 85);
      doc.text(detailsLines, colX.desc, y + 8.5);
      rowHeight = 8.5 + detailsLines.length * 3.8;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(String(item.quantity || 1), colX.qty, rowStartY + 4.5, { align: 'center' });
    doc.text(`${data.currency} ${(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX.rate, rowStartY + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.currency} ${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX.amount, rowStartY + 4.5, { align: 'right' });

    y += rowHeight;

    // Row bottom line
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, y, pageWidth - margin, y);
    y += 1.5;
  });

  y += 4;

  // 4. Totals Calculation
  const discountVal = data.enableDiscount ? Math.max(0, data.discountAmount || 0) : 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxVal = data.enableTax ? taxableAmount * ((data.taxRate || 0) / 100) : 0;
  const grandTotal = taxableAmount + taxVal;

  const totalBoxX = margin + contentWidth - 75;
  const totalValX = margin + contentWidth - 2;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Subtotal:', totalBoxX, y);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${data.currency} ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalValX, y, { align: 'right' });
  y += 5;

  if (data.enableDiscount && discountVal > 0) {
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Discount:', totalBoxX, y);
    doc.setTextColor(220, 38, 38);
    doc.text(`- ${data.currency} ${discountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalValX, y, { align: 'right' });
    y += 5;
  }

  if (data.enableTax && data.taxRate > 0) {
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Tax (${data.taxRate}%):`, totalBoxX, y);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${data.currency} ${taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalValX, y, { align: 'right' });
    y += 5;
  }

  // Highlighted Total Box
  y += 1;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(totalBoxX - 4, y - 4, 79, 9, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Total Due:', totalBoxX, y + 2.5);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`${data.currency} ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalValX, y + 2.5, { align: 'right' });

  y += 15;

  // 5. Payment & Remittance Information (optional/configurable)
  if (data.enableBankDetails || data.paymentInstructions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('PAYMENT INSTRUCTIONS & REMITTANCE', margin, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

    if (data.bankName) {
      doc.text(`Bank Name: ${data.bankName}`, margin, y);
      y += 4;
    }
    if (data.accountNumber) {
      doc.text(`Account / IBAN: ${data.accountNumber}`, margin, y);
      y += 4;
    }
    if (data.routingOrSwift) {
      doc.text(`SWIFT / Routing: ${data.routingOrSwift}`, margin, y);
      y += 4;
    }
    if (data.paymentInstructions) {
      const payLines = doc.splitTextToSize(data.paymentInstructions, contentWidth * 0.65);
      doc.text(payLines, margin, y);
      y += payLines.length * 4;
    }
    y += 4;
  }

  // 6. Notes & Terms (optional)
  if (data.notes || data.terms) {
    if (data.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('NOTES', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const notesLines = doc.splitTextToSize(data.notes, contentWidth);
      doc.text(notesLines, margin, y);
      y += notesLines.length * 3.8 + 3;
    }

    if (data.terms) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('TERMS & CONDITIONS', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      const termsLines = doc.splitTextToSize(data.terms, contentWidth);
      doc.text(termsLines, margin, y);
      y += termsLines.length * 3.5 + 3;
    }
  }

  // 7. Signature Block (optional)
  if (data.enableSignature) {
    const sigY = Math.max(y + 8, 245);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin + contentWidth - 65, sigY, margin + contentWidth, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Authorized Signature & Date', margin + contentWidth - 65, sigY + 4);
    if (data.signatoryName) {
      doc.text(data.signatoryName, margin + contentWidth - 65, sigY + 8);
    }
  }

  // 8. Clean Document Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Thank you for your business.', pageWidth / 2, 285, { align: 'center' });

  return doc;
}
