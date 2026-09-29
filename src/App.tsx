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
  fetchUserCloudData,
  purgeFakeDataFromCloudAndLocal,
  saveCompanySettings,
  saveProducts,
  saveCustomers,
  saveInvoices,
  saveQuotations,
  saveDeliveryNotes,
  savePayments,
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
import { CheckCircle, Cloud, RefreshCw, CloudUpload, CloudDownload, Database, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const { currentUser, isLoading, syncState, setSyncState, setLastSyncedAt, signInWithGoogle, authError, clearAuthError } = useAuth();

  // App Access Security Lock (Default PIN: 8271)
  const [appSecurityPin, setAppSecurityPin] = useState<string>(() => {
    return localStorage.getItem('appSecurityPin') || '8271';
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return sessionStorage.getItem('isAppSessionUnlocked') !== 'true';
  });

  const handleUnlock = () => {
    sessionStorage.setItem('isAppSessionUnlocked', 'true');
    setIsLocked(false);
    showToast('Application unlocked.');
  };

  const handleLock = () => {
    sessionStorage.removeItem('isAppSessionUnlocked');
    setIsLocked(true);
    showToast('Application locked.');
  };

  const handleUpdatePin = (newPin: string) => {
    localStorage.setItem('appSecurityPin', newPin);
    setAppSecurityPin(newPin);
    showToast('Security PIN updated successfully.');
  };

  const [dismissedSyncBar, setDismissedSyncBar] = useState<boolean>(false);

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

  useEffect(() => {
    if (authError) {
      showToast(`Sign-In Notice: ${authError}`);
    }
  }, [authError]);

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

  // Automatically purge all mock/fake demo data from local and cloud storage
  useEffect(() => {
    testFirestoreConnection();
    purgeFakeDataFromCloudAndLocal(currentUser?.uid).then(() => {
      setProducts(loadProducts());
      setCustomers(loadCustomers());
      setInvoices(loadInvoices());
      setQuotations(loadQuotations());
      setDeliveryNotes(loadDeliveryNotes());
      setPayments(loadPayments());
    });
  }, [currentUser?.uid]);

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
            companySettings: loadCompanySettings(),
            products: loadProducts(),
            customers: loadCustomers(),
            invoices: loadInvoices(),
            quotations: loadQuotations(),
            deliveryNotes: loadDeliveryNotes(),
            payments: loadPayments(),
            leads,
            communications
          });
          showToast('Your records are preserved & synced to your cloud account!');
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
      const updated = idx >= 0 ? prev.map((p, i) => i === idx ? prod : p) : [prod, ...prev];
      saveProducts(updated, currentUser?.uid);
      return updated;
    });

    if (currentUser?.uid) {
      saveProductToFirestore(currentUser.uid, prod);
    }
    showToast(`Product "${prod.name}" saved.`);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveProducts(updated, currentUser?.uid);
      return updated;
    });
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'products', id);
    }
    showToast('Product removed from catalog.');
  };

  // Handlers for Customers
  const handleSaveCustomer = (cust: Customer) => {
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.id === cust.id);
      const updated = idx >= 0 ? prev.map((c, i) => i === idx ? cust : c) : [cust, ...prev];
      saveCustomers(updated, currentUser?.uid);
      return updated;
    });

    if (currentUser?.uid) {
      saveCustomerToFirestore(currentUser.uid, cust);
    }
    showToast(`Customer "${cust.registeredName}" updated.`);
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveCustomers(updated, currentUser?.uid);
      return updated;
    });
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'customers', id);
    }
    showToast('Customer record deleted.');
  };

  // Handlers for Invoices & Auto Delivery Note
  const handleSaveInvoice = (newInvoice: Invoice, newDeliveryNote: DeliveryNote) => {
    setInvoices(prev => {
      const idx = prev.findIndex(i => i.id === newInvoice.id);
      const updated = idx >= 0 ? prev.map((inv, i) => i === idx ? newInvoice : inv) : [newInvoice, ...prev];
      saveInvoices(updated, currentUser?.uid);
      return updated;
    });

    setDeliveryNotes(prev => {
      const idx = prev.findIndex(d => d.id === newDeliveryNote.id);
      const updated = idx >= 0 ? prev.map((dn, i) => i === idx ? newDeliveryNote : dn) : [newDeliveryNote, ...prev];
      saveDeliveryNotes(updated, currentUser?.uid);
      return updated;
    });

    if (currentUser?.uid) {
      saveInvoiceToFirestore(currentUser.uid, newInvoice);
      saveDeliveryNoteToFirestore(currentUser.uid, newDeliveryNote);
    }

    showToast(`Invoice ${newInvoice.invoiceNumber} & Delivery Note saved.`);
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => {
      const updated = prev.filter(i => i.id !== id);
      saveInvoices(updated, currentUser?.uid);
      return updated;
    });
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'invoices', id);
    }
    showToast('Invoice deleted.');
  };

  // Handlers for Quotations
  const handleSaveQuotation = (q: Quotation) => {
    setQuotations(prev => {
      const idx = prev.findIndex(item => item.id === q.id);
      const updated = idx >= 0 ? prev.map((item, i) => i === idx ? q : item) : [q, ...prev];
      saveQuotations(updated, currentUser?.uid);
      return updated;
    });

    if (currentUser?.uid) {
      saveQuotationToFirestore(currentUser.uid, q);
    }
    showToast(`Quotation ${q.quotationNumber} saved.`);
  };

  const handleDeleteQuotation = (id: string) => {
    setQuotations(prev => {
      const updated = prev.filter(q => q.id !== id);
      saveQuotations(updated, currentUser?.uid);
      return updated;
    });
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

    setInvoices(prev => {
      const updated = [newInv, ...prev];
      saveInvoices(updated, currentUser?.uid);
      return updated;
    });
    setDeliveryNotes(prev => {
      const updated = [newDN, ...prev];
      saveDeliveryNotes(updated, currentUser?.uid);
      return updated;
    });
    setQuotations(prev => {
      const updated = prev.map(item => item.id === q.id ? updatedQuote : item);
      saveQuotations(updated, currentUser?.uid);
      return updated;
    });

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
      setDeliveryNotes(prev => {
        const nextList = prev.map(d => d.id === id ? modified : d);
        saveDeliveryNotes(nextList, currentUser?.uid);
        return nextList;
      });
      if (currentUser?.uid) {
        saveDeliveryNoteToFirestore(currentUser.uid, modified);
      }
    }
    showToast('Delivery note status updated.');
  };

  const handleDeleteDeliveryNote = (id: string) => {
    setDeliveryNotes(prev => {
      const updated = prev.filter(d => d.id !== id);
      saveDeliveryNotes(updated, currentUser?.uid);
      return updated;
    });
    if (currentUser?.uid) {
      deleteDocumentFromUserFirestore(currentUser.uid, 'delivery_notes', id);
    }
    showToast('Delivery note deleted.');
  };

  // Handlers for Payments
  const handleSavePayment = (payment: PaymentRecord, updatedInvoice: Invoice) => {
    setPayments(prev => {
      const updated = [payment, ...prev];
      savePayments(updated, currentUser?.uid);
      return updated;
    });
    setInvoices(prev => {
      const updated = prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i);
      saveInvoices(updated, currentUser?.uid);
      return updated;
    });

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
    saveCompanySettings(settings, currentUser?.uid);
    if (currentUser?.uid) {
      saveCompanySettingsToFirestore(currentUser.uid, settings);
    }
    showToast('Company profile saved.');
  };

  // Multi-Device Cloud Force Sync Utilities
  const handleForcePushToCloud = async () => {
    if (!currentUser?.uid) {
      showToast('Please sign in with Google first.');
      return;
    }
    showToast('Pushing all records to your cloud database...');
    await migrateLocalDataToUserFirestore(currentUser.uid, {
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
    setSyncState('synced');
    setLastSyncedAt(new Date());
    showToast('All records successfully pushed to your cloud account!');
  };

  const handleForcePullFromCloud = async () => {
    if (!currentUser?.uid) {
      showToast('Please sign in with Google first.');
      return;
    }
    showToast('Fetching latest records from your cloud account...');
    const cloudData = await fetchUserCloudData(currentUser.uid);
    if (cloudData) {
      if (cloudData.companySettings) {
        setCompanySettings(cloudData.companySettings);
        saveCompanySettings(cloudData.companySettings, currentUser.uid);
      }
      if (cloudData.products && cloudData.products.length > 0) {
        setProducts(cloudData.products);
        saveProducts(cloudData.products, currentUser.uid);
      }
      if (cloudData.customers && cloudData.customers.length > 0) {
        setCustomers(cloudData.customers);
        saveCustomers(cloudData.customers, currentUser.uid);
      }
      if (cloudData.invoices && cloudData.invoices.length > 0) {
        setInvoices(cloudData.invoices);
        saveInvoices(cloudData.invoices, currentUser.uid);
      }
      if (cloudData.quotations && cloudData.quotations.length > 0) {
        setQuotations(cloudData.quotations);
        saveQuotations(cloudData.quotations, currentUser.uid);
      }
      if (cloudData.deliveryNotes && cloudData.deliveryNotes.length > 0) {
        setDeliveryNotes(cloudData.deliveryNotes);
        saveDeliveryNotes(cloudData.deliveryNotes, currentUser.uid);
      }
      if (cloudData.payments && cloudData.payments.length > 0) {
        setPayments(cloudData.payments);
        savePayments(cloudData.payments, currentUser.uid);
      }
      setSyncState('synced');
      setLastSyncedAt(new Date());
      showToast('Retrieved cloud data successfully!');
    } else {
      showToast('No cloud records found yet. Uploading local dataset...');
      await handleForcePushToCloud();
    }
  };

  // Unread emails count
  const unreadEmailCount = communications.filter(c => c.folder === 'inbox' && c.status === 'unread').length;

  // Render Full Production Suite Immediately (Zero-block startup)
  return (
    <div className="min-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans">
      {/* Cloud Sync Status Bar (When Signed In) */}
      {currentUser && (
        <div className="bg-slate-900 border-b border-emerald-500/40 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="truncate">
              Connected: <strong className="text-emerald-300">{currentUser.email}</strong> &bull; Multi-Device Cloud Sync ({invoices.length} Inv, {products.length} Prod, {customers.length} Cust)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleForcePushToCloud}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition cursor-pointer"
              title="Upload all local records into your cloud database"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>Upload to Cloud</span>
            </button>
            <button
              onClick={handleForcePullFromCloud}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-xs border border-slate-700 transition cursor-pointer"
              title="Pull latest cloud documents from Firestore"
            >
              <CloudDownload className="w-3.5 h-3.5" />
              <span>Pull from Cloud</span>
            </button>
          </div>
        </div>
      )}

      {/* Cloud Sync Announcement & Quick Sign-in Bar (When Signed Out) */}
      {!currentUser && !dismissedSyncBar && (
        <div className="bg-slate-900 border-b border-yellow-500/30 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">
              <strong>Workspace Active:</strong> Viewing your local invoices & records. Sign in with Google to sync in real-time across your phone and PC.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold rounded-lg shadow transition cursor-pointer text-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <button
              onClick={() => setDismissedSyncBar(true)}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* PIN Security Lock Screen */}
      {isLocked && (
        <LockScreen
          onUnlock={handleUnlock}
          requiredPin={appSecurityPin}
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
        securityPin={appSecurityPin}
        onUpdatePin={handleUpdatePin}
        onLockNow={handleLock}
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
