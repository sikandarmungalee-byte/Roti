import { CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord } from '../types';
import { initialCompanySettings, initialProducts, initialCustomers, initialInvoices, initialQuotations, initialDeliveryNotes, initialPayments } from '../data/seedData';

const LEGACY_MOCK_IDS = new Set([
  'prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5',
  'cust-1', 'cust-2',
  'inv-1', 'inv-2', 'inv-3',
  'qt-1',
  'dn-1', 'dn-2', 'dn-3',
  'pay-1', 'pay-2'
]);

const STORAGE_KEYS = {
  COMPANY: 'invoicepro_company',
  PRODUCTS: 'invoicepro_products',
  CUSTOMERS: 'invoicepro_customers',
  INVOICES: 'invoicepro_invoices',
  QUOTATIONS: 'invoicepro_quotations',
  DELIVERY_NOTES: 'invoicepro_delivery_notes',
  PAYMENTS: 'invoicepro_payments',
};

// Pure local offline mode notice
export async function testFirestoreConnection() {
  console.log("Storage mode: Operating purely with local client-side offline storage.");
}

function isLegacyMockItem(item: any): boolean {
  if (!item) return false;
  if (item.id && LEGACY_MOCK_IDS.has(item.id)) return true;
  const str = JSON.stringify(item);
  return str.includes('Mzansi Wholesale') || str.includes('Protea Hospitality') || str.includes('Rooibos Tea') || str.includes('Kagiso Wholesale');
}

// Helper to check if stored data is legacy mock data and needs auto-purge
function purgeLegacyMockDataIfNeeded() {
  try {
    const compStr = localStorage.getItem(STORAGE_KEYS.COMPANY);
    if (!compStr || compStr.includes('Mzansi')) {
      localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(initialCompanySettings));
    }
    
    // Purge mock arrays if they contain test IDs or mock names from initial seed
    [
      STORAGE_KEYS.PRODUCTS,
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.INVOICES,
      STORAGE_KEYS.QUOTATIONS,
      STORAGE_KEYS.DELIVERY_NOTES,
      STORAGE_KEYS.PAYMENTS
    ].forEach(key => {
      const itemStr = localStorage.getItem(key);
      if (itemStr && (itemStr.includes('prod-1') || itemStr.includes('cust-1') || itemStr.includes('inv-1') || itemStr.includes('Mzansi') || itemStr.includes('Protea') || itemStr.includes('Rooibos'))) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Error purging legacy mock data:', e);
  }
}

// Local Storage Handlers
export function loadCompanySettings(): CompanySettings {
  purgeLegacyMockDataIfNeeded();
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
    return data ? JSON.parse(data) : initialCompanySettings;
  } catch (e) {
    console.error('Failed to load company settings', e);
    return initialCompanySettings;
  }
}

export function saveCompanySettings(settings: CompanySettings): void {
  localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(settings));
}

export function loadProducts(): Product[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!data) return initialProducts;
    const parsed = JSON.parse(data) as Product[];
    return parsed.filter(p => !isLegacyMockItem(p));
  } catch (e) {
    console.error('Failed to load products', e);
    return initialProducts;
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

export function loadCustomers(): Customer[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!data) return initialCustomers;
    const parsed = JSON.parse(data) as Customer[];
    return parsed.filter(c => !isLegacyMockItem(c));
  } catch (e) {
    console.error('Failed to load customers', e);
    return initialCustomers;
  }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

export function loadInvoices(): Invoice[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!data) return initialInvoices;
    const parsed = JSON.parse(data) as Invoice[];
    return parsed.filter(i => !isLegacyMockItem(i));
  } catch (e) {
    console.error('Failed to load invoices', e);
    return initialInvoices;
  }
}

export function saveInvoices(invoices: Invoice[]): void {
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
}

export function loadQuotations(): Quotation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
    if (!data) return initialQuotations;
    const parsed = JSON.parse(data) as Quotation[];
    return parsed.filter(q => !isLegacyMockItem(q));
  } catch (e) {
    console.error('Failed to load quotations', e);
    return initialQuotations;
  }
}

export function saveQuotations(quotations: Quotation[]): void {
  localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(quotations));
}

export function loadDeliveryNotes(): DeliveryNote[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DELIVERY_NOTES);
    if (!data) return initialDeliveryNotes;
    const parsed = JSON.parse(data) as DeliveryNote[];
    return parsed.filter(d => !isLegacyMockItem(d));
  } catch (e) {
    console.error('Failed to load delivery notes', e);
    return initialDeliveryNotes;
  }
}

export function saveDeliveryNotes(deliveryNotes: DeliveryNote[]): void {
  localStorage.setItem(STORAGE_KEYS.DELIVERY_NOTES, JSON.stringify(deliveryNotes));
}

export function loadPayments(): PaymentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!data) return initialPayments;
    const parsed = JSON.parse(data) as PaymentRecord[];
    return parsed.filter(p => !isLegacyMockItem(p));
  } catch (e) {
    console.error('Failed to load payments', e);
    return initialPayments;
  }
}

export function savePayments(payments: PaymentRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
}

// Local Storage Subscriber Hook
export function subscribeToFirestore(callbacks: {
  onCompanyUpdate?: (data: CompanySettings) => void;
  onProductsUpdate?: (data: Product[]) => void;
  onCustomersUpdate?: (data: Customer[]) => void;
  onInvoicesUpdate?: (data: Invoice[]) => void;
  onQuotationsUpdate?: (data: Quotation[]) => void;
  onDeliveryNotesUpdate?: (data: DeliveryNote[]) => void;
  onPaymentsUpdate?: (data: PaymentRecord[]) => void;
}) {
  // Load local storage values and push to callbacks once
  setTimeout(() => {
    callbacks.onCompanyUpdate?.(loadCompanySettings());
    callbacks.onProductsUpdate?.(loadProducts());
    callbacks.onCustomersUpdate?.(loadCustomers());
    callbacks.onInvoicesUpdate?.(loadInvoices());
    callbacks.onQuotationsUpdate?.(loadQuotations());
    callbacks.onDeliveryNotesUpdate?.(loadDeliveryNotes());
    callbacks.onPaymentsUpdate?.(loadPayments());
  }, 0);

  return () => {};
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
