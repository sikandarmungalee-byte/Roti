import React, { useState, useEffect, useRef } from 'react';
import {
  CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord, Lead, CommunicationEmail
} from './types';
import {
  loadCompanySettings,
  loadProducts,
  loadCustomers,
  loadInvoices,
  loadQuotations,
  loadDeliveryNotes,
  loadPayments,
  loadLeads,
  loadCommunications,
  FAKE_LEAD_IDS,
  FAKE_EMAIL_IDS,
  hasUserCloudData,
  migrateLocalDataToUserFirestore,
  subscribeToUserFirestore,
  saveCompanySettingsToFirestore,
  saveProductToFirestore,
  deleteDocumentFromUserFirestore,
  saveCustomerToFirestore,
  saveInvoiceToFirestore,
  saveQuotationToFirestore,
  saveDeliveryNoteToFirestore,
  savePaymentToFirestore,
  saveLeadToFirestore,
  saveCommunicationToFirestore,
  testFirestoreConnection
} from './utils/storage';

import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
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
import { DatabaseExplorerModal } from './components/DatabaseExplorerModal';
import { CommunicationLeadsHub } from './components/CommunicationLeadsHub';
import { LockScreen } from './components/LockScreen';
import { CheckCircle, Cloud, RefreshCw } from 'lucide-react';

export default function App() {
  const { currentUser, isLoading, setSyncState, setLastSyncedAt } = useAuth();

  // App Access Security Lock (PIN: 8271)
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return sessionStorage.getItem('isAppUnlocked') !== 'true';
  });

  const handleUnlock = () => {
    sessionStorage.setItem('isAppUnlocked', 'true');
    setIsLocked(false);
    showToast('Application unlocked.');
  };

  const handleLock = () => {
    sessionStorage.removeItem('isAppUnlocked');
    setIsLocked(true);
  };

  // Primary State (Synced with Firestore Cloud Database)
  const [companySettings, setCompanySettings] = useState<CompanySettings>(loadCompanySettings);
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [quotations, setQuotations] = useState<Quotation[]>(loadQuotations);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>(loadDeliveryNotes);
  const [payments, setPayments] = useState<PaymentRecord[]>(loadPayments);
  const [leads, setLeads] = useState<Lead[]>(() => loadLeads().filter(l => !FAKE_LEAD_IDS.has(l.id)));
  const [communications, setCommunications] = useState<CommunicationEmail[]>(() => loadCommunications().filter(c => !FAKE_EMAIL_IDS.has(c.id)));

  // View state
  const [activeTab, setActiveTab] = useState<NavTab>('invoices');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOfflinePreview, setIsOfflinePreview] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modals
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [isDatabaseExplorerOpen, setIsDatabaseExplorerOpen] = useState(false);
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
  const [autoOpenCompose, setAutoOpenCompose] = useState(false);
  const [autoOpenLead, setAutoOpenLead] = useState(false);

  // Track initial data migration per session
  const migrationAttemptedRef = useRef<string | null>(null);

  // Initial Firestore connectivity test
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Real-time Firestore Cloud Synchronization scoped under authenticated user account
  useEffect(() => {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;
    let isSubscribed = true;

    async function initializeUserStorage() {
      setSyncState('syncing');

      // Check if user already has data in Firestore or if this is their first sign-in
      if (migrationAttemptedRef.current !== uid) {
        migrationAttemptedRef.current = uid;
        const existsInCloud = await hasUserCloudData(uid);

        if (!existsInCloud) {
          // First time user signs into cloud: Migrate existing local records into user's Firestore cloud account
          console.log("No existing cloud data found. Uploading local dataset to user account...");
          await migrateLocalDataToUserFirestore(uid, {
            companySettings,
            products,
            customers,
            invoices,
            quotations,
            deliveryNotes,
            payments,
            leads,
            communications
          });
          showToast('Data preserved & synced to your cloud account!');
        } else {
          console.log("Existing cloud records found for user. Retrieving from Firestore...");
          showToast('Retrieved cloud data from your account.');
        }
      }

      if (!isSubscribed) return;

      // Subscribe to real-time updates for all user collections
      const unsub = subscribeToUserFirestore(uid, {
        onCompanyUpdate: (data) => {
          setCompanySettings(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onProductsUpdate: (data) => {
          setProducts(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onCustomersUpdate: (data) => {
          setCustomers(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onInvoicesUpdate: (data) => {
          setInvoices(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onQuotationsUpdate: (data) => {
          setQuotations(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onDeliveryNotesUpdate: (data) => {
          setDeliveryNotes(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onPaymentsUpdate: (data) => {
          setPayments(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onLeadsUpdate: (data) => {
          setLeads(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        },
        onCommunicationsUpdate: (data) => {
          setCommunications(data);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        }
      });

      return unsub;
    }

    let cancelListener: (() => void) | undefined;
    initializeUserStorage().then(unsub => {
      cancelListener = unsub;
    });

    return () => {
      isSubscribed = false;
      if (cancelListener) cancelListener();
    };
  }, [currentUser?.uid]);

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

    if (currentUser?.uid) {
      saveProductToFirestore(currentUser.uid, prod);
    }
    showToast(`Product "${prod.name}" saved to cloud.`);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'products', id);
    }
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

    if (currentUser?.uid) {
      saveCustomerToFirestore(currentUser.uid, cust);
    }
    showToast(`Customer "${cust.registeredName}" updated in cloud.`);
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'customers', id);
    }
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

    if (currentUser?.uid) {
      saveInvoiceToFirestore(currentUser.uid, newInvoice);
      saveDeliveryNoteToFirestore(currentUser.uid, newDeliveryNote);
    }

    showToast(`Invoice ${newInvoice.invoiceNumber} & Delivery Note ${newDeliveryNote.deliveryNoteNumber} saved to cloud!`);
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'invoices', id);
    }
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

    if (currentUser?.uid) {
      saveQuotationToFirestore(currentUser.uid, q);
    }
    showToast(`Quotation ${q.quotationNumber} saved to cloud.`);
  };

  const handleDeleteQuotation = (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'quotations', id);
    }
    showToast('Quotation deleted.');
  };

  // 1-Click Quotation -> Invoice & Delivery Note Conversion
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

    const updatedQuote: Quotation = {
      ...q,
      status: 'Accepted',
      convertedInvoiceId: newInv.id
    };

    setInvoices(prev => [newInv, ...prev]);
    setDeliveryNotes(prev => [newDN, ...prev]);
    setQuotations(prev => prev.map(item => item.id === q.id ? updatedQuote : item));

    if (currentUser?.uid) {
      saveInvoiceToFirestore(currentUser.uid, newInv);
      saveDeliveryNoteToFirestore(currentUser.uid, newDN);
      saveQuotationToFirestore(currentUser.uid, updatedQuote);
    }

    setActiveTab('invoices');
    showToast(`Converted Quotation ${q.quotationNumber} into Invoice ${invNo} and Delivery Note ${dnNo}!`);
  };

  // Handlers for Delivery Notes
  const handleUpdateDeliveryNoteStatus = (id: string, newStatus: DeliveryNote['status']) => {
    const updated = deliveryNotes.find(d => d.id === id);
    if (updated) {
      const modified = { ...updated, status: newStatus };
      setDeliveryNotes(prev => prev.map(d => d.id === id ? modified : d));
      if (currentUser?.uid) {
        saveDeliveryNoteToFirestore(currentUser.uid, modified);
      }
    }
    showToast('Delivery note status updated.');
  };

  const handleDeleteDeliveryNote = (id: string) => {
    setDeliveryNotes(prev => prev.filter(d => d.id !== id));
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'delivery_notes', id);
    }
    showToast('Delivery note deleted.');
  };

  // Handlers for Payments
  const handleSavePayment = (payment: PaymentRecord, updatedInvoice: Invoice) => {
    setPayments(prev => [payment, ...prev]);
    setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));

    if (currentUser?.uid) {
      savePaymentToFirestore(currentUser.uid, payment);
      saveInvoiceToFirestore(currentUser.uid, updatedInvoice);
    }
    showToast(`Payment of ${companySettings.currencySymbol}${payment.amount.toFixed(2)} recorded.`);
  };

  // Handlers for Leads
  const handleSaveLead = (lead: Lead) => {
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === lead.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = lead;
        return copy;
      }
      return [lead, ...prev];
    });

    if (currentUser?.uid) {
      saveLeadToFirestore(currentUser.uid, lead);
    }
  };

  const handleDeleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'leads', id);
    }
    showToast('Lead removed from pipeline.');
  };

  // Handlers for Communications
  const handleSaveCommunication = (comm: CommunicationEmail) => {
    setCommunications(prev => {
      const idx = prev.findIndex(c => c.id === comm.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = comm;
        return copy;
      }
      return [comm, ...prev];
    });

    if (currentUser?.uid) {
      saveCommunicationToFirestore(currentUser.uid, comm);
    }
  };

  const handleDeleteCommunication = (id: string) => {
    setCommunications(prev => prev.filter(c => c.id !== id));
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'communications', id);
    }
    showToast('Email record deleted.');
  };

  // Convert Lead to Customer directly
  const handleConvertLeadToCustomer = (lead: Lead) => {
    const custCode = `CUST-${Math.floor(100 + Math.random() * 900)}`;
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      registeredName: lead.companyName || lead.name,
      code: custCode,
      tradingName: lead.companyName || lead.name,
      isTradingSameAsRegistered: true,
      address: 'Johannesburg, South Africa',
      email: lead.email,
      contactPerson: lead.name,
      phone: lead.phone || '',
      branches: [],
      documents: [],
      createdAt: new Date().toISOString()
    };

    handleSaveCustomer(newCustomer);
  };

  // Handlers for Company Settings
  const handleSaveCompanySettings = (settings: CompanySettings) => {
    setCompanySettings(settings);
    if (currentUser?.uid) {
      saveCompanySettingsToFirestore(currentUser.uid, settings);
    }
    showToast('Company profile saved to cloud.');
  };

  // Unread emails count
  const unreadEmailCount = communications.filter(c => c.folder === 'inbox' && c.status === 'unread').length;

  // 1. Loading Authentication State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="p-4 bg-yellow-400 text-black rounded-2xl shadow-xl animate-pulse">
          <Cloud className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-extrabold text-white">Roti Bros Invoicing Suite</p>
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-400" />
            Connecting to Firebase Firestore Cloud...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Display Sign In Screen unless offline preview is requested
  if (!currentUser && !isOfflinePreview) {
    return (
      <AuthScreen
        hasLocalData={invoices.length > 0 || products.length > 0 || customers.length > 0}
        onContinueOffline={() => setIsOfflinePreview(true)}
      />
    );
  }

  // 3. Render Suite (Cloud-synced if logged in, or local cache if offline preview)
  return (
    <div className="min-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans">
      {/* Offline Mode Banner when previewing without sign in */}
      {!currentUser && isOfflinePreview && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Working in <strong>Offline Local Mode</strong>. All data is saved on this device.</span>
          </div>
          <button
            onClick={() => setIsOfflinePreview(false)}
            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-lg transition cursor-pointer"
          >
            Sign In with Google to Sync
          </button>
        </div>
      )}

      {/* PIN Security Lock Screen */}
      {isLocked && (
        <LockScreen
          onUnlock={handleUnlock}
          requiredPin="8271"
        />
      )}

      {/* Top Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        companySettings={companySettings}
        onOpenCompanySettings={() => setIsCompanySettingsOpen(true)}
        onOpenDatabaseExplorer={() => setIsDatabaseExplorerOpen(true)}
        onLockApp={handleLock}
        unreadEmailCount={unreadEmailCount}
        onOpenComposeEmail={() => {
          setActiveTab('communications');
          setAutoOpenCompose(true);
          setTimeout(() => setAutoOpenCompose(false), 400);
        }}
        onOpenCreateLead={() => {
          setActiveTab('communications');
          setAutoOpenLead(true);
          setTimeout(() => setAutoOpenLead(false), 400);
        }}
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
            invoices={invoices}
            companySettings={companySettings}
            onUpdateStatus={handleUpdateDeliveryNoteStatus}
            onDeleteDeliveryNote={handleDeleteDeliveryNote}
          />
        )}

        {activeTab === 'products' && (
          <ProductManagement
            products={products}
            currencySymbol={companySettings.currencySymbol}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            autoOpenCreate={autoOpenProduct}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManagement
            customers={customers}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            autoOpenCreate={autoOpenCustomer}
          />
        )}

        {activeTab === 'communications' && (
          <CommunicationLeadsHub
            leads={leads}
            communications={communications}
            customers={customers}
            invoices={invoices}
            quotations={quotations}
            deliveryNotes={deliveryNotes}
            companySettings={companySettings}
            onSaveLead={handleSaveLead}
            onDeleteLead={handleDeleteLead}
            onConvertLeadToCustomer={handleConvertLeadToCustomer}
            onSaveCommunication={handleSaveCommunication}
            onDeleteCommunication={handleDeleteCommunication}
            autoOpenCompose={autoOpenCompose}
            autoOpenCreateLead={autoOpenLead}
          />
        )}

        {activeTab === 'reports' && (
          <ConsolidatedReports
            invoices={invoices}
            quotations={quotations}
            deliveryNotes={deliveryNotes}
            payments={payments}
            customers={customers}
            companySettings={companySettings}
          />
        )}
      </main>

      {/* Modals */}
      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onClose={() => setIsCompanySettingsOpen(false)}
        settings={companySettings}
        onSave={handleSaveCompanySettings}
      />

      <DatabaseExplorerModal
        isOpen={isDatabaseExplorerOpen}
        onClose={() => setIsDatabaseExplorerOpen(false)}
        companySettings={companySettings}
        products={products}
        customers={customers}
        invoices={invoices}
        quotations={quotations}
        deliveryNotes={deliveryNotes}
        payments={payments}
        leads={leads}
        communications={communications}
        onDeleteInvoice={handleDeleteInvoice}
        onDeleteDeliveryNote={handleDeleteDeliveryNote}
        onDeleteProduct={handleDeleteProduct}
        onDeleteCustomer={handleDeleteCustomer}
        onDeleteQuotation={handleDeleteQuotation}
        onDeleteLead={handleDeleteLead}
        onDeleteCommunication={handleDeleteCommunication}
        onShowToast={showToast}
      />

      {isInvoiceFormOpen && (
        <InvoiceFormModal
          isOpen={isInvoiceFormOpen}
          onClose={() => {
            setIsInvoiceFormOpen(false);
            setEditingInvoice(null);
          }}
          invoice={editingInvoice}
          customers={customers}
          products={products}
          companySettings={companySettings}
          onSave={handleSaveInvoice}
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
          type={sendDocInfo.type}
          doc={sendDocInfo.doc}
          customer={sendDocInfo.customer}
          companySettings={companySettings}
          onLogCommunication={(comm) => {
            handleSaveCommunication(comm);
            showToast(`Recorded communication log for ${comm.recipient.name || comm.recipient.email}`);
          }}
        />
      )}
    </div>
  );
}
