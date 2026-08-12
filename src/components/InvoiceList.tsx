import React, { useState } from 'react';
import { Invoice, Customer, DeliveryNote, CompanySettings, Quotation } from '../types';
import { FileText, Plus, Search, Download, Send, CreditCard, Eye, Trash2, Edit3, Truck, Filter, CheckCircle, Clock, AlertCircle, FileCode } from 'lucide-react';
import { generateInvoicePDF, generateDeliveryNotePDF, generateQuotationPDF } from '../utils/pdfGenerator';

interface Props {
  invoices: Invoice[];
  customers: Customer[];
  deliveryNotes: DeliveryNote[];
  companySettings: CompanySettings;
  onOpenCreateInvoice: () => void;
  onOpenEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onOpenRecordPayment: (invoice: Invoice) => void;
  onOpenSendModal: (type: 'Invoice' | 'Quotation', doc: Invoice, customer: Customer) => void;
}

export const InvoiceList: React.FC<Props> = ({
  invoices,
  customers,
  deliveryNotes,
  companySettings,
  onOpenCreateInvoice,
  onOpenEditInvoice,
  onDeleteInvoice,
  onOpenRecordPayment,
  onOpenSendModal,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredInvoices = invoices.filter(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    const custName = cust ? cust.registeredName.toLowerCase() : '';
    const invNo = inv.invoiceNumber.toLowerCase();

    const matchesSearch = invNo.includes(search.toLowerCase()) || custName.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesDate = !dateFilter || inv.issueDate === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-black text-yellow-400 border border-yellow-400/80 shadow-2xs">
            <CheckCircle className="w-3 h-3 text-yellow-400" /> Paid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-400">
            <Clock className="w-3 h-3" /> Partial
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-400">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
            Sent / Unpaid
          </span>
        );
    }
  };

  const handleDownloadInvoicePDF = (inv: Invoice) => {
    const cust = customers.find(c => c.id === inv.customerId);
    if (!cust) return;
    const branch = cust.branches.find(b => b.id === inv.branchId);
    generateInvoicePDF(inv, cust, branch, companySettings);
  };

  const handleDownloadDeliveryNotePDF = (inv: Invoice) => {
    const cust = customers.find(c => c.id === inv.customerId);
    if (!cust) return;
    const branch = cust.branches.find(b => b.id === inv.branchId);

    // Find linked delivery note or create ephemeral representation
    const dn = deliveryNotes.find(d => d.invoiceId === inv.id || d.id === inv.deliveryNoteId) || {
      id: inv.deliveryNoteId || `dn-${inv.id}`,
      deliveryNoteNumber: `DN-${inv.invoiceNumber.replace('INV-', '')}`,
      invoiceId: inv.id,
      customerId: inv.customerId,
      branchId: inv.branchId,
      issueDate: inv.issueDate,
      deliveryAddress: branch ? branch.address : cust.address,
      recipientContact: branch ? branch.contactPerson : cust.contactPerson,
      recipientPhone: branch ? branch.phone : cust.phone,
      items: inv.items,
      driverNotes: inv.notes,
      status: 'Delivered',
      createdAt: inv.createdAt
    };

    generateDeliveryNotePDF(dn as DeliveryNote, cust, branch, companySettings);
  };

  const handleDownloadQuotationPDF = (inv: Invoice) => {
    const cust = customers.find(c => c.id === inv.customerId);
    if (!cust) return;
    const branch = cust.branches.find(b => b.id === inv.branchId);

    const quote: Quotation = {
      id: `qt-${inv.id}`,
      quotationNumber: `QT-${inv.invoiceNumber.replace('INV-', '')}`,
      customerId: inv.customerId,
      branchId: inv.branchId,
      issueDate: inv.issueDate,
      expiryDate: inv.dueDate || inv.issueDate,
      items: inv.items,
      subtotal: inv.subtotal,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      totalAmount: inv.totalAmount,
      status: 'Sent',
      notes: inv.notes,
      createdAt: inv.createdAt
    };

    generateQuotationPDF(quote, cust, branch, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-400 text-black rounded-lg">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            Tax Invoices & Auto Delivery Notes
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            South Africa tax-compliant invoicing, payment receipts tracking, & delivery note PDFs.
          </p>
        </div>

        <button
          onClick={onOpenCreateInvoice}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold rounded-lg text-sm border border-yellow-500 shadow-sm transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create New Invoice
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="sent">Sent / Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            title="Filter by Issue Date"
          />
        </div>
      </div>

      {/* Mobile Card List (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800">
            No invoices found. Tap "+ Create Invoice" above to issue one.
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const cust = customers.find(c => c.id === inv.customerId);
            const branch = cust?.branches.find(b => b.id === inv.branchId);

            return (
              <div key={inv.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{inv.invoiceNumber}</span>
                  </div>
                  <div>{getStatusBadge(inv.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {cust ? cust.registeredName : 'Unknown'}
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      {branch ? `Branch: ${branch.name}` : ''}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total / Balance</span>
                    <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
                      {companySettings.currencySymbol}{inv.totalAmount.toFixed(2)}
                    </span>
                    <span className={`font-bold block text-xs ${inv.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                      Due: {companySettings.currencySymbol}{inv.balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Issued: {inv.issueDate}</span>
                </div>

                {/* PDF & Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => handleDownloadInvoicePDF(inv)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 bg-black hover:bg-slate-900 text-yellow-400 rounded-lg text-xs font-bold transition border border-yellow-500/30"
                    >
                      <Download className="w-3.5 h-3.5 text-yellow-400" />
                      Invoice
                    </button>

                    <button
                      onClick={() => handleDownloadDeliveryNotePDF(inv)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-extrabold transition border border-yellow-500"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Del Note
                    </button>

                    <button
                      onClick={() => handleDownloadQuotationPDF(inv)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold transition border border-slate-700"
                    >
                      <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                      Quote
                    </button>
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    {inv.balanceDue > 0 && (
                      <button
                        onClick={() => onOpenRecordPayment(inv)}
                        className="p-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg"
                        title="Record Payment"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => cust && onOpenSendModal('Invoice', inv, cust)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg"
                      title="Send via Email"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onOpenEditInvoice(inv)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                      title="Edit Invoice"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete invoice ${inv.invoiceNumber}?`)) {
                          onDeleteInvoice(inv.id);
                        }
                      }}
                      className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Invoices Data Table (md:block hidden) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Customer & Branch</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">PDF Downloads & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No invoices found. Click "Create New Invoice" to issue one.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const cust = customers.find(c => c.id === inv.customerId);
                  const branch = cust?.branches.find(b => b.id === inv.branchId);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" />
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Issued: {inv.issueDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {cust ? cust.registeredName : 'Unknown Customer'}
                        </div>
                        {branch && (
                          <div className="text-xs text-slate-500">
                            Branch: {branch.name}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {companySettings.currencySymbol}{inv.totalAmount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        <span className={inv.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                          {companySettings.currencySymbol}{inv.balanceDue.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(inv.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Invoice PDF */}
                          <button
                            onClick={() => handleDownloadInvoicePDF(inv)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-black hover:bg-slate-900 text-yellow-400 rounded-lg text-xs font-bold transition border border-yellow-500/30"
                            title="Download Invoice PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-yellow-400" />
                            Inv PDF
                          </button>

                          {/* Delivery Note PDF */}
                          <button
                            onClick={() => handleDownloadDeliveryNotePDF(inv)}
                            className="flex items-center gap-1 px-2 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-extrabold transition border border-yellow-500 shadow-2xs"
                            title="Download Delivery Note PDF"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Del Note PDF
                          </button>

                          {/* Quote PDF */}
                          <button
                            onClick={() => handleDownloadQuotationPDF(inv)}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition border border-slate-700"
                            title="Download as Quotation PDF"
                          >
                            <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                            Quote PDF
                          </button>

                          {/* Record Payment */}
                          {inv.balanceDue > 0 && (
                            <button
                              onClick={() => onOpenRecordPayment(inv)}
                              className="p-1.5 text-black hover:bg-yellow-100 rounded-lg transition"
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4 text-emerald-700" />
                            </button>
                          )}

                          {/* Send Modal */}
                          <button
                            onClick={() => cust && onOpenSendModal('Invoice', inv, cust)}
                            className="p-1.5 text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Send Invoice via Email"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onOpenEditInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Delete invoice ${inv.invoiceNumber}?`)) {
                                onDeleteInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
