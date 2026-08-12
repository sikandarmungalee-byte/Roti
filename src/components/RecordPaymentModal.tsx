import React, { useState } from 'react';
import { Invoice, PaymentRecord, CompanySettings } from '../types';
import { CreditCard, X, DollarSign, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  companySettings: CompanySettings;
  onSavePayment: (payment: PaymentRecord, updatedInvoice: Invoice) => void;
}

export const RecordPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoice,
  companySettings,
  onSavePayment
}) => {
  if (!isOpen) return null;

  const [amount, setAmount] = useState<number>(invoice.balanceDue);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['paymentMethod']>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>(`TRX-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState<string>(`Payment received for invoice ${invoice.invoiceNumber}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      branchId: invoice.branchId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes
    };

    const newAmountPaid = invoice.amountPaid + amount;
    const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
    const newStatus = newBalanceDue === 0 ? 'Paid' : 'Partial';

    const updatedInvoice: Invoice = {
      ...invoice,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus
    };

    onSavePayment(newPayment, updatedInvoice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Record Payment for {invoice.invoiceNumber}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Total:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {companySettings.currencySymbol}{invoice.totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Balance Due:</span>
              <span className="font-bold text-rose-600">
                {companySettings.currencySymbol}{invoice.balanceDue.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Amount ({companySettings.currencySymbol}) *
            </label>
            <input
              type="number"
              step="0.01"
              max={invoice.balanceDue}
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold text-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 font-medium"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reference / Transaction #</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Payment
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
