import { CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord, Lead, CommunicationEmail } from '../types';
import { initialCompanySettings, initialProducts, initialCustomers, initialInvoices, initialQuotations, initialDeliveryNotes, initialPayments, initialLeads, initialCommunications } from '../data/seedData';
import { doc, collection, setDoc, deleteDoc, getDocs, onSnapshot, getDocFromServer, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

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
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;

  const sanitizedJson = JSON.stringify(data, (key, value) => {
    if (value === undefined) return null;
    if (key === 'fileDataUrl' && typeof value === 'string' && value.length > 500000) {
      // Truncate giant base64 strings so document stays safely under the 1MB Firestore limit
      return value.slice(0, 100) + '...[file_stored_locally]';
    }
    return value;
  });

  return JSON.parse(sanitizedJson);
}

// In-memory equality tracking to prevent redundant writes and listener loops
let lastCompanyJson = '';
let lastProductsJson = '';
let lastCustomersJson = '';
let lastInvoicesJson = '';
let lastQuotationsJson = '';
let lastDeliveryNotesJson = '';
let lastPaymentsJson = '';
let lastLeadsJson = '';
let lastCommunicationsJson = '';

// Known demo IDs to guarantee clean CRM data
export const FAKE_LEAD_IDS = new Set(['lead-1', 'lead-2', 'lead-3']);
export const FAKE_EMAIL_IDS = new Set(['email-1', 'email-2', 'email-3']);

// Local storage helpers (used as offline secondary cache)
function setLocalOnly(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage write error:', e);
  }
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase Firestore connected successfully!");
    return true;
  } catch (e) {
    console.warn("Firestore connection check notice:", e);
    return false;
  }
}

// Check if an authenticated user already has records stored in Firestore
export async function hasUserCloudData(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const migrationDocRef = doc(db, 'users', userId, 'system', 'migration');
    const migrationSnap = await getDoc(migrationDocRef);
    if (migrationSnap.exists()) return true;

    // Check if invoices or products exist for this user
    const invoicesPath = `users/${userId}/invoices`;
    const invoicesSnap = await getDocs(collection(db, 'users', userId, 'invoices'));
    if (!invoicesSnap.empty) return true;

    const productsSnap = await getDocs(collection(db, 'users', userId, 'products'));
    if (!productsSnap.empty) return true;

    return false;
  } catch (e) {
    console.warn('Check cloud data error:', e);
    return false;
  }
}

// Upload initial local data into user's Firestore cloud account (Preserves existing data)
export async function migrateLocalDataToUserFirestore(
  userId: string,
  localData: {
    companySettings?: CompanySettings;
    products?: Product[];
    customers?: Customer[];
    invoices?: Invoice[];
    quotations?: Quotation[];
    deliveryNotes?: DeliveryNote[];
    payments?: PaymentRecord[];
    leads?: Lead[];
    communications?: CommunicationEmail[];
  }
) {
  if (!userId) return;
  console.log(`Migrating local data to cloud under authenticated user [${userId}]...`);

  try {
    // 1. Company Settings
    const settings = localData.companySettings || loadCompanySettings();
    const settingsPath = `users/${userId}/company_settings/main`;
    await setDoc(doc(db, 'users', userId, 'company_settings', 'main'), sanitizeForFirestore(settings), { merge: true })
      .catch(err => handleFirestoreError(err, OperationType.WRITE, settingsPath));

    // 2. Products
    const products = localData.products || loadProducts();
    for (const prod of products) {
      if (!prod?.id) continue;
      const path = `users/${userId}/products/${prod.id}`;
      await setDoc(doc(db, 'users', userId, 'products', prod.id), sanitizeForFirestore(prod), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // 3. Customers
    const customers = localData.customers || loadCustomers();
    for (const cust of customers) {
      if (!cust?.id) continue;
      const path = `users/${userId}/customers/${cust.id}`;
      await setDoc(doc(db, 'users', userId, 'customers', cust.id), sanitizeForFirestore(cust), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // 4. Invoices
    const invoices = localData.invoices || loadInvoices();
    for (const inv of invoices) {
      if (!inv?.id) continue;
      const path = `users/${userId}/invoices/${inv.id}`;
      await setDoc(doc(db, 'users', userId, 'invoices', inv.id), sanitizeForFirestore(inv), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // 5. Quotations
    const quotations = localData.quotations || loadQuotations();
    for (const quote of quotations) {
      if (!quote?.id) continue;
      const path = `users/${userId}/quotations/${quote.id}`;
      await setDoc(doc(db, 'users', userId, 'quotations', quote.id), sanitizeForFirestore(quote), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // 6. Delivery Notes
    const deliveryNotes = localData.deliveryNotes || loadDeliveryNotes();
    for (const dn of deliveryNotes) {
      if (!dn?.id) continue;
      const path = `users/${userId}/delivery_notes/${dn.id}`;
      await setDoc(doc(db, 'users', userId, 'delivery_notes', dn.id), sanitizeForFirestore(dn), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // 7. Payments
    const payments = localData.payments || loadPayments();
    for (const pay of payments) {
      if (!pay?.id) continue;
      const path = `users/${userId}/payments/${pay.id}`;
      await setDoc(doc(db, 'users', userId, 'payments', pay.id), sanitizeForFirestore(pay), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // 8. Leads
    const leads = (localData.leads || loadLeads()).filter(l => !FAKE_LEAD_IDS.has(l.id));
    for (const lead of leads) {
      if (!lead?.id) continue;
      const path = `users/${userId}/leads/${lead.id}`;
      await setDoc(doc(db, 'users', userId, 'leads', lead.id), sanitizeForFirestore(lead), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // 9. Communications
    const comms = (localData.communications || loadCommunications()).filter(c => !FAKE_EMAIL_IDS.has(c.id));
    for (const comm of comms) {
      if (!comm?.id) continue;
      const path = `users/${userId}/communications/${comm.id}`;
      await setDoc(doc(db, 'users', userId, 'communications', comm.id), sanitizeForFirestore(comm), { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }

    // Mark migration completed in cloud
    const markPath = `users/${userId}/system/migration`;
    await setDoc(doc(db, 'users', userId, 'system', 'migration'), {
      migratedAt: new Date().toISOString(),
      source: 'local_storage_conversion',
      recordsCount: {
        products: products.length,
        customers: customers.length,
        invoices: invoices.length,
        quotations: quotations.length,
        deliveryNotes: deliveryNotes.length,
        payments: payments.length
      }
    });

    console.log("Local data migration to Firestore successfully finished!");
  } catch (e) {
    console.error("Migration error:", e);
  }
}

// User-scoped deletion helper
export async function deleteDocumentFromUserFirestore(userId: string, colName: string, id: string) {
  if (!userId || !colName || !id) return;
  const path = `users/${userId}/${colName}/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, colName, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

// User-scoped batch/collection sync helper
export async function syncUserCollectionToFirestore(userId: string, colName: string, items: Array<{ id: string } & Record<string, any>>) {
  if (!userId || !items || !items.length) return;
  try {
    const savePromises = items.map(async item => {
      if (!item || !item.id) return;
      const path = `users/${userId}/${colName}/${item.id}`;
      try {
        await setDoc(doc(db, 'users', userId, colName, item.id), sanitizeForFirestore(item), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    });
    await Promise.all(savePromises);
  } catch (e) {
    console.error(`Firestore sync failed for collection [users/${userId}/${colName}]:`, e);
  }
}

// --- Specific Cloud Writers ---

export async function saveCompanySettingsToFirestore(userId: string, settings: CompanySettings) {
  setLocalOnly(STORAGE_KEYS.COMPANY, settings);
  if (!userId) return;
  const path = `users/${userId}/company_settings/main`;
  try {
    await setDoc(doc(db, 'users', userId, 'company_settings', 'main'), sanitizeForFirestore(settings), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function saveProductToFirestore(userId: string, prod: Product) {
  if (!userId || !prod?.id) return;
  const path = `users/${userId}/products/${prod.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'products', prod.id), sanitizeForFirestore(prod), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function saveCustomerToFirestore(userId: string, cust: Customer) {
  if (!userId || !cust?.id) return;
  const sanitized = {
    ...cust,
    branches: cust.branches || [],
    documents: cust.documents || []
  };
  const path = `users/${userId}/customers/${cust.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'customers', cust.id), sanitizeForFirestore(sanitized), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function saveInvoiceToFirestore(userId: string, inv: Invoice) {
  if (!userId || !inv?.id) return;
  const path = `users/${userId}/invoices/${inv.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'invoices', inv.id), sanitizeForFirestore(inv), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function saveQuotationToFirestore(userId: string, q: Quotation) {
  if (!userId || !q?.id) return;
  const path = `users/${userId}/quotations/${q.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'quotations', q.id), sanitizeForFirestore(q), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function saveDeliveryNoteToFirestore(userId: string, dn: DeliveryNote) {
  if (!userId || !dn?.id) return;
  const path = `users/${userId}/delivery_notes/${dn.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'delivery_notes', dn.id), sanitizeForFirestore(dn), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function savePaymentToFirestore(userId: string, pay: PaymentRecord) {
  if (!userId || !pay?.id) return;
  const path = `users/${userId}/payments/${pay.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'payments', pay.id), sanitizeForFirestore(pay), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function saveLeadToFirestore(userId: string, lead: Lead) {
  if (!userId || !lead?.id || FAKE_LEAD_IDS.has(lead.id)) return;
  const path = `users/${userId}/leads/${lead.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'leads', lead.id), sanitizeForFirestore(lead), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function saveCommunicationToFirestore(userId: string, comm: CommunicationEmail) {
  if (!userId || !comm?.id || FAKE_EMAIL_IDS.has(comm.id)) return;
  const path = `users/${userId}/communications/${comm.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'communications', comm.id), sanitizeForFirestore(comm), { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

// --- Realtime Firestore Subscriber for Authenticated User ---
export function subscribeToUserFirestore(
  userId: string,
  callbacks: {
    onCompanyUpdate?: (data: CompanySettings) => void;
    onProductsUpdate?: (data: Product[]) => void;
    onCustomersUpdate?: (data: Customer[]) => void;
    onInvoicesUpdate?: (data: Invoice[]) => void;
    onQuotationsUpdate?: (data: Quotation[]) => void;
    onDeliveryNotesUpdate?: (data: DeliveryNote[]) => void;
    onPaymentsUpdate?: (data: PaymentRecord[]) => void;
    onLeadsUpdate?: (data: Lead[]) => void;
    onCommunicationsUpdate?: (data: CommunicationEmail[]) => void;
  }
): () => void {
  if (!userId) return () => {};

  const unsubs: Array<() => void> = [];

  // 1. Company Settings
  const companyPath = `users/${userId}/company_settings/main`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', userId, 'company_settings', 'main'),
      snap => {
        if (snap.exists()) {
          const settings = snap.data() as CompanySettings;
          lastCompanyJson = JSON.stringify(settings);
          setLocalOnly(STORAGE_KEYS.COMPANY, settings);
          callbacks.onCompanyUpdate?.(settings);
        }
      },
      err => handleFirestoreError(err, OperationType.GET, companyPath)
    )
  );

  // 2. Products
  const productsPath = `users/${userId}/products`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'products'),
      snap => {
        const list = snap.docs.map(d => d.data() as Product);
        lastProductsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.PRODUCTS, list);
        callbacks.onProductsUpdate?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, productsPath)
    )
  );

  // 3. Customers
  const customersPath = `users/${userId}/customers`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'customers'),
      snap => {
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
      },
      err => handleFirestoreError(err, OperationType.LIST, customersPath)
    )
  );

  // 4. Invoices
  const invoicesPath = `users/${userId}/invoices`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'invoices'),
      snap => {
        const list = snap.docs.map(d => d.data() as Invoice);
        lastInvoicesJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.INVOICES, list);
        callbacks.onInvoicesUpdate?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, invoicesPath)
    )
  );

  // 5. Quotations
  const quotationsPath = `users/${userId}/quotations`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'quotations'),
      snap => {
        const list = snap.docs.map(d => d.data() as Quotation);
        lastQuotationsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.QUOTATIONS, list);
        callbacks.onQuotationsUpdate?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, quotationsPath)
    )
  );

  // 6. Delivery Notes
  const dnPath = `users/${userId}/delivery_notes`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'delivery_notes'),
      snap => {
        const list = snap.docs.map(d => d.data() as DeliveryNote);
        lastDeliveryNotesJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.DELIVERY_NOTES, list);
        callbacks.onDeliveryNotesUpdate?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, dnPath)
    )
  );

  // 7. Payments
  const paymentsPath = `users/${userId}/payments`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'payments'),
      snap => {
        const list = snap.docs.map(d => d.data() as PaymentRecord);
        lastPaymentsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.PAYMENTS, list);
        callbacks.onPaymentsUpdate?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, paymentsPath)
    )
  );

  // 8. Leads
  const leadsPath = `users/${userId}/leads`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'leads'),
      snap => {
        const list = snap.docs
          .map(d => d.data() as Lead)
          .filter(l => !FAKE_LEAD_IDS.has(l.id));
        lastLeadsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.LEADS, list);
        callbacks.onLeadsUpdate?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, leadsPath)
    )
  );

  // 9. Communications
  const commsPath = `users/${userId}/communications`;
  unsubs.push(
    onSnapshot(
      collection(db, 'users', userId, 'communications'),
      snap => {
        const list = snap.docs
          .map(d => d.data() as CommunicationEmail)
          .filter(c => !FAKE_EMAIL_IDS.has(c.id));
        lastCommunicationsJson = JSON.stringify(list);
        setLocalOnly(STORAGE_KEYS.COMMUNICATIONS, list);
        callbacks.onCommunicationsUpdate?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, commsPath)
    )
  );

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}

// --- Local Initial Loaders (used during initialization before user cloud loads) ---

export function loadCompanySettings(): CompanySettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
    return data ? JSON.parse(data) : initialCompanySettings;
  } catch (e) {
    return initialCompanySettings;
  }
}

export function saveCompanySettings(settings: CompanySettings, userId?: string): void {
  const json = JSON.stringify(settings);
  setLocalOnly(STORAGE_KEYS.COMPANY, settings);
  if (json === lastCompanyJson) return;
  lastCompanyJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    saveCompanySettingsToFirestore(currentUid, settings);
  }
}

export function loadProducts(): Product[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? (JSON.parse(data) as Product[]) : initialProducts;
  } catch (e) {
    return initialProducts;
  }
}

export function saveProducts(products: Product[], userId?: string): void {
  const json = JSON.stringify(products);
  setLocalOnly(STORAGE_KEYS.PRODUCTS, products);
  if (json === lastProductsJson) return;
  lastProductsJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'products', products);
  }
}

export function loadCustomers(): Customer[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? (JSON.parse(data) as Customer[]) : initialCustomers;
  } catch (e) {
    return initialCustomers;
  }
}

export function saveCustomers(customers: Customer[], userId?: string): void {
  const sanitizedCustomers = customers.map(c => ({
    ...c,
    branches: c.branches || [],
    documents: c.documents || []
  }));

  const json = JSON.stringify(sanitizedCustomers);
  setLocalOnly(STORAGE_KEYS.CUSTOMERS, sanitizedCustomers);
  if (json === lastCustomersJson) return;
  lastCustomersJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'customers', sanitizedCustomers);
  }
}

export function loadInvoices(): Invoice[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? (JSON.parse(data) as Invoice[]) : initialInvoices;
  } catch (e) {
    return initialInvoices;
  }
}

export function saveInvoices(invoices: Invoice[], userId?: string): void {
  const json = JSON.stringify(invoices);
  setLocalOnly(STORAGE_KEYS.INVOICES, invoices);
  if (json === lastInvoicesJson) return;
  lastInvoicesJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'invoices', invoices);
  }
}

export function loadQuotations(): Quotation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
    return data ? (JSON.parse(data) as Quotation[]) : initialQuotations;
  } catch (e) {
    return initialQuotations;
  }
}

export function saveQuotations(quotations: Quotation[], userId?: string): void {
  const json = JSON.stringify(quotations);
  setLocalOnly(STORAGE_KEYS.QUOTATIONS, quotations);
  if (json === lastQuotationsJson) return;
  lastQuotationsJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'quotations', quotations);
  }
}

export function loadDeliveryNotes(): DeliveryNote[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DELIVERY_NOTES);
    return data ? (JSON.parse(data) as DeliveryNote[]) : initialDeliveryNotes;
  } catch (e) {
    return initialDeliveryNotes;
  }
}

export function saveDeliveryNotes(deliveryNotes: DeliveryNote[], userId?: string): void {
  const json = JSON.stringify(deliveryNotes);
  setLocalOnly(STORAGE_KEYS.DELIVERY_NOTES, deliveryNotes);
  if (json === lastDeliveryNotesJson) return;
  lastDeliveryNotesJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'delivery_notes', deliveryNotes);
  }
}

export function loadPayments(): PaymentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return data ? (JSON.parse(data) as PaymentRecord[]) : initialPayments;
  } catch (e) {
    return initialPayments;
  }
}

export function savePayments(payments: PaymentRecord[], userId?: string): void {
  const json = JSON.stringify(payments);
  setLocalOnly(STORAGE_KEYS.PAYMENTS, payments);
  if (json === lastPaymentsJson) return;
  lastPaymentsJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'payments', payments);
  }
}

export function loadLeads(): Lead[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LEADS);
    const parsed = data ? (JSON.parse(data) as Lead[]) : initialLeads;
    return parsed.filter(l => !FAKE_LEAD_IDS.has(l.id));
  } catch (e) {
    return [];
  }
}

export function saveLeads(leads: Lead[], userId?: string): void {
  const cleaned = leads.filter(l => !FAKE_LEAD_IDS.has(l.id));
  const json = JSON.stringify(cleaned);
  setLocalOnly(STORAGE_KEYS.LEADS, cleaned);
  if (json === lastLeadsJson) return;
  lastLeadsJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'leads', cleaned);
  }
}

export function loadCommunications(): CommunicationEmail[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COMMUNICATIONS);
    const parsed = data ? (JSON.parse(data) as CommunicationEmail[]) : initialCommunications;
    return parsed.filter(c => !FAKE_EMAIL_IDS.has(c.id));
  } catch (e) {
    return [];
  }
}

export function saveCommunications(comms: CommunicationEmail[], userId?: string): void {
  const cleaned = comms.filter(c => !FAKE_EMAIL_IDS.has(c.id));
  const json = JSON.stringify(cleaned);
  setLocalOnly(STORAGE_KEYS.COMMUNICATIONS, cleaned);
  if (json === lastCommunicationsJson) return;
  lastCommunicationsJson = json;

  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    syncUserCollectionToFirestore(currentUid, 'communications', cleaned);
  }
}

// Backup & Export utilities
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
  a.download = `RotiBros_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDatabaseJSON(jsonStr: string, userId?: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    const uid = userId || auth.currentUser?.uid;
    if (data.company) saveCompanySettings(data.company, uid);
    if (data.products) saveProducts(data.products, uid);
    if (data.customers) saveCustomers(data.customers, uid);
    if (data.invoices) saveInvoices(data.invoices, uid);
    if (data.quotations) saveQuotations(data.quotations, uid);
    if (data.deliveryNotes) saveDeliveryNotes(data.deliveryNotes, uid);
    if (data.payments) savePayments(data.payments, uid);
    if (data.leads) saveLeads(data.leads, uid);
    if (data.communications) saveCommunications(data.communications, uid);
    return true;
  } catch (e) {
    console.error('Failed to import database JSON', e);
    return false;
  }
}
