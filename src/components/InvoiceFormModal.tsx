import React, { useState, useEffect } from 'react';
import { Invoice, Customer, Product, LineItem, DeliveryNote, CompanySettings } from '../types';
import { FileText, Plus, Trash2, X, Save, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveInvoice: (invoice: Invoice, newDeliveryNote: DeliveryNote) => void;
  customers: Customer[];
  products: Product[];
  editingInvoice?: Invoice | null;
  companySettings: CompanySettings;
}

export const InvoiceFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveInvoice,
  customers,
  products,
  editingInvoice,
  companySettings
}) => {
  if (!isOpen) return null;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    editingInvoice?.customerId || (customers[0]?.id || '')
  );

  const initialCust = customers.find(c => c.id === selectedCustomerId);
  const initialCode = initialCust?.code ? initialCust.code.trim().toUpperCase() : 'CUST';

  const [invoiceNumber, setInvoiceNumber] = useState(
    editingInvoice?.invoiceNumber || `INV-${initialCode}-2026-${Math.floor(100 + Math.random() * 900)}`
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    editingInvoice?.branchId || ''
  );
  const [issueDate, setIssueDate] = useState<string>(
    editingInvoice?.issueDate || new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    if (editingInvoice?.dueDate) return editingInvoice.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const [taxRate, setTaxRate] = useState<number>(editingInvoice?.taxRate ?? 10);
  const [notes, setNotes] = useState<string>(editingInvoice?.notes || companySettings.defaultTerms || '');
  const [driverNotes, setDriverNotes] = useState<string>('Handle with care. Inspect pack counts upon arrival.');

  const [items, setItems] = useState<LineItem[]>(() => {
    if (editingInvoice?.items && editingInvoice.items.length > 0) {
      return editingInvoice.items;
    }
    // Default 1 line item from catalog if available
    if (products.length > 0) {
      const p = products[0];
      return [{
        id: `li-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        packQuantity: p.packQuantity,
        size: p.size,
        quantity: 1,
        unitPrice: p.price,
        description: p.description,
        totalPrice: p.price
      }];
    }
    return [{
      id: `li-${Date.now()}`,
      productName: '',
      packQuantity: 1,
      size: 'Standard',
      quantity: 1,
      unitPrice: 0,
      description: '',
      totalPrice: 0
    }];
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const availableBranches = selectedCustomer?.branches || [];
  const selectedBranch = availableBranches.find(b => b.id === selectedBranchId);

  // When customer changes, update invoice number with customer unique code (if creating new invoice) and set default branch
  useEffect(() => {
    if (selectedCustomer) {
      if (!editingInvoice) {
        const code = selectedCustomer.code ? selectedCustomer.code.trim().toUpperCase() : 'CUST';
        const year = new Date().getFullYear();
        const seq = Math.floor(100 + Math.random() * 900);
        setInvoiceNumber(`INV-${code}-${year}-${seq}`);
      }
      if (selectedCustomer.branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(selectedCustomer.branches[0].id);
      }
    }
  }, [selectedCustomerId]);

  // Recalculate Totals
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Handler for product selection in line item
  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
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

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `li-${Date.now()}-${Math.random()}`,
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

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || items.length === 0) return;

    const deliveryNoteNumber = `DN-${invoiceNumber.replace('INV-', '')}`;
    const deliveryNoteId = editingInvoice?.deliveryNoteId || `dn-${Date.now()}`;

    // Auto-calculate 7-day payment due term behind the scenes
    const calcDueDate = new Date(issueDate || Date.now());
    calcDueDate.setDate(calcDueDate.getDate() + 7);
    const autoDueDate = calcDueDate.toISOString().slice(0, 10);

    const newInvoice: Invoice = {
      id: editingInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber,
      customerId: selectedCustomerId,
      branchId: selectedBranchId || undefined,
      issueDate,
      dueDate: autoDueDate,
      items,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      amountPaid: editingInvoice?.amountPaid || 0,
      balanceDue: totalAmount - (editingInvoice?.amountPaid || 0),
      status: editingInvoice?.status || 'Sent',
      notes,
      deliveryNoteId,
      createdAt: editingInvoice?.createdAt || new Date().toISOString().slice(0, 10)
    };

    // Auto-create Delivery Note simultaneously!
    const newDeliveryNote: DeliveryNote = {
      id: deliveryNoteId,
      deliveryNoteNumber,
      invoiceId: newInvoice.id,
      customerId: selectedCustomerId,
      branchId: selectedBranchId || undefined,
      issueDate,
      deliveryAddress: selectedBranch ? selectedBranch.address : (selectedCustomer?.address || ''),
      recipientContact: selectedBranch ? selectedBranch.contactPerson : (selectedCustomer?.contactPerson || ''),
      recipientPhone: selectedBranch ? selectedBranch.phone : (selectedCustomer?.phone || ''),
      items,
      driverNotes,
      status: 'In Transit',
      createdAt: new Date().toISOString().slice(0, 10)
    };

    onSaveInvoice(newInvoice, newDeliveryNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl my-2 sm:my-8 overflow-hidden max-h-[96vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {editingInvoice ? 'Edit Tax Invoice' : 'Create New Invoice & Delivery Note'}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Simultaneously generates linked Delivery Note for dispatch
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Top Row: Invoice Metadata & Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice Number *
                </label>
                {selectedCustomer?.code && (
                  <span className="text-[10px] font-mono font-black bg-black text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/40">
                    Code: {selectedCustomer.code}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                placeholder="INV-CODE-2026-101"
              />
              {selectedCustomer?.code && (
                <button
                  type="button"
                  onClick={() => {
                    const code = selectedCustomer.code.trim().toUpperCase();
                    const year = new Date().getFullYear();
                    const seq = Math.floor(100 + Math.random() * 900);
                    setInvoiceNumber(`INV-${code}-${year}-${seq}`);
                  }}
                  className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                >
                  ⚡ Generate with code ({selectedCustomer.code})
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Customer *
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setSelectedBranchId('');
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-semibold text-blue-600 dark:text-blue-400"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.registeredName} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer Branch (Optional)
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="">Main Location / Headquarters</option>
                {availableBranches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                title="Invoice Issue Date"
              />
            </div>
          </div>

          {/* Customer Detail Preview Card */}
          {selectedCustomer && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row justify-between gap-2">
              <div>
                <span className="font-bold text-blue-900 dark:text-blue-300">Billed Customer:</span> {selectedCustomer.registeredName}
                {selectedBranch && (
                  <span className="ml-2 font-mono text-[11px] bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded font-bold">
                    Branch: {selectedBranch.name} ({selectedBranch.code})
                  </span>
                )}
                <br />
                <span className="text-slate-500 font-semibold">Address:</span> {selectedBranch ? selectedBranch.address : selectedCustomer.address}
              </div>
              <div className="sm:text-right">
                <div>
                  <span className="font-bold text-blue-900 dark:text-blue-300">Tax Reg / VAT:</span> {selectedBranch?.taxNumber || selectedCustomer.taxNumber || 'N/A'} / {selectedBranch?.vatNumber || selectedCustomer.vatNumber || 'N/A'}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span>Reg No: {selectedBranch?.registrationNumber || selectedCustomer.registrationNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Invoice Line Items
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                    <th className="p-3 min-w-[180px]">Select Catalog Product / Name</th>
                    <th className="p-3 min-w-[100px]">Pack Qty</th>
                    <th className="p-3 min-w-[100px]">Size</th>
                    <th className="p-3 min-w-[80px]">Qty</th>
                    <th className="p-3 min-w-[100px]">Price</th>
                    <th className="p-3 min-w-[100px] text-right">Total</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="bg-white dark:bg-slate-900">
                      <td className="p-2 space-y-1">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleSelectProduct(idx, e.target.value)}
                          className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 font-medium"
                        >
                          <option value="">-- Choose from Catalog --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.packQuantity} pack | {p.size} | {companySettings.currencySymbol}{p.price.toFixed(2)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          value={item.productName}
                          onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                          placeholder="Or type custom item name..."
                          className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-bold"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.packQuantity}
                          onChange={(e) => handleUpdateItem(idx, 'packQuantity', parseInt(e.target.value) || 1)}
                          className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-center"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={item.size}
                          onChange={(e) => handleUpdateItem(idx, 'size', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                          placeholder="e.g. 500ml"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-center font-bold"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-right font-medium"
                        />
                      </td>

                      <td className="p-2 text-right font-bold text-sm text-slate-900 dark:text-white">
                        {companySettings.currencySymbol}{item.totalPrice.toFixed(2)}
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Driver / Dispatch Instructions (Auto-printed on Delivery Note)
                </label>
                <textarea
                  rows={2}
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Terms & Conditions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Subtotal Calculation Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {companySettings.currencySymbol}{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  Tax / VAT Rate (%):
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-center font-bold"
                  />
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {companySettings.currencySymbol}{taxAmount.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between items-center">
                <span className="font-bold text-base text-slate-900 dark:text-white">Total Amount:</span>
                <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                  {companySettings.currencySymbol}{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Generate Invoice & Delivery Note
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
