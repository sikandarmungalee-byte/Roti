import React, { useState, useEffect } from 'react';
import {
  CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord
} from './types';
import {
  loadCompanySettings, saveCompanySettings,
  loadProducts, saveProducts,
  loadCustomers, saveCustomers,
  loadInvoices, saveInvoices,
  loadQuotations, saveQuotations,
  loadDeliveryNotes, saveDeliveryNotes,
  loadPayments, savePayments,
  subscribeToFirestore,
  testFirestoreConnection
} from './utils/storage';

import { Navigation, NavTab } from './components/Navigation';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { ProductManagement } from './components/ProductManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceFormModal } from './components/InvoiceFormModal';
import { QuotationListModal } from './components/QuotationListModal';
import { DeliveryNoteListModal } from './components/DeliveryNoteListModal';
import { ConsolidatedReports } from './components/ConsolidatedReports';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { SendDocumentModal } from './components/SendDocumentModal';
import { CheckCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Global State
  const [companySettings, setCompanySettings] = useState<CompanySettings>(loadCompanySettings);
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [quotations, setQuotations] = useState<Quotation[]>(loadQuotations);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>(loadDeliveryNotes);
  const [payments, setPayments] = useState<PaymentRecord[]>(loadPayments);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<NavTab>('invoices');

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modal States
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendDocInfo, setSendDocInfo] = useState<{ type: 'Invoice' | 'Quotation'; doc: any; customer: Customer } | null>(null);

  // Quick Action Auto Open Triggers
  const [autoOpenQuote, setAutoOpenQuote] = useState(false);
  const [autoOpenProduct, setAutoOpenProduct] = useState(false);
  const [autoOpenCustomer, setAutoOpenCustomer] = useState(false);

  // Real-time Firestore Subscription & Connection Check
  useEffect(() => {
    testFirestoreConnection();
    const unsub = subscribeToFirestore({
      onCompanyUpdate: setCompanySettings,
      onProductsUpdate: setProducts,
      onCustomersUpdate: setCustomers,
      onInvoicesUpdate: setInvoices,
      onQuotationsUpdate: setQuotations,
      onDeliveryNotesUpdate: setDeliveryNotes,
      onPaymentsUpdate: setPayments,
    });
    return () => unsub();
  }, []);

  // Persistence Effects
  useEffect(() => saveCompanySettings(companySettings), [companySettings]);
  useEffect(() => saveProducts(products), [products]);
  useEffect(() => saveCustomers(customers), [customers]);
  useEffect(() => saveInvoices(invoices), [invoices]);
  useEffect(() => saveQuotations(quotations), [quotations]);
  useEffect(() => saveDeliveryNotes(deliveryNotes), [deliveryNotes]);
  useEffect(() => savePayments(payments), [payments]);

  // Handlers for Products
  const handleSaveProduct = (prod: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = prod;
        return copy;
      }
      return [prod, ...prev];
    });
    showToast(`Product "${prod.name}" saved successfully.`);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('Product removed from catalog.');
  };

  // Handlers for Customers
  const handleSaveCustomer = (cust: Customer) => {
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.id === cust.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = cust;
        return copy;
      }
      return [cust, ...prev];
    });
    showToast(`Customer "${cust.registeredName}" updated.`);
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    showToast('Customer record deleted.');
  };

  // Handlers for Invoices & Auto Delivery Note
  const handleSaveInvoice = (newInvoice: Invoice, newDeliveryNote: DeliveryNote) => {
    setInvoices(prev => {
      const idx = prev.findIndex(i => i.id === newInvoice.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newInvoice;
        return copy;
      }
      return [newInvoice, ...prev];
    });

    setDeliveryNotes(prev => {
      const idx = prev.findIndex(d => d.id === newDeliveryNote.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newDeliveryNote;
        return copy;
      }
      return [newDeliveryNote, ...prev];
    });

    showToast(`Invoice ${newInvoice.invoiceNumber} and Delivery Note ${newDeliveryNote.deliveryNoteNumber} generated simultaneously!`);
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
    showToast('Invoice deleted.');
  };

  // Handlers for Quotations
  const handleSaveQuotation = (q: Quotation) => {
    setQuotations(prev => {
      const idx = prev.findIndex(item => item.id === q.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = q;
        return copy;
      }
      return [q, ...prev];
    });
    showToast(`Quotation ${q.quotationNumber} saved.`);
  };

  const handleDeleteQuotation = (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
    showToast('Quotation deleted.');
  };

  // 1-Click Quotation -> Invoice & Delivery Note Conversion!
  const handleConvertQuotationToInvoice = (q: Quotation) => {
    const cust = customers.find(c => c.id === q.customerId);
    const branch = cust?.branches.find(b => b.id === q.branchId);

    const custCode = cust?.code ? cust.code.trim().toUpperCase() : 'CUST';
    const invNo = `INV-${custCode}-2026-${Math.floor(100 + Math.random() * 900)}`;
    const dnNo = `DN-${invNo.replace('INV-', '')}`;
    const dnId = `dn-${Date.now()}`;

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNo,
      customerId: q.customerId,
      branchId: q.branchId,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      items: q.items,
      subtotal: q.subtotal,
      taxRate: q.taxRate,
      taxAmount: q.taxAmount,
      totalAmount: q.totalAmount,
      amountPaid: 0,
      balanceDue: q.totalAmount,
      status: 'Sent',
      notes: q.notes,
      deliveryNoteId: dnId,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const newDN: DeliveryNote = {
      id: dnId,
      deliveryNoteNumber: dnNo,
      invoiceId: newInv.id,
      quotationId: q.id,
      customerId: q.customerId,
      branchId: q.branchId,
      issueDate: newInv.issueDate,
      deliveryAddress: branch ? branch.address : (cust?.address || ''),
      recipientContact: branch ? branch.contactPerson : (cust?.contactPerson || ''),
      recipientPhone: branch ? branch.phone : (cust?.phone || ''),
      items: q.items,
      driverNotes: 'Converted from quotation. Check item pack counts upon delivery.',
      status: 'In Transit',
      createdAt: newInv.createdAt
    };

    setInvoices(prev => [newInv, ...prev]);
    setDeliveryNotes(prev => [newDN, ...prev]);

    // Update Quotation status to Accepted
    setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: 'Accepted', convertedInvoiceId: newInv.id } : item));

    setActiveTab('invoices');
    showToast(`Successfully converted Quotation ${q.quotationNumber} into Invoice ${invNo} and Delivery Note ${dnNo}!`);
  };

  // Handlers for Delivery Note Status Updates
  const handleUpdateDeliveryNoteStatus = (id: string, newStatus: DeliveryNote['status']) => {
    setDeliveryNotes(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    showToast('Delivery note status updated.');
  };

  // Handlers for Payment Recording
  const handleSavePayment = (payment: PaymentRecord, updatedInvoice: Invoice) => {
    setPayments(prev => [payment, ...prev]);
    setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));
    showToast(`Payment of ${companySettings.currencySymbol}${payment.amount.toFixed(2)} recorded against ${updatedInvoice.invoiceNumber}.`);
  };

  return (
    <div className="min-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans">
      
      {/* Top Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        companySettings={companySettings}
        onOpenCompanySettings={() => setIsCompanySettingsOpen(true)}
        onOpenCreateInvoice={() => {
          setEditingInvoice(null);
          setIsInvoiceFormOpen(true);
        }}
        onOpenCreateQuotation={() => {
          setAutoOpenQuote(true);
          setTimeout(() => setAutoOpenQuote(false), 300);
        }}
        onOpenCreateProduct={() => {
          setAutoOpenProduct(true);
          setTimeout(() => setAutoOpenProduct(false), 300);
        }}
        onOpenCreateCustomer={() => {
          setAutoOpenCustomer(true);
          setTimeout(() => setAutoOpenCustomer(false), 300);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {activeTab === 'invoices' && (
          <InvoiceList
            invoices={invoices}
            customers={customers}
            deliveryNotes={deliveryNotes}
            companySettings={companySettings}
            onOpenCreateInvoice={() => {
              setEditingInvoice(null);
              setIsInvoiceFormOpen(true);
            }}
            onOpenEditInvoice={(inv) => {
              setEditingInvoice(inv);
              setIsInvoiceFormOpen(true);
            }}
            onDeleteInvoice={handleDeleteInvoice}
            onOpenRecordPayment={(inv) => {
              setPaymentInvoice(inv);
              setIsRecordPaymentOpen(true);
            }}
            onOpenSendModal={(type, doc, customer) => {
              setSendDocInfo({ type, doc, customer });
              setIsSendModalOpen(true);
            }}
          />
        )}

        {activeTab === 'quotations' && (
          <QuotationListModal
            quotations={quotations}
            customers={customers}
            products={products}
            companySettings={companySettings}
            onSaveQuotation={handleSaveQuotation}
            onDeleteQuotation={handleDeleteQuotation}
            onConvertQuotationToInvoice={handleConvertQuotationToInvoice}
            onOpenSendModal={(type, doc, customer) => {
              setSendDocInfo({ type, doc, customer });
              setIsSendModalOpen(true);
            }}
            autoOpenCreate={autoOpenQuote}
          />
        )}

        {activeTab === 'deliveryNotes' && (
          <DeliveryNoteListModal
            deliveryNotes={deliveryNotes}
            customers={customers}
            companySettings={companySettings}
            onUpdateStatus={handleUpdateDeliveryNoteStatus}
          />
        )}

        {activeTab === 'products' && (
          <ProductManagement
            products={products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            currencySymbol={companySettings.currencySymbol}
            autoOpenCreate={autoOpenProduct}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManagement
            customers={customers}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            invoices={invoices}
            payments={payments}
            deliveryNotes={deliveryNotes}
            quotations={quotations}
            currencySymbol={companySettings.currencySymbol}
            autoOpenCreate={autoOpenCustomer}
          />
        )}

        {activeTab === 'reports' && (
          <ConsolidatedReports
            invoices={invoices}
            payments={payments}
            customers={customers}
            companySettings={companySettings}
          />
        )}

      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div>
          <span className="font-bold text-slate-800">{companySettings.name}</span> • South Africa Invoicing, Delivery Dispatch & Consolidated Reporting Suite
        </div>
      </footer>

      {/* Modals */}
      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onClose={() => setIsCompanySettingsOpen(false)}
        settings={companySettings}
        onSave={(updated) => {
          setCompanySettings(updated);
          showToast('Company settings & banking details updated.');
        }}
      />

      {isInvoiceFormOpen && (
        <InvoiceFormModal
          isOpen={isInvoiceFormOpen}
          onClose={() => setIsInvoiceFormOpen(false)}
          onSaveInvoice={handleSaveInvoice}
          customers={customers}
          products={products}
          editingInvoice={editingInvoice}
          companySettings={companySettings}
        />
      )}

      {isRecordPaymentOpen && paymentInvoice && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setPaymentInvoice(null);
          }}
          invoice={paymentInvoice}
          companySettings={companySettings}
          onSavePayment={handleSavePayment}
        />
      )}

      {isSendModalOpen && sendDocInfo && (
        <SendDocumentModal
          isOpen={isSendModalOpen}
          onClose={() => {
            setIsSendModalOpen(false);
            setSendDocInfo(null);
          }}
          documentType={sendDocInfo.type}
          doc={sendDocInfo.doc}
          customer={sendDocInfo.customer}
          companySettings={companySettings}
        />
      )}

    </div>
  );
}
