import React, { useState } from 'react';
import { DeliveryNote, Customer, CompanySettings, Invoice, Quotation } from '../types';
import { Truck, Search, Download, CheckCircle, Clock, MapPin, Phone, FileText, FileCode, Trash2 } from 'lucide-react';
import { generateDeliveryNotePDF, generateInvoicePDF, generateQuotationPDF } from '../utils/pdfGenerator';

interface Props {
  deliveryNotes: DeliveryNote[];
  customers: Customer[];
  companySettings: CompanySettings;
  onUpdateStatus: (id: string, newStatus: DeliveryNote['status']) => void;
  onDeleteDeliveryNote?: (id: string) => void;
}

export const DeliveryNoteListModal: React.FC<Props> = ({
  deliveryNotes,
  customers,
  companySettings,
  onUpdateStatus,
  onDeleteDeliveryNote
}) => {
  const [search, setSearch] = useState('');

  const filtered = deliveryNotes.filter(dn => {
    const cust = customers.find(c => c.id === dn.customerId);
    const name = cust ? cust.registeredName.toLowerCase() : '';
    return dn.deliveryNoteNumber.toLowerCase().includes(search.toLowerCase()) || name.includes(search.toLowerCase());
  });

  const handleDownloadPDF = (dn: DeliveryNote) => {
    const cust = customers.find(c => c.id === dn.customerId);
    if (!cust) return;
    const branch = cust.branches.find(b => b.id === dn.branchId);
    generateDeliveryNotePDF(dn, cust, branch, companySettings);
  };

  const handleDownloadInvoicePDF = (dn: DeliveryNote) => {
    const cust = customers.find(c => c.id === dn.customerId);
    if (!cust) return;
    const branch = cust.branches.find(b => b.id === dn.branchId);

    const subtotal = dn.items.reduce((s, i) => s + i.totalPrice, 0);
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;

    const invoice: Invoice = {
      id: dn.invoiceId || `inv-${dn.id}`,
      invoiceNumber: `INV-${dn.deliveryNoteNumber.replace('DN-', '')}`,
      customerId: dn.customerId,
      branchId: dn.branchId,
      issueDate: dn.issueDate,
      dueDate: dn.issueDate,
      items: dn.items,
      subtotal,
      taxRate: 15,
      taxAmount,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      status: 'Sent',
      notes: dn.driverNotes,
      deliveryNoteId: dn.id,
      createdAt: dn.createdAt
    };

    generateInvoicePDF(invoice, cust, branch, companySettings);
  };

  const handleDownloadQuotationPDF = (dn: DeliveryNote) => {
    const cust = customers.find(c => c.id === dn.customerId);
    if (!cust) return;
    const branch = cust.branches.find(b => b.id === dn.branchId);

    const subtotal = dn.items.reduce((s, i) => s + i.totalPrice, 0);
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;

    const quote: Quotation = {
      id: `qt-${dn.id}`,
      quotationNumber: `QT-${dn.deliveryNoteNumber.replace('DN-', '')}`,
      customerId: dn.customerId,
      branchId: dn.branchId,
      issueDate: dn.issueDate,
      expiryDate: dn.issueDate,
      items: dn.items,
      subtotal,
      taxRate: 15,
      taxAmount,
      totalAmount,
      status: 'Sent',
      notes: dn.driverNotes,
      createdAt: dn.createdAt
    };

    generateQuotationPDF(quote, cust, branch, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-400 text-black rounded-lg">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            Delivery Notes & Dispatch Manifests
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Track goods dispatch, pack counts, recipient sign-offs, and download PDF delivery manifests.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search delivery note # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Mobile Card View (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800">
            No delivery notes found. Delivery notes are auto-generated when creating invoices.
          </div>
        ) : (
          filtered.map((dn) => {
            const cust = customers.find(c => c.id === dn.customerId);
            const branch = cust?.branches.find(b => b.id === dn.branchId);

            return (
              <div key={dn.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>{dn.deliveryNoteNumber}</span>
                  </div>
                  <select
                    value={dn.status}
                    onChange={(e) => onUpdateStatus(dn.id, e.target.value as any)}
                    className="text-xs font-bold px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {cust ? cust.registeredName : 'Unknown Customer'}
                    {branch ? ` (${branch.name})` : ''}
                  </div>
                  <div className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{dn.deliveryAddress}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>{dn.items.length} line items ({dn.items.reduce((s, i) => s + i.quantity, 0)} packs)</span>
                  <span>Date: {dn.issueDate}</span>
                </div>

                {/* PDF Downloads & Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => handleDownloadPDF(dn)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-extrabold border border-yellow-500"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Del Note
                  </button>

                  <button
                    onClick={() => handleDownloadInvoicePDF(dn)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-black hover:bg-slate-900 text-yellow-400 rounded-lg text-xs font-bold border border-yellow-500/30"
                  >
                    <FileText className="w-3.5 h-3.5 text-yellow-400" />
                    Invoice
                  </button>

                  <button
                    onClick={() => handleDownloadQuotationPDF(dn)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold border border-slate-700"
                  >
                    <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                    Quote
                  </button>

                  {onDeleteDeliveryNote && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete delivery note ${dn.deliveryNoteNumber}?`)) {
                          onDeleteDeliveryNote(dn.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition ml-auto"
                      title="Delete Delivery Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Desktop Data Table (md:block hidden) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Delivery Note # & Date</th>
                <th className="py-3 px-4">Customer & Delivery Address</th>
                <th className="py-3 px-4">Pack Items Count</th>
                <th className="py-3 px-4">Dispatch Status</th>
                <th className="py-3 px-4 text-right">PDF Manifest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No delivery notes found. Delivery notes are auto-generated when creating invoices.
                  </td>
                </tr>
              ) : (
                filtered.map((dn) => {
                  const cust = customers.find(c => c.id === dn.customerId);
                  const branch = cust?.branches.find(b => b.id === dn.branchId);

                  return (
                    <tr key={dn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-purple-600" />
                          {dn.deliveryNoteNumber}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Date: {dn.issueDate} {dn.invoiceId ? `| Inv: ${dn.invoiceId}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {cust ? cust.registeredName : 'Unknown Customer'}
                          {branch ? ` (${branch.name})` : ''}
                        </div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {dn.deliveryAddress}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {dn.items.length} line items ({dn.items.reduce((s, i) => s + i.quantity, 0)} total packs)
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={dn.status}
                          onChange={(e) => onUpdateStatus(dn.id, e.target.value as any)}
                          className="text-xs font-bold px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Returned">Returned</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Del Note PDF */}
                          <button
                            onClick={() => handleDownloadPDF(dn)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-extrabold transition border border-yellow-500 shadow-2xs"
                            title="Download Delivery Note PDF"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Del Note PDF
                          </button>

                          {/* Inv PDF */}
                          <button
                            onClick={() => handleDownloadInvoicePDF(dn)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-black hover:bg-slate-900 text-yellow-400 rounded-lg text-xs font-bold transition border border-yellow-500/30"
                            title="Download Tax Invoice PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-yellow-400" />
                            Inv PDF
                          </button>

                          {/* Quote PDF */}
                          <button
                            onClick={() => handleDownloadQuotationPDF(dn)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition border border-slate-700"
                            title="Download Quotation PDF"
                          >
                            <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                            Quote PDF
                          </button>

                          {/* Delete Delivery Note */}
                          {onDeleteDeliveryNote && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete delivery note ${dn.deliveryNoteNumber}?`)) {
                                  onDeleteDeliveryNote(dn.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Delete Delivery Note"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
