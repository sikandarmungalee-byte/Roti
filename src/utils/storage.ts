import { CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord } from '../types';
import { initialCompanySettings, initialProducts, initialCustomers, initialInvoices, initialQuotations, initialDeliveryNotes, initialPayments } from '../data/seedData';
import { doc, collection, setDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEYS = {
  COMPANY: 'invoicepro_company',
  PRODUCTS: 'invoicepro_products',
  CUSTOMERS: 'invoicepro_customers',
  INVOICES: 'invoicepro_invoices',
  QUOTATIONS: 'invoicepro_quotations',
  DELIVERY_NOTES: 'invoicepro_delivery_notes',
  PAYMENTS: 'invoicepro_payments',
};

// Sanitization helper to prevent Firestore "undefined value" errors
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (value === undefined) return null;
    return value;
  }));
}

// In-memory equality tracking to prevent infinite loops
let lastCompanyJson = '';
let lastProductsJson = '';
let lastCustomersJson = '';
let lastInvoicesJson = '';
let lastQuotationsJson = '';
let lastDeliveryNotesJson = '';
let lastPaymentsJson = '';

export async function testFirestoreConnection() {
  try {
    const testDoc = doc(db, 'system', 'connection_test');
    await setDoc(testDoc, { connectedAt: new Date().toISOString() }, { merge: true });
    console.log("Firebase Firestore connected successfully!");
  } catch (e) {
    console.warn("Firestore connection check notice:", e);
  }
}

// Helper local sync without Firestore trigger loop
function setLocalOnly(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage write error:', e);
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

  syncCollectionToFirestore('products', products)
    .catch(err => console.error('Error syncing products to Firestore:', err));
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
  const json = JSON.stringify(customers);
  setLocalOnly(STORAGE_KEYS.CUSTOMERS, customers);
  if (json === lastCustomersJson) return;
  lastCustomersJson = json;

  syncCollectionToFirestore('customers', customers)
    .catch(err => console.error('Error syncing customers to Firestore:', err));
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

  syncCollectionToFirestore('invoices', invoices)
    .catch(err => console.error('Error syncing invoices to Firestore:', err));
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

  syncCollectionToFirestore('quotations', quotations)
    .catch(err => console.error('Error syncing quotations to Firestore:', err));
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

  syncCollectionToFirestore('delivery_notes', deliveryNotes)
    .catch(err => console.error('Error syncing delivery notes to Firestore:', err));
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

  syncCollectionToFirestore('payments', payments)
    .catch(err => console.error('Error syncing payments to Firestore:', err));
}

// Batch Sync helper to update Firestore collection documents efficiently
async function syncCollectionToFirestore(colName: string, items: Array<{ id: string } & Record<string, any>>) {
  try {
    const snap = await getDocs(collection(db, colName));
    const existingIds = new Set(snap.docs.map(d => d.id));
    const currentIds = new Set(items.map(item => item.id));

    const batch = writeBatch(db);
    items.forEach(item => {
      if (item.id) {
        batch.set(doc(db, colName, item.id), sanitizeForFirestore(item), { merge: true });
      }
    });

    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        batch.delete(doc(db, colName, id));
      }
    });

    await batch.commit();
  } catch (e) {
    console.error(`Firestore collection batch sync failed for [${colName}]:`, e);
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
        // Seed if empty
        const initial = loadCompanySettings();
        saveCompanySettings(initial);
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
        const list = snap.docs.map(d => d.data() as Customer);
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
    return true;
  } catch (e) {
    console.error('Failed to import database JSON', e);
    return false;
  }
}
