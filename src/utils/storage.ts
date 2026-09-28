import { CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord, Lead, CommunicationEmail } from '../types';
import { initialCompanySettings, initialProducts, initialCustomers, initialInvoices, initialQuotations, initialDeliveryNotes, initialPayments, initialLeads, initialCommunications } from '../data/seedData';
import { doc, collection, setDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEYS = {
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
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  
  // Custom replacer to clean undefined and trim overly long base64 file data URLs to stay under 1MB
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

// In-memory equality tracking to prevent infinite loops
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

export async function testFirestoreConnection() {
  try {
    const testDoc = doc(db, 'system', 'connection_test');
    await setDoc(testDoc, { connectedAt: new Date().toISOString() }, { merge: true });
    console.log("Firebase Firestore connected successfully!");
  } catch (e) {
    console.warn("Firestore connection check notice:", e);
  }
}

// Helper local sync
function setLocalOnly(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage write error:', e);
  }
}

// Direct multi-doc sync helper: writes/upserts items immediately via setDoc without deleting other docs
async function syncCollectionToFirestore(colName: string, items: Array<{ id: string } & Record<string, any>>) {
  if (!items || !items.length) return;
  try {
    const savePromises = items.map(item => {
      if (!item || !item.id) return Promise.resolve();
      const docRef = doc(db, colName, item.id);
      return setDoc(docRef, sanitizeForFirestore(item), { merge: true });
    });
    await Promise.all(savePromises);
  } catch (e) {
    console.error(`Firestore sync failed for collection [${colName}]:`, e);
  }
}

export async function deleteDocumentFromFirestore(colName: string, id: string) {
  if (!colName || !id) return;
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (e) {
    console.error(`Error deleting doc [${id}] from collection [${colName}]:`, e);
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

  setDoc(doc(db, 'company_settings', 'main'), sanitizeForFirestore(settings), { merge: true })
    .catch(err => console.error('Error saving company settings to Firestore:', err));
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
  // Ensure branches and documents default to arrays
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
        saveCompanySettings(loadCompanySettings());
      }
    }, err => console.warn('Company settings listener fallback:', err))
  );

  // 2. Products
  unsubs.push(
    onSnapshot(collection(db, 'products'), snap => {
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data() as Product);
        lastProductsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.PRODUCTS, list);
        callbacks.onProductsUpdate?.(list);
      } else {
        saveProducts(loadProducts());
      }
    }, err => console.warn('Products listener fallback:', err))
  );

  // 3. Customers
  unsubs.push(
    onSnapshot(collection(db, 'customers'), snap => {
      if (!snap.empty) {
        const list = snap.docs.map(d => {
          const c = d.data() as Customer;
          return {
            ...c,
            branches: c.branches || [],
            documents: c.documents || []
          };
        });
        lastCustomersJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.CUSTOMERS, list);
        callbacks.onCustomersUpdate?.(list);
      } else {
        saveCustomers(loadCustomers());
      }
    }, err => console.warn('Customers listener fallback:', err))
  );

  // 4. Invoices
  unsubs.push(
    onSnapshot(collection(db, 'invoices'), snap => {
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data() as Invoice);
        lastInvoicesJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.INVOICES, list);
        callbacks.onInvoicesUpdate?.(list);
      } else {
        saveInvoices(loadInvoices());
      }
    }, err => console.warn('Invoices listener fallback:', err))
  );

  // 5. Quotations
  unsubs.push(
    onSnapshot(collection(db, 'quotations'), snap => {
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data() as Quotation);
        lastQuotationsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.QUOTATIONS, list);
        callbacks.onQuotationsUpdate?.(list);
      } else {
        saveQuotations(loadQuotations());
      }
    }, err => console.warn('Quotations listener fallback:', err))
  );

  // 6. Delivery Notes
  unsubs.push(
    onSnapshot(collection(db, 'delivery_notes'), snap => {
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data() as DeliveryNote);
        lastDeliveryNotesJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.DELIVERY_NOTES, list);
        callbacks.onDeliveryNotesUpdate?.(list);
      } else {
        saveDeliveryNotes(loadDeliveryNotes());
      }
    }, err => console.warn('Delivery notes listener fallback:', err))
  );

  // 7. Payments
  unsubs.push(
    onSnapshot(collection(db, 'payments'), snap => {
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data() as PaymentRecord);
        lastPaymentsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.PAYMENTS, list);
        callbacks.onPaymentsUpdate?.(list);
      } else {
        savePayments(loadPayments());
      }
    }, err => console.warn('Payments listener fallback:', err))
  );

  // 8. Leads
  unsubs.push(
    onSnapshot(collection(db, 'leads'), snap => {
      if (!snap.empty) {
        const list = snap.docs
          .map(d => d.data() as Lead)
          .filter(l => !FAKE_LEAD_IDS.has(l.id));
        lastLeadsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.LEADS, list);
        callbacks.onLeadsUpdate?.(list);
        snap.docs.forEach(d => {
          if (FAKE_LEAD_IDS.has(d.id)) {
            deleteDocumentFromFirestore('leads', d.id);
          }
        });
      } else {
        saveLeads(loadLeads());
      }
    }, err => console.warn('Leads listener fallback:', err))
  );

  // 9. Communications
  unsubs.push(
    onSnapshot(collection(db, 'communications'), snap => {
      if (!snap.empty) {
        const list = snap.docs
          .map(d => d.data() as CommunicationEmail)
          .filter(c => !FAKE_EMAIL_IDS.has(c.id));
        lastCommunicationsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.COMMUNICATIONS, list);
        callbacks.onCommunicationsUpdate?.(list);
        snap.docs.forEach(d => {
          if (FAKE_EMAIL_IDS.has(d.id)) {
            deleteDocumentFromFirestore('communications', d.id);
          }
        });
      } else {
        saveCommunications(loadCommunications());
      }
    }, err => console.warn('Communications listener fallback:', err))
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
