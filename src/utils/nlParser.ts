import { RecordType, PaymentDirection } from '../types';
import { getTodayStr } from './formatters';

export interface ParsedNLRecord {
  type: RecordType;
  title: string;
  amount?: number;
  currency?: string;
  direction?: PaymentDirection;
  date: string;
  clientOrParty?: string;
  confidence: number;
}

export function parseNaturalLanguageRecord(input: string, defaultCurrency: string = 'USD'): ParsedNLRecord | null {
  const text = input.trim();
  if (!text) return null;

  const todayStr = getTodayStr();
  let type: RecordType = 'note';
  let direction: PaymentDirection | undefined = undefined;
  let amount: number | undefined = undefined;
  let currency: string = defaultCurrency;
  let date: string = todayStr;
  let title = text;
  let clientOrParty: string | undefined = undefined;

  // 1. Detect Currency and Amount
  const amountPattern = /(?:(\$|€|£|KSh|KES|USD|EUR|GBP|CA\$|AU\$|¥|₹|₦)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)(?:\s*(USD|EUR|GBP|KES|KSh))?/i;
  const amountMatch = text.match(amountPattern);

  if (amountMatch && amountMatch[2]) {
    const rawNum = amountMatch[2].replace(/,/g, '');
    const parsedNum = parseFloat(rawNum);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      amount = parsedNum;
      
      const symbolOrCode = (amountMatch[1] || amountMatch[3] || '').toUpperCase();
      if (symbolOrCode.includes('$') || symbolOrCode === 'USD') currency = 'USD';
      else if (symbolOrCode.includes('€') || symbolOrCode === 'EUR') currency = 'EUR';
      else if (symbolOrCode.includes('£') || symbolOrCode === 'GBP') currency = 'GBP';
      else if (symbolOrCode.includes('KSH') || symbolOrCode === 'KES') currency = 'KES';
    }
  }

  const lower = text.toLowerCase();

  // 2. Detect Record Type & Direction
  if (/\b(paid|bought|spent|purchase|expense|cost|fee)\b/i.test(lower)) {
    type = 'money_out';
    direction = 'paid';
  } else if (/\b(received|earned|got paid|deposit|collected|sales? revenue)\b/i.test(lower)) {
    type = 'money_in';
    direction = 'received';
  } else if (/\b(expected|expecting|to receive|invoice sent|client owes)\b/i.test(lower)) {
    type = 'payment';
    direction = 'expected';
  } else if (/\b(due|owe|bill due|upcoming payment|payable)\b/i.test(lower)) {
    type = 'payment';
    direction = 'due';
  } else if (/\b(call|meeting|appointment|meet|sync|interview)\b/i.test(lower)) {
    type = 'event';
  } else if (amount !== undefined) {
    if (/\bfor\b/i.test(lower)) {
      type = 'money_out';
      direction = 'paid';
    } else {
      type = 'money_in';
      direction = 'received';
    }
  }

  // 3. Detect Date
  if (/\byesterday\b/i.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  } else if (/\btomorrow\b/i.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = d.toISOString().split('T')[0];
  } else {
    const isoDateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (isoDateMatch) {
      date = isoDateMatch[0];
    }
  }

  // 4. Detect Party
  const partyMatch = text.match(/\b(?:from|to|with)\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+(?:on|for|today|yesterday|tomorrow|$))/);
  if (partyMatch && partyMatch[1]) {
    clientOrParty = partyMatch[1].trim();
  }

  // 5. Clean Title
  let cleanTitle = text
    .replace(/(?:paid|bought|spent|received|earned|expected|due|bill)\s*/i, '')
    .replace(/(?:today|yesterday|tomorrow)/gi, '')
    .replace(/(?:\$|€|£|KSh|KES|USD|EUR|GBP)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s*(?:USD|EUR|GBP|KES|KSh)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanTitle.length > 0) {
    title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  } else {
    title = type === 'money_in' ? 'Income' : type === 'money_out' ? 'Expense' : 'Record';
  }

  return {
    type,
    title,
    amount,
    currency,
    direction,
    date,
    clientOrParty,
    confidence: 0.85,
  };
}
