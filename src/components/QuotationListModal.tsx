import React, { useState } from 'react';
import { Quotation, Customer, Product, LineItem, CompanySettings, Invoice, DeliveryNote } from '../types';
import { FileCode, Plus, Search, Download, Send, RefreshCw, Trash2, Edit3, X, Save, CheckCircle2 } from 'lucide-react';
import { generateQuotationPDF } from '../utils/pdfGenerator';

interface Props {
  quotations: Quotation[];
  customers: Customer[];
  products: Product[];
  companySettings: CompanySettings;
  onSaveQuotation: (quotation: Quotation) => void;
  onDeleteQuotation: (id: string) => void;
  onConvertQuotationToInvoice: (quotation: Quotation) => void;
  onOpenSendModal: (type: 'Invoice' | 'Quotation', doc: any, customer: Customer) => void;
  autoOpenCreate?: boolean;
}

export const QuotationListModal: React.FC<Props> = ({
  quotations,
  customers,
  products,
  companySettings,
  onSaveQuotation,
  onDeleteQuotation,
  onConvertQuotationToInvoice,
  onOpenSendModal,
  autoOpenCreate
}) => {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Partial<Quotation> | null>(null);

  React.useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreateForm();
    }
  }, [autoOpenCreate]);

  // Form State
  const [quoteNumber, setQuoteNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [taxRate, setTaxRate] = useState(15);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);

  const handleOpenCreateForm = (quote?: Quotation) => {
    if (quote) {
      setEditingQuote(quote);
      setQuoteNumber(quote.quotationNumber);
      setSelectedCustomerId(quote.customerId);
      setSelectedBranchId(quote.branchId || '');
      setIssueDate(quote.issueDate);
      setExpiryDate(quote.expiryDate);
      setTaxRate(quote.taxRate);
      setNotes(quote.notes || '');
      setItems(quote.items);
    } else {
      setEditingQuote(null);
      const defaultCust = customers[0];
      const defaultCode = defaultCust?.code ? defaultCust.code.trim().toUpperCase() : 'CUST';
      setQuoteNumber(`QT-${defaultCode}-2026-${Math.floor(100 + Math.random() * 900)}`);
      setSelectedCustomerId(defaultCust?.id || '');
      setSelectedBranchId('');
      setIssueDate(new Date().toISOString().slice(0, 10));
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      setExpiryDate(exp.toISOString().slice(0, 10));
      setTaxRate(10);
      setNotes('Quotation valid for 30 days. Prices subject to inventory availability.');

      if (products.length > 0) {
        const p = products[0];
        setItems([{
          id: `li-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          packQuantity: p.packQuantity,
          size: p.size,
          quantity: 1,
          unitPrice: p.price,
          description: p.description,
          totalPrice: p.price
        }]);
      } else {
        setItems([{
          id: `li-${Date.now()}`,
          productName: '',
          packQuantity: 1,
          size: 'Standard',
          quantity: 1,
          unitPrice: 0,
          description: '',
          totalPrice: 0
        }]);
      }
    }
    setIsFormOpen(true);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `li-${Date.now()}`,
        productName: '',
        packQuantity: 1,
        size: 'Standard',
        quantity: 1,
        unitPrice: 0,
        description: '',
        totalPrice: 0
      }
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(value) : item.quantity;
        const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
        item.totalPrice = q * p;
      }
      copy[index] = item;
      return copy;
    });
  };

  const handleSelectCatalogProduct = (index: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        productName: prod.name,
        packQuantity: prod.packQuantity,
        size: prod.size,
        unitPrice: prod.price,
        description: prod.description,
        totalPrice: copy[index].quantity * prod.price
      };
      return copy;
    });
  };

  const subtotal = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || items.length === 0) return;

    const newQuote: Quotation = {
      id: editingQuote?.id || `qt-${Date.now()}`,
      quotationNumber: quoteNumber,
      customerId: selectedCustomerId,
      branchId: selectedBranchId || undefined,
      issueDate,
      expiryDate,
      items,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      status: editingQuote?.status || 'Sent',
      notes,
      createdAt: editingQuote?.createdAt || new Date().toISOString().slice(0, 10)
    };

    onSaveQuotation(newQuote);
    setIsFormOpen(false);
  };

  const filteredQuotes = quotations.filter(q => {
    const cust = customers.find(c => c.id === q.customerId);
    const custName = cust ? cust.registeredName.toLowerCase() : '';
    return q.quotationNumber.toLowerCase().includes(search.toLowerCase()) || custName.includes(search.toLowerCase());
  });

  const handleDownloadPDF = (q: Quotation) => {
    const cust = customers.find(c => c.id === q.customerId);
    if (!cust) return;
    const branch = cust.branches.find(b => b.id === q.branchId);
    generateQuotationPDF(q, cust, branch, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-400 text-black rounded-lg">
              <FileCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            Quotations Manager
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Create price quotations, send via email, and convert directly to Tax Invoice & Delivery Note with 1 click.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateForm()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold rounded-lg text-sm border border-yellow-500 shadow-sm transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create New Quotation
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search quote # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Mobile Card List (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800">
            No quotations found. Tap "+ Create New Quotation" above to start.
          </div>
        ) : (
          filteredQuotes.map((q) => {
            const cust = customers.find(c => c.id === q.customerId);
            const branch = cust?.branches.find(b => b.id === q.branchId);

            return (
              <div key={q.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>{q.quotationNumber}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-black text-yellow-400 border border-yellow-400/80">
                    {q.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {cust ? cust.registeredName : 'Unknown'}
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      {branch ? `Branch: ${branch.name}` : 'Main Branch'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Amount</span>
                    <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
                      {companySettings.currencySymbol}{q.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Issued: {q.issueDate}</span>
                  <span>Valid: {q.expiryDate}</span>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => onConvertQuotationToInvoice(q)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold rounded-lg text-xs border border-yellow-500"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Convert to Invoice
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownloadPDF(q)}
                      className="p-2 bg-black text-yellow-400 rounded-lg text-xs font-bold border border-yellow-500/30"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => cust && onOpenSendModal('Quotation', q, cust)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg"
                      title="Send Email"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenCreateForm(q)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                      title="Edit Quotation"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete quotation ${q.quotationNumber}?`)) {
                          onDeleteQuotation(q.id);
                        }
                      }}
                      className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/40 text-rose-400 rounded-lg"
                      title="Delete Quotation"
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

      {/* Quotations List Table (md:block hidden) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Quote # & Dates</th>
                <th className="py-3 px-4">Customer & Branch</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions & 1-Click Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No quotations found. Click "Create New Quotation" to start.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const cust = customers.find(c => c.id === q.customerId);
                  const branch = cust?.branches.find(b => b.id === q.branchId);

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileCode className="w-4 h-4 text-purple-600" />
                          {q.quotationNumber}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Issued: {q.issueDate} | Valid Until: {q.expiryDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {cust ? cust.registeredName : 'Unknown Customer'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {branch ? `Branch: ${branch.name}` : 'Main Branch'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {companySettings.currencySymbol}{q.totalAmount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-black text-yellow-400 border border-yellow-400/80">
                          {q.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* 1-Click Convert to Invoice & Delivery Note */}
                          <button
                            onClick={() => onConvertQuotationToInvoice(q)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold rounded-lg text-xs shadow-xs border border-yellow-500 transition"
                            title="Convert to Tax Invoice & Delivery Note"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Convert to Invoice
                          </button>

                          {/* PDF */}
                          <button
                            onClick={() => handleDownloadPDF(q)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-black hover:bg-slate-900 text-yellow-400 rounded-lg text-xs font-bold transition border border-yellow-500/30"
                            title="Download Quotation PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-yellow-400" />
                            Quote PDF
                          </button>

                          {/* Send */}
                          <button
                            onClick={() => cust && onOpenSendModal('Quotation', q, cust)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 rounded-lg transition"
                            title="Send Quotation Email"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenCreateForm(q)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Edit Quotation"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Delete quotation ${q.quotationNumber}?`)) {
                                onDeleteQuotation(q.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Delete Quotation"
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

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl my-2 sm:my-8 overflow-hidden max-h-[96vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white flex-shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                {editingQuote ? 'Edit Quotation' : 'Create New Price Quotation'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuote} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border">
                <div>
                  <label className="block text-xs font-semibold mb-1">Quote #</label>
                  <input
                    type="text"
                    required
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Customer *</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 font-semibold"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.registeredName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Branch</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800"
                  >
                    <option value="">Main Location</option>
                    {customers.find(c => c.id === selectedCustomerId)?.branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Dates</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-1/2 p-1.5 text-xs border rounded bg-white dark:bg-slate-800"
                    />
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-1/2 p-1.5 text-xs border rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Customer & Branch Info Card */}
              {(() => {
                const selectedCust = customers.find(c => c.id === selectedCustomerId);
                if (!selectedCust) return null;
                const selBranch = selectedCust.branches.find(b => b.id === selectedBranchId);
                return (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row justify-between gap-2">
                    <div>
                      <span className="font-bold text-blue-900 dark:text-blue-300">Quoted Customer:</span> {selectedCust.registeredName}
                      {selBranch && (
                        <span className="ml-2 font-mono text-[11px] bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded font-bold">
                          Branch: {selBranch.name} ({selBranch.code})
                        </span>
                      )}
                      <br />
                      <span className="text-slate-500 font-semibold">Address:</span> {selBranch ? selBranch.address : selectedCust.address}
                    </div>
                    <div className="sm:text-right">
                      <div>
                        <span className="font-bold text-blue-900 dark:text-blue-300">Tax Reg / VAT:</span> {selBranch?.taxNumber || selectedCust.taxNumber || 'N/A'} / {selBranch?.vatNumber || selectedCust.vatNumber || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <span>Reg No: {selBranch?.registrationNumber || selectedCust.registrationNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Line items */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Quotation Line Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 border-b font-semibold">
                        <th className="p-2.5">Catalog Product / Name</th>
                        <th className="p-2.5">Pack Qty</th>
                        <th className="p-2.5">Size</th>
                        <th className="p-2.5">Qty</th>
                        <th className="p-2.5">Unit Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-2 space-y-1">
                            <select
                              value={item.productId || ''}
                              onChange={(e) => handleSelectCatalogProduct(idx, e.target.value)}
                              className="w-full p-1 border rounded bg-slate-50 dark:bg-slate-800"
                            >
                              <option value="">-- Choose Catalog Product --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              required
                              value={item.productName}
                              onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                              placeholder="Product name"
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.packQuantity}
                              onChange={(e) => handleUpdateItem(idx, 'packQuantity', parseInt(e.target.value) || 1)}
                              className="w-full p-1 border rounded text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.size}
                              onChange={(e) => handleUpdateItem(idx, 'size', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full p-1 border rounded text-center font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full p-1 border rounded text-right font-medium"
                            />
                          </td>
                          <td className="p-2 text-right font-bold">
                            {companySettings.currencySymbol}{item.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
                <span className="font-bold text-sm">Estimated Total Amount:</span>
                <span className="font-bold text-xl text-purple-600">
                  {companySettings.currencySymbol}{totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded shadow-xs"
                >
                  Save Quotation
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
