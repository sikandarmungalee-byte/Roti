import React, { useState } from 'react';
import { Customer, CompanySettings } from '../types';
import { Send, X, Mail, CheckCircle2, Copy, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'Invoice' | 'Quotation';
  doc: any;
  customer: Customer;
  companySettings: CompanySettings;
}

export const SendDocumentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  documentType,
  doc,
  customer,
  companySettings
}) => {
  if (!isOpen) return null;

  const [recipientEmail, setRecipientEmail] = useState(customer.email || '');
  const [subject, setSubject] = useState(
    `${documentType} #${doc.invoiceNumber || doc.quotationNumber} from ${companySettings.name}`
  );

  const docNumber = doc.invoiceNumber || doc.quotationNumber;
  const totalStr = `${companySettings.currencySymbol}${(doc.totalAmount || 0).toFixed(2)}`;

  const [message, setMessage] = useState(
    `Dear ${customer.contactPerson || customer.registeredName},\n\nPlease find attached ${documentType} #${docNumber} for the total amount of ${totalStr}.\n\nPayment Details:\nBank: ${companySettings.bankName}\nAccount: ${companySettings.accountNumber}\nBranch Code: ${companySettings.branchCode}\n\nThank you for your business!\n\nBest regards,\n${companySettings.name}`
  );

  const [isSent, setIsSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 2000);
  };

  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">
              Send {documentType} #{docNumber}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Dispatch Successful!</h4>
            <p className="text-sm text-slate-500">
              {documentType} #{docNumber} has been transmitted to {recipientEmail}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendEmail} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email Address *
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-semibold text-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Subject Line *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Body
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <a
                href={mailtoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-200 transition w-full sm:w-auto"
              >
                <Mail className="w-4 h-4 text-blue-500" />
                Launch Mail Client
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Confirm Dispatch
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
