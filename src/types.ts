export interface CompanySettings {
  name: string;
  tradingName: string;
  logoUrl?: string;
  address: string;
  email: string;
  phone: string;
  taxNumber: string;
  vatNumber: string;
  registrationNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  swiftCode?: string;
  currencySymbol: string;
  defaultTerms: string;
}

export interface Product {
  id: string;
  name: string;
  packQuantity: number; // e.g. 6, 12, 24
  size: string; // e.g. "500ml", "1kg", "Large", "Box"
  price: number;
  description: string;
  category?: string;
  sku?: string;
}

export interface Branch {
  id: string;
  customerId: string;
  name: string; // e.g. "North Branch"
  code: string; // e.g. "BR-001"
  tradingName: string;
  address: string;
  email: string;
  contactPerson: string;
  phone: string;
  taxNumber?: string;
  vatNumber?: string;
  registrationNumber?: string;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  fileName: string;
  fileType: string;
  uploadDate: string; // YYYY-MM-DD
  fileSize?: string;
  fileDataUrl?: string; // Data URL for previewing or downloading
  notes?: string;
}

export interface Customer {
  id: string;
  registeredName: string;
  code: string; // Unique customer code
  tradingName: string;
  isTradingSameAsRegistered: boolean;
  address: string;
  email: string;
  contactPerson: string;
  phone: string;
  taxNumber?: string;
  vatNumber?: string;
  registrationNumber?: string;
  branches: Branch[];
  documents: CustomerDocument[];
  createdAt: string;
}

export interface LineItem {
  id: string;
  productId?: string;
  productName: string;
  packQuantity: number;
  size: string;
  quantity: number; // Total number of units / packs ordered
  unitPrice: number;
  description: string;
  totalPrice: number;
}

export type DocumentStatus = 'Draft' | 'Sent' | 'Paid' | 'Partial' | 'Overdue' | 'Accepted' | 'Declined';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  branchId?: string; // Optional branch
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: LineItem[];
  subtotal: number;
  taxRate: number; // Percentage e.g. 15
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: DocumentStatus;
  notes?: string;
  deliveryNoteId?: string; // Auto-generated Delivery Note link
  createdAt: string;
}

export interface DeliveryNote {
  id: string;
  deliveryNoteNumber: string;
  invoiceId?: string;
  quotationId?: string;
  customerId: string;
  branchId?: string;
  issueDate: string;
  deliveryAddress: string;
  recipientContact: string;
  recipientPhone: string;
  items: LineItem[];
  driverNotes?: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Returned';
  createdAt: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  branchId?: string;
  issueDate: string;
  expiryDate: string;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: DocumentStatus;
  notes?: string;
  convertedInvoiceId?: string; // Link to invoice if converted
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  branchId?: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'Bank Transfer' | 'Credit Card' | 'Cash' | 'Cheque' | 'Other';
  referenceNumber?: string;
  notes?: string;
}

export type PeriodFilter = 'weekly' | 'monthly' | '3month' | '6month' | 'yearly' | 'lifetime' | 'custom';

export interface ConsolidatedReportFilter {
  period: PeriodFilter;
  customerId?: string; // 'all' or specific
  branchId?: string; // 'all' or specific
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  searchKeyword?: string;
}
