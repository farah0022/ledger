import React from 'react';
import { AlertCircle } from 'lucide-react';
import { BusinessRecord } from '../types';
import { formatMoney } from '../utils/formatters';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: BusinessRecord | null;
  currency: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
  currency,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div
      id="delete-confirm-backdrop"
      className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="delete-confirm-dialog"
        className="bg-[#FFFFFF] w-full max-w-sm rounded-xl shadow-xl border border-[#E8E8E6] p-6 text-[#191918]"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#FEF2F2] text-[#C0392B] flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold">Delete this record?</h2>
        </div>

        <p className="text-xs text-[#787875] mb-4 leading-relaxed">
          This will remove <strong className="text-[#191918]">"{record.title}"</strong>
          {record.amount !== undefined && (
            <span> ({formatMoney(record.amount, record.currency || currency)})</span>
          )}{' '}
          from your business history and recalculate your totals.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-[#595956] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-[#C0392B] hover:bg-[#A93226] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Delete record
          </button>
        </div>
      </div>
    </div>
  );
};
