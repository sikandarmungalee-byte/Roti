import { CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord, Lead, CommunicationEmail } from '../types';
import { initialCompanySettings, initialProducts, initialCustomers, initialInvoices, initialQuotations, initialDeliveryNotes, initialPayments, initialLeads, initialCommunications } from '../data/seedData';
import { doc, collection, setDoc, deleteDoc, getDocs, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const STORAGE_KEYS = {
  COMPANY: 'invoicepro_company',
  PRODUCTS: 'invoicepro_products',
  CUSTOMERS: 'invoicepro_customers',
  INVOICES: 'invoicepro_invoices',
  QUOTATIONS: 'invoicepro_quotations',
  DELIVERY_NOTES: 'invoicepro_delivery_notes',
  PAYMENTS: 'invoicepro_payments',
  LEADS: 'invoicepro_leads',
  COMMUNICATIONS: 'invoicepro_communications',
};

// Sanitization helper to prevent Firestore "undefined value" and document size limit errors
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  
  const sanitizedJson = JSON.stringify(data, (key, value) => {
    if (value === undefined) return null;
    if (key === 'fileDataUrl' && typeof value === 'string' && value.length > 500000) {
      // Truncate giant base64 strings for cloud storage safety so document stays under 1MB limit
      return value.slice(0, 100) + '...[file_stored_locally]';
    }
    return value;
  });

  return JSON.parse(sanitizedJson);
}

// In-memory equality tracking to prevent infinite echo loops
let lastCompanyJson = '';
let lastProductsJson = '';
let lastCustomersJson = '';
let lastInvoicesJson = '';
let lastQuotationsJson = '';
let lastDeliveryNotesJson = '';
let lastPaymentsJson = '';
let lastLeadsJson = '';
let lastCommunicationsJson = '';

// Known demo IDs to guarantee removal
export const FAKE_LEAD_IDS = new Set(['lead-1', 'lead-2', 'lead-3']);
export const FAKE_EMAIL_IDS = new Set(['email-1', 'email-2', 'email-3']);

// Clean any cached demo items from storage on initial script load
try {
  const rawL = localStorage.getItem(STORAGE_KEYS.LEADS);
  if (rawL) {
    const arr = JSON.parse(rawL) as Lead[];
    const filtered = arr.filter(l => !FAKE_LEAD_IDS.has(l.id));
    if (filtered.length !== arr.length) {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(filtered));
      FAKE_LEAD_IDS.forEach(id => deleteDocumentFromFirestore('leads', id));
    }
  }
  const rawC = localStorage.getItem(STORAGE_KEYS.COMMUNICATIONS);
  if (rawC) {
    const arr = JSON.parse(rawC) as CommunicationEmail[];
    const filtered = arr.filter(c => !FAKE_EMAIL_IDS.has(c.id));
    if (filtered.length !== arr.length) {
      localStorage.setItem(STORAGE_KEYS.COMMUNICATIONS, JSON.stringify(filtered));
      FAKE_EMAIL_IDS.forEach(id => deleteDocumentFromFirestore('communications', id));
    }
  }
} catch (e) {
  // ignore
}

// Global sync state listeners
type SyncCallback = (status: 'connected' | 'syncing' | 'offline') => void;
const syncStatusListeners: SyncCallback[] = [];
let currentSyncStatus: 'connected' | 'syncing' | 'offline' = 'connected';

export function onSyncStatusChange(cb: SyncCallback): () => void {
  syncStatusListeners.push(cb);
  cb(currentSyncStatus);
  return () => {
    const idx = syncStatusListeners.indexOf(cb);
    if (idx >= 0) syncStatusListeners.splice(idx, 1);
  };
}

function updateSyncStatus(status: 'connected' | 'syncing' | 'offline') {
  currentSyncStatus = status;
  syncStatusListeners.forEach(cb => {
    try {
      cb(status);
    } catch (e) {
      // ignore
    }
  });
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    updateSyncStatus('syncing');
    const testDoc = doc(db, 'system', 'connection_test');
    await setDoc(testDoc, { connectedAt: new Date().toISOString(), platform: navigator.userAgent }, { merge: true });
    updateSyncStatus('connected');
    return true;
  } catch (e) {
    console.warn("Firestore connection check notice:", e);
    updateSyncStatus('offline');
    return false;
  }
}

// Helper local sync
export function setLocalOnly(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage write error:', e);
  }
}

// Direct single-document Firestore writer
export async function saveSingleDocumentToFirestore(colName: string, id: string, data: any): Promise<void> {
  if (!colName || !id) return;
  try {
    updateSyncStatus('syncing');
    const docRef = doc(db, colName, id);
    await setDoc(docRef, sanitizeForFirestore(data), { merge: true });
    updateSyncStatus('connected');
  } catch (e) {
    console.error(`Error saving document [${id}] in collection [${colName}] to Firestore:`, e);
    updateSyncStatus('offline');
  }
}

// Direct multi-doc sync helper: writes/upserts items immediately via setDoc
export async function syncCollectionToFirestore(colName: string, items: Array<{ id: string } & Record<string, any>>): Promise<void> {
  if (!items || !items.length) return;
  try {
    updateSyncStatus('syncing');
    const savePromises = items.map(item => {
      if (!item || !item.id) return Promise.resolve();
      const docRef = doc(db, colName, item.id);
      return setDoc(docRef, sanitizeForFirestore(item), { merge: true });
    });
    await Promise.all(savePromises);
    updateSyncStatus('connected');
  } catch (e) {
    console.error(`Firestore sync failed for collection [${colName}]:`, e);
    updateSyncStatus('offline');
  }
}

export async function deleteDocumentFromFirestore(colName: string, id: string): Promise<void> {
  if (!colName || !id) return;
  try {
    updateSyncStatus('syncing');
    await deleteDoc(doc(db, colName, id));
    updateSyncStatus('connected');
  } catch (e) {
    console.error(`Error deleting doc [${id}] from collection [${colName}]:`, e);
    updateSyncStatus('offline');
  }
}

// --- Company Settings ---
export function loadCompanySettings(): CompanySettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
    return data ? JSON.parse(data) : initialCompanySettings;
  } catch (e) {
    return initialCompanySettings;
  }
}

export function saveCompanySettings(settings: CompanySettings): void {
  const json = JSON.stringify(settings);
  setLocalOnly(STORAGE_KEYS.COMPANY, settings);
  if (json === lastCompanyJson) return;
  lastCompanyJson = json;

  const sanitized = sanitizeForFirestore(settings);
  // Write to 'main' and 'profile' to maintain 100% compatibility
  setDoc(doc(db, 'company_settings', 'main'), sanitized, { merge: true }).catch(() => {});
  setDoc(doc(db, 'company_settings', 'profile'), sanitized, { merge: true }).catch(() => {});
}

// --- Products ---
export function loadProducts(): Product[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? (JSON.parse(data) as Product[]) : initialProducts;
  } catch (e) {
    return initialProducts;
  }
}

export function saveProducts(products: Product[]): void {
  const json = JSON.stringify(products);
  setLocalOnly(STORAGE_KEYS.PRODUCTS, products);
  if (json === lastProductsJson) return;
  lastProductsJson = json;

  syncCollectionToFirestore('products', products);
}

// --- Customers ---
export function loadCustomers(): Customer[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? (JSON.parse(data) as Customer[]) : initialCustomers;
  } catch (e) {
    return initialCustomers;
  }
}

export function saveCustomers(customers: Customer[]): void {
  const sanitizedCustomers = customers.map(c => ({
    ...c,
    branches: c.branches || [],
    documents: c.documents || []
  }));

  const json = JSON.stringify(sanitizedCustomers);
  setLocalOnly(STORAGE_KEYS.CUSTOMERS, sanitizedCustomers);
  if (json === lastCustomersJson) return;
  lastCustomersJson = json;

  syncCollectionToFirestore('customers', sanitizedCustomers);
}

// --- Invoices ---
export function loadInvoices(): Invoice[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? (JSON.parse(data) as Invoice[]) : initialInvoices;
  } catch (e) {
    return initialInvoices;
  }
}

export function saveInvoices(invoices: Invoice[]): void {
  const json = JSON.stringify(invoices);
  setLocalOnly(STORAGE_KEYS.INVOICES, invoices);
  if (json === lastInvoicesJson) return;
  lastInvoicesJson = json;

  syncCollectionToFirestore('invoices', invoices);
}

// --- Quotations ---
export function loadQuotations(): Quotation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
    return data ? (JSON.parse(data) as Quotation[]) : initialQuotations;
  } catch (e) {
    return initialQuotations;
  }
}

export function saveQuotations(quotations: Quotation[]): void {
  const json = JSON.stringify(quotations);
  setLocalOnly(STORAGE_KEYS.QUOTATIONS, quotations);
  if (json === lastQuotationsJson) return;
  lastQuotationsJson = json;

  syncCollectionToFirestore('quotations', quotations);
}

// --- Delivery Notes ---
export function loadDeliveryNotes(): DeliveryNote[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DELIVERY_NOTES);
    return data ? (JSON.parse(data) as DeliveryNote[]) : initialDeliveryNotes;
  } catch (e) {
    return initialDeliveryNotes;
  }
}

export function saveDeliveryNotes(deliveryNotes: DeliveryNote[]): void {
  const json = JSON.stringify(deliveryNotes);
  setLocalOnly(STORAGE_KEYS.DELIVERY_NOTES, deliveryNotes);
  if (json === lastDeliveryNotesJson) return;
  lastDeliveryNotesJson = json;

  syncCollectionToFirestore('delivery_notes', deliveryNotes);
}

// --- Payments ---
export function loadPayments(): PaymentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return data ? (JSON.parse(data) as PaymentRecord[]) : initialPayments;
  } catch (e) {
    return initialPayments;
  }
}

export function savePayments(payments: PaymentRecord[]): void {
  const json = JSON.stringify(payments);
  setLocalOnly(STORAGE_KEYS.PAYMENTS, payments);
  if (json === lastPaymentsJson) return;
  lastPaymentsJson = json;

  syncCollectionToFirestore('payments', payments);
}

// --- Leads ---
export function loadLeads(): Lead[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LEADS);
    const parsed = data ? (JSON.parse(data) as Lead[]) : initialLeads;
    const cleaned = parsed.filter(l => !FAKE_LEAD_IDS.has(l.id));
    if (cleaned.length !== parsed.length) {
      setLocalOnly(STORAGE_KEYS.LEADS, cleaned);
      FAKE_LEAD_IDS.forEach(id => deleteDocumentFromFirestore('leads', id));
    }
    return cleaned;
  } catch (e) {
    return [];
  }
}

export function saveLeads(leads: Lead[]): void {
  const cleaned = leads.filter(l => !FAKE_LEAD_IDS.has(l.id));
  const json = JSON.stringify(cleaned);
  setLocalOnly(STORAGE_KEYS.LEADS, cleaned);
  if (json === lastLeadsJson) return;
  lastLeadsJson = json;

  syncCollectionToFirestore('leads', cleaned);
}

// --- Communications ---
export function loadCommunications(): CommunicationEmail[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COMMUNICATIONS);
    const parsed = data ? (JSON.parse(data) as CommunicationEmail[]) : initialCommunications;
    const cleaned = parsed.filter(c => !FAKE_EMAIL_IDS.has(c.id));
    if (cleaned.length !== parsed.length) {
      setLocalOnly(STORAGE_KEYS.COMMUNICATIONS, cleaned);
      FAKE_EMAIL_IDS.forEach(id => deleteDocumentFromFirestore('communications', id));
    }
    return cleaned;
  } catch (e) {
    return [];
  }
}

export function saveCommunications(comms: CommunicationEmail[]): void {
  const cleaned = comms.filter(c => !FAKE_EMAIL_IDS.has(c.id));
  const json = JSON.stringify(cleaned);
  setLocalOnly(STORAGE_KEYS.COMMUNICATIONS, cleaned);
  if (json === lastCommunicationsJson) return;
  lastCommunicationsJson = json;

  syncCollectionToFirestore('communications', cleaned);
}

// Two-way smart merge helper by unique document ID
export function mergeItemsById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  // 1. Populate from local
  (local || []).forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  // 2. Cloud documents overwrite or add (authoritative)
  (cloud || []).forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  return Array.from(map.values());
}

// Explicit Full-Cloud Fetcher: Pulls all collections from Firestore with smart bidirectional merge
export async function pullAllFromFirestore(): Promise<{
  company?: CompanySettings;
  products?: Product[];
  customers?: Customer[];
  invoices?: Invoice[];
  quotations?: Quotation[];
  deliveryNotes?: DeliveryNote[];
  payments?: PaymentRecord[];
  leads?: Lead[];
  communications?: CommunicationEmail[];
}> {
  updateSyncStatus('syncing');
  const result: any = {};
  try {
    // 1. Company
    const mainDoc = await getDoc(doc(db, 'company_settings', 'main'));
    if (mainDoc.exists()) {
      result.company = mainDoc.data() as CompanySettings;
    } else {
      const profDoc = await getDoc(doc(db, 'company_settings', 'profile'));
      if (profDoc.exists()) {
        result.company = profDoc.data() as CompanySettings;
        setDoc(doc(db, 'company_settings', 'main'), sanitizeForFirestore(result.company), { merge: true }).catch(() => {});
      }
    }
    if (result.company) {
      lastCompanyJson = JSON.stringify(result.company);
      setLocalOnly(STORAGE_KEYS.COMPANY, result.company);
    }

    // 2. Products
    const prodSnap = await getDocs(collection(db, 'products'));
    const cloudProducts = prodSnap.docs.map(d => d.data() as Product);
    const localProducts = loadProducts();
    const mergedProducts = mergeItemsById(localProducts, cloudProducts);
    result.products = mergedProducts;
    lastProductsJson = JSON.stringify(mergedProducts);
    setLocalOnly(STORAGE_KEYS.PRODUCTS, mergedProducts);
    if (mergedProducts.length > cloudProducts.length) {
      // Local had products not yet in Firestore, upload them now!
      syncCollectionToFirestore('products', mergedProducts);
    }

    // 3. Customers
    const custSnap = await getDocs(collection(db, 'customers'));
    const cloudCusts = custSnap.docs.map(d => ({
      ...d.data(),
      branches: d.data().branches || [],
      documents: d.data().documents || []
    })) as Customer[];
    const localCusts = loadCustomers();
    const mergedCusts = mergeItemsById(localCusts, cloudCusts);
    result.customers = mergedCusts;
    lastCustomersJson = JSON.stringify(mergedCusts);
    setLocalOnly(STORAGE_KEYS.CUSTOMERS, mergedCusts);
    if (mergedCusts.length > cloudCusts.length) {
      syncCollectionToFirestore('customers', mergedCusts);
    }

    // 4. Invoices
    const invSnap = await getDocs(collection(db, 'invoices'));
    const cloudInvs = invSnap.docs.map(d => d.data() as Invoice);
    const localInvs = loadInvoices();
    const mergedInvs = mergeItemsById(localInvs, cloudInvs);
    result.invoices = mergedInvs;
    lastInvoicesJson = JSON.stringify(mergedInvs);
    setLocalOnly(STORAGE_KEYS.INVOICES, mergedInvs);
    if (mergedInvs.length > cloudInvs.length) {
      syncCollectionToFirestore('invoices', mergedInvs);
    }

    // 5. Quotations
    const qSnap = await getDocs(collection(db, 'quotations'));
    const cloudQuotes = qSnap.docs.map(d => d.data() as Quotation);
    const localQuotes = loadQuotations();
    const mergedQuotes = mergeItemsById(localQuotes, cloudQuotes);
    result.quotations = mergedQuotes;
    lastQuotationsJson = JSON.stringify(mergedQuotes);
    setLocalOnly(STORAGE_KEYS.QUOTATIONS, mergedQuotes);
    if (mergedQuotes.length > cloudQuotes.length) {
      syncCollectionToFirestore('quotations', mergedQuotes);
    }

    // 6. Delivery Notes
    const dnSnap = await getDocs(collection(db, 'delivery_notes'));
    const cloudDns = dnSnap.docs.map(d => d.data() as DeliveryNote);
    const localDns = loadDeliveryNotes();
    const mergedDns = mergeItemsById(localDns, cloudDns);
    result.deliveryNotes = mergedDns;
    lastDeliveryNotesJson = JSON.stringify(mergedDns);
    setLocalOnly(STORAGE_KEYS.DELIVERY_NOTES, mergedDns);
    if (mergedDns.length > cloudDns.length) {
      syncCollectionToFirestore('delivery_notes', mergedDns);
    }

    // 7. Payments
    const paySnap = await getDocs(collection(db, 'payments'));
    const cloudPays = paySnap.docs.map(d => d.data() as PaymentRecord);
    const localPays = loadPayments();
    const mergedPays = mergeItemsById(localPays, cloudPays);
    result.payments = mergedPays;
    lastPaymentsJson = JSON.stringify(mergedPays);
    setLocalOnly(STORAGE_KEYS.PAYMENTS, mergedPays);
    if (mergedPays.length > cloudPays.length) {
      syncCollectionToFirestore('payments', mergedPays);
    }

    // 8. Leads
    const leadSnap = await getDocs(collection(db, 'leads'));
    const cloudLeads = leadSnap.docs
      .map(d => d.data() as Lead)
      .filter(l => !FAKE_LEAD_IDS.has(l.id));
    const localLeads = loadLeads();
    const mergedLeads = mergeItemsById(localLeads, cloudLeads);
    result.leads = mergedLeads;
    lastLeadsJson = JSON.stringify(mergedLeads);
    setLocalOnly(STORAGE_KEYS.LEADS, mergedLeads);
    if (mergedLeads.length > cloudLeads.length) {
      syncCollectionToFirestore('leads', mergedLeads);
    }

    // 9. Communications
    const commSnap = await getDocs(collection(db, 'communications'));
    const cloudComms = commSnap.docs
      .map(d => d.data() as CommunicationEmail)
      .filter(c => !FAKE_EMAIL_IDS.has(c.id));
    const localComms = loadCommunications();
    const mergedComms = mergeItemsById(localComms, cloudComms);
    result.communications = mergedComms;
    lastCommunicationsJson = JSON.stringify(mergedComms);
    setLocalOnly(STORAGE_KEYS.COMMUNICATIONS, mergedComms);
    if (mergedComms.length > cloudComms.length) {
      syncCollectionToFirestore('communications', mergedComms);
    }

    updateSyncStatus('connected');
  } catch (e) {
    console.error('Error in pullAllFromFirestore:', e);
    updateSyncStatus('offline');
  }
  return result;
}

// Push all local items to cloud immediately
export async function pushAllLocalDataToFirestore(activeData?: {
  company?: CompanySettings;
  products?: Product[];
  customers?: Customer[];
  invoices?: Invoice[];
  quotations?: Quotation[];
  deliveryNotes?: DeliveryNote[];
  payments?: PaymentRecord[];
  leads?: Lead[];
  communications?: CommunicationEmail[];
}): Promise<boolean> {
  updateSyncStatus('syncing');
  try {
    const comp = activeData?.company || loadCompanySettings();
    if (comp) {
      const sanitized = sanitizeForFirestore(comp);
      await setDoc(doc(db, 'company_settings', 'main'), sanitized, { merge: true });
      await setDoc(doc(db, 'company_settings', 'profile'), sanitized, { merge: true });
    }

    const prods = activeData?.products || loadProducts();
    if (prods.length > 0) {
      await syncCollectionToFirestore('products', prods);
    }

    const custs = activeData?.customers || loadCustomers();
    if (custs.length > 0) {
      await syncCollectionToFirestore('customers', custs);
    }

    const invs = activeData?.invoices || loadInvoices();
    if (invs.length > 0) {
      await syncCollectionToFirestore('invoices', invs);
    }

    const quotes = activeData?.quotations || loadQuotations();
    if (quotes.length > 0) {
      await syncCollectionToFirestore('quotations', quotes);
    }

    const dns = activeData?.deliveryNotes || loadDeliveryNotes();
    if (dns.length > 0) {
      await syncCollectionToFirestore('delivery_notes', dns);
    }

    const pays = activeData?.payments || loadPayments();
    if (pays.length > 0) {
      await syncCollectionToFirestore('payments', pays);
    }

    const leads = (activeData?.leads || loadLeads()).filter(l => !FAKE_LEAD_IDS.has(l.id));
    if (leads.length > 0) {
      await syncCollectionToFirestore('leads', leads);
    }

    const comms = (activeData?.communications || loadCommunications()).filter(c => !FAKE_EMAIL_IDS.has(c.id));
    if (comms.length > 0) {
      await syncCollectionToFirestore('communications', comms);
    }

    updateSyncStatus('connected');
    return true;
  } catch (e) {
    console.error('Failed to push local data to Firestore:', e);
    updateSyncStatus('offline');
    return false;
  }
}

// --- Realtime Firestore Subscriber Hook ---
export function subscribeToFirestore(callbacks: {
  onCompanyUpdate?: (data: CompanySettings) => void;
  onProductsUpdate?: (data: Product[]) => void;
  onCustomersUpdate?: (data: Customer[]) => void;
  onInvoicesUpdate?: (data: Invoice[]) => void;
  onQuotationsUpdate?: (data: Quotation[]) => void;
  onDeliveryNotesUpdate?: (data: DeliveryNote[]) => void;
  onPaymentsUpdate?: (data: PaymentRecord[]) => void;
  onLeadsUpdate?: (data: Lead[]) => void;
  onCommunicationsUpdate?: (data: CommunicationEmail[]) => void;
}) {
  const unsubs: Array<() => void> = [];

  // 1. Company Settings
  unsubs.push(
    onSnapshot(doc(db, 'company_settings', 'main'), snap => {
      if (snap.exists()) {
        const settings = snap.data() as CompanySettings;
        lastCompanyJson = JSON.stringify(settings);
        setLocalOnly(STORAGE_KEYS.COMPANY, settings);
        callbacks.onCompanyUpdate?.(settings);
      } else {
        // Fallback: check profile document
        getDoc(doc(db, 'company_settings', 'profile')).then(profSnap => {
          if (profSnap.exists()) {
            const profSettings = profSnap.data() as CompanySettings;
            lastCompanyJson = JSON.stringify(profSettings);
            setLocalOnly(STORAGE_KEYS.COMPANY, profSettings);
            callbacks.onCompanyUpdate?.(profSettings);
            // Copy to main
            setDoc(doc(db, 'company_settings', 'main'), sanitizeForFirestore(profSettings), { merge: true }).catch(() => {});
          } else {
            const local = loadCompanySettings();
            setDoc(doc(db, 'company_settings', 'main'), sanitizeForFirestore(local), { merge: true }).catch(() => {});
          }
        }).catch(() => {});
      }
    }, err => console.warn('Company settings listener notice:', err))
  );

  // 2. Products (Bidirectional Smart Merge)
  unsubs.push(
    onSnapshot(collection(db, 'products'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs.map(d => d.data() as Product);
        const localList = loadProducts();
        const merged = mergeItemsById(localList, cloudList);
        lastProductsJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.PRODUCTS, merged);
        callbacks.onProductsUpdate?.(merged);
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('products', merged);
        }
      } else {
        const local = loadProducts();
        if (local.length > 0) {
          syncCollectionToFirestore('products', local);
        }
      }
    }, err => console.warn('Products listener notice:', err))
  );

  // 3. Customers
  unsubs.push(
    onSnapshot(collection(db, 'customers'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs.map(d => {
          const c = d.data() as Customer;
          return {
            ...c,
            branches: c.branches || [],
            documents: c.documents || []
          };
        });
        const localList = loadCustomers();
        const merged = mergeItemsById(localList, cloudList);
        lastCustomersJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.CUSTOMERS, merged);
        callbacks.onCustomersUpdate?.(merged);
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('customers', merged);
        }
      } else {
        const local = loadCustomers();
        if (local.length > 0) {
          syncCollectionToFirestore('customers', local);
        }
      }
    }, err => console.warn('Customers listener notice:', err))
  );

  // 4. Invoices
  unsubs.push(
    onSnapshot(collection(db, 'invoices'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs.map(d => d.data() as Invoice);
        const localList = loadInvoices();
        const merged = mergeItemsById(localList, cloudList);
        lastInvoicesJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.INVOICES, merged);
        callbacks.onInvoicesUpdate?.(merged);
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('invoices', merged);
        }
      } else {
        const local = loadInvoices();
        if (local.length > 0) {
          syncCollectionToFirestore('invoices', local);
        }
      }
    }, err => console.warn('Invoices listener notice:', err))
  );

  // 5. Quotations
  unsubs.push(
    onSnapshot(collection(db, 'quotations'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs.map(d => d.data() as Quotation);
        const localList = loadQuotations();
        const merged = mergeItemsById(localList, cloudList);
        lastQuotationsJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.QUOTATIONS, merged);
        callbacks.onQuotationsUpdate?.(merged);
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('quotations', merged);
        }
      } else {
        const local = loadQuotations();
        if (local.length > 0) {
          syncCollectionToFirestore('quotations', local);
        }
      }
    }, err => console.warn('Quotations listener notice:', err))
  );

  // 6. Delivery Notes
  unsubs.push(
    onSnapshot(collection(db, 'delivery_notes'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs.map(d => d.data() as DeliveryNote);
        const localList = loadDeliveryNotes();
        const merged = mergeItemsById(localList, cloudList);
        lastDeliveryNotesJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.DELIVERY_NOTES, merged);
        callbacks.onDeliveryNotesUpdate?.(merged);
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('delivery_notes', merged);
        }
      } else {
        const local = loadDeliveryNotes();
        if (local.length > 0) {
          syncCollectionToFirestore('delivery_notes', local);
        }
      }
    }, err => console.warn('Delivery notes listener notice:', err))
  );

  // 7. Payments
  unsubs.push(
    onSnapshot(collection(db, 'payments'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs.map(d => d.data() as PaymentRecord);
        const localList = loadPayments();
        const merged = mergeItemsById(localList, cloudList);
        lastPaymentsJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.PAYMENTS, merged);
        callbacks.onPaymentsUpdate?.(merged);
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('payments', merged);
        }
      } else {
        const local = loadPayments();
        if (local.length > 0) {
          syncCollectionToFirestore('payments', local);
        }
      }
    }, err => console.warn('Payments listener notice:', err))
  );

  // 8. Leads
  unsubs.push(
    onSnapshot(collection(db, 'leads'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs
          .map(d => d.data() as Lead)
          .filter(l => !FAKE_LEAD_IDS.has(l.id));
        const localList = loadLeads();
        const merged = mergeItemsById(localList, cloudList);
        lastLeadsJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.LEADS, merged);
        callbacks.onLeadsUpdate?.(merged);
        snap.docs.forEach(d => {
          if (FAKE_LEAD_IDS.has(d.id)) {
            deleteDocumentFromFirestore('leads', d.id);
          }
        });
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('leads', merged);
        }
      } else {
        const local = loadLeads();
        if (local.length > 0) {
          syncCollectionToFirestore('leads', local);
        }
      }
    }, err => console.warn('Leads listener notice:', err))
  );

  // 9. Communications
  unsubs.push(
    onSnapshot(collection(db, 'communications'), snap => {
      if (!snap.empty) {
        const cloudList = snap.docs
          .map(d => d.data() as CommunicationEmail)
          .filter(c => !FAKE_EMAIL_IDS.has(c.id));
        const localList = loadCommunications();
        const merged = mergeItemsById(localList, cloudList);
        lastCommunicationsJson = JSON.stringify(merged);
        setLocalOnly(STORAGE_KEYS.COMMUNICATIONS, merged);
        callbacks.onCommunicationsUpdate?.(merged);
        snap.docs.forEach(d => {
          if (FAKE_EMAIL_IDS.has(d.id)) {
            deleteDocumentFromFirestore('communications', d.id);
          }
        });
        if (merged.length > cloudList.length) {
          syncCollectionToFirestore('communications', merged);
        }
      } else {
        const local = loadCommunications();
        if (local.length > 0) {
          syncCollectionToFirestore('communications', local);
        }
      }
    }, err => console.warn('Communications listener notice:', err))
  );

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}

export function resetAllDataToDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.COMPANY);
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
  localStorage.removeItem(STORAGE_KEYS.INVOICES);
  localStorage.removeItem(STORAGE_KEYS.QUOTATIONS);
  localStorage.removeItem(STORAGE_KEYS.DELIVERY_NOTES);
  localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
  localStorage.removeItem(STORAGE_KEYS.LEADS);
  localStorage.removeItem(STORAGE_KEYS.COMMUNICATIONS);
}

export function exportDatabaseJSON(): void {
  const data = {
    company: loadCompanySettings(),
    products: loadProducts(),
    customers: loadCustomers(),
    invoices: loadInvoices(),
    quotations: loadQuotations(),
    deliveryNotes: loadDeliveryNotes(),
    payments: loadPayments(),
    leads: loadLeads(),
    communications: loadCommunications(),
    exportedAt: new Date().toISOString()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `InvoicePro_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDatabaseJSON(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.company) saveCompanySettings(data.company);
    if (data.products) saveProducts(data.products);
    if (data.customers) saveCustomers(data.customers);
    if (data.invoices) saveInvoices(data.invoices);
    if (data.quotations) saveQuotations(data.quotations);
    if (data.deliveryNotes) saveDeliveryNotes(data.deliveryNotes);
    if (data.payments) savePayments(data.payments);
    if (data.leads) saveLeads(data.leads);
    if (data.communications) saveCommunications(data.communications);
    return true;
  } catch (e) {
    console.error('Failed to import database JSON', e);
    return false;
  }
}
