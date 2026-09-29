import { CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord, Lead, CommunicationEmail } from '../types';

export const initialCompanySettings: CompanySettings = {
  name: 'Roti Bros (Pty) Ltd',
  tradingName: 'Roti Bros',
  logoUrl: '',
  address: '123 Bakery Way, Fordsburg, Johannesburg, Gauteng 2092, South Africa',
  email: 'orders@rotibros.co.za',
  phone: '+27 11 830 1234',
  taxNumber: '9012384920',
  vatNumber: '4012984920',
  registrationNumber: '2026/000000/07',
  bankName: 'First National Bank (FNB)',
  accountName: 'Roti Bros (Pty) Ltd',
  accountNumber: '62849103829',
  branchCode: '250655',
  swiftCode: 'FIRNZAJJ',
  currencySymbol: 'R',
  defaultTerms: 'Payment due within 30 days of Tax Invoice date in South African Rand (ZAR). Please quote Invoice No as payment reference.',
};

export const initialProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Plain Roti (Pack of 10)',
    packQuantity: 10,
    size: 'Standard 20cm',
    price: 35.00,
    description: 'Traditional home-style soft plain roti cooked on tawa',
    category: 'Rotis',
    sku: 'RB-PLN-10'
  },
  {
    id: 'prod-2',
    name: 'Pure Butter Roti (Pack of 10)',
    packQuantity: 10,
    size: 'Standard 20cm',
    price: 45.00,
    description: 'Flaky layered roti enriched with 100% farm butter',
    category: 'Rotis',
    sku: 'RB-BTR-10'
  },
  {
    id: 'prod-3',
    name: 'Garlic & Herb Paratha (Pack of 5)',
    packQuantity: 5,
    size: 'Large 22cm',
    price: 40.00,
    description: 'Crispy layered paratha infused with roasted garlic and fresh herbs',
    category: 'Parathas',
    sku: 'RB-GLC-05'
  },
  {
    id: 'prod-4',
    name: 'Durban Style Puri (Pack of 12)',
    packQuantity: 12,
    size: 'Cocktail 12cm',
    price: 30.00,
    description: 'Deep-fried golden puffed bread perfect for curries and sweetmeats',
    category: 'Puri',
    sku: 'RB-PUR-12'
  },
  {
    id: 'prod-5',
    name: 'Cocktail Cheese & Corn Samoosas (Pack of 24)',
    packQuantity: 24,
    size: 'Cocktail 24s',
    price: 85.00,
    description: 'Crisp pastry triangles stuffed with cheddar cheese and sweetcorn',
    category: 'Samoosas & Savouries',
    sku: 'RB-SAM-24'
  },
  {
    id: 'prod-6',
    name: 'Spicy Lamb Cocktail Samoosas (Pack of 24)',
    packQuantity: 24,
    size: 'Cocktail 24s',
    price: 110.00,
    description: 'Traditional spiced mince samosas prepared with fresh coriander and cumin',
    category: 'Samoosas & Savouries',
    sku: 'RB-SAM-L24'
  }
];

export const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    registeredName: 'SuperSpar Fordsburg (Pty) Ltd',
    code: 'CUST-SPAR-01',
    tradingName: 'SuperSpar Fordsburg',
    isTradingSameAsRegistered: true,
    address: 'Corner Central & Mint Road, Fordsburg, Johannesburg 2092',
    email: 'orders@spar-fordsburg.co.za',
    contactPerson: 'Ahmed Patel',
    phone: '+27 11 832 9901',
    taxNumber: '9123812903',
    vatNumber: '4123984123',
    registrationNumber: '2018/192831/07',
    branches: [
      {
        id: 'br-1',
        customerId: 'cust-1',
        name: 'Fordsburg Central Deli',
        code: 'BR-01',
        tradingName: 'SuperSpar Fordsburg Deli',
        address: 'Corner Central & Mint Road, Fordsburg',
        email: 'deli@spar-fordsburg.co.za',
        contactPerson: 'Farouk (Bakery Dept)',
        phone: '+27 11 832 9902'
      }
    ],
    documents: [],
    createdAt: '2026-01-15'
  },
  {
    id: 'cust-2',
    registeredName: 'Checkers Hyper Sandton City',
    code: 'CUST-CHK-02',
    tradingName: 'Checkers Hyper Sandton',
    isTradingSameAsRegistered: true,
    address: 'Sandton City Mall, 83 Rivonia Rd, Sandhurst, Sandton 2196',
    email: 'bakery.sandton@checkers.co.za',
    contactPerson: 'Lerato Mokoena',
    phone: '+27 11 784 5500',
    taxNumber: '9876543210',
    vatNumber: '4876543210',
    registrationNumber: '1929/001807/06',
    branches: [],
    documents: [],
    createdAt: '2026-01-20'
  },
  {
    id: 'cust-3',
    registeredName: 'Taj Mahal Indian Restaurant (Pty) Ltd',
    code: 'CUST-TAJ-03',
    tradingName: 'Taj Mahal Restaurant',
    isTradingSameAsRegistered: false,
    address: '44 4th Avenue, Parkhurst, Johannesburg 2193',
    email: 'kitchen@tajmahaljhb.co.za',
    contactPerson: 'Rajesh Naidoo',
    phone: '+27 11 447 8820',
    taxNumber: '9456123789',
    vatNumber: '4456123789',
    registrationNumber: '2021/334455/07',
    branches: [],
    documents: [],
    createdAt: '2026-02-01'
  }
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'cust-1',
    branchId: 'br-1',
    issueDate: '2026-03-01',
    dueDate: '2026-03-31',
    items: [
      {
        id: 'li-1',
        productId: 'prod-1',
        productName: 'Plain Roti (Pack of 10)',
        packQuantity: 10,
        size: 'Standard 20cm',
        quantity: 50,
        unitPrice: 35.00,
        description: 'Standard plain roti delivery pack',
        totalPrice: 1750.00
      },
      {
        id: 'li-2',
        productId: 'prod-2',
        productName: 'Pure Butter Roti (Pack of 10)',
        packQuantity: 10,
        size: 'Standard 20cm',
        quantity: 36,
        unitPrice: 45.00,
        description: 'Pure butter roti bakery stock',
        totalPrice: 1620.00
      }
    ],
    subtotal: 3370.00,
    taxRate: 15,
    taxAmount: 505.50,
    totalAmount: 3875.50,
    amountPaid: 3875.50,
    balanceDue: 0.00,
    status: 'Paid',
    notes: 'Delivered directly to Deli counter. Thank you for your business!',
    deliveryNoteId: 'dn-1',
    createdAt: '2026-03-01'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-0002',
    customerId: 'cust-2',
    issueDate: '2026-03-15',
    dueDate: '2026-04-14',
    items: [
      {
        id: 'li-3',
        productId: 'prod-1',
        productName: 'Plain Roti (Pack of 10)',
        packQuantity: 10,
        size: 'Standard 20cm',
        quantity: 80,
        unitPrice: 35.00,
        description: 'Retail plain roti packs',
        totalPrice: 2800.00
      },
      {
        id: 'li-4',
        productId: 'prod-5',
        productName: 'Cocktail Cheese & Corn Samoosas (Pack of 24)',
        packQuantity: 24,
        size: 'Cocktail 24s',
        quantity: 25,
        unitPrice: 85.00,
        description: 'Frozen cocktail samoosas for hot deli cabinet',
        totalPrice: 2125.00
      }
    ],
    subtotal: 4925.00,
    taxRate: 15,
    taxAmount: 738.75,
    totalAmount: 5663.75,
    amountPaid: 0.00,
    balanceDue: 5663.75,
    status: 'Sent',
    notes: 'Standard 30 days credit terms apply. Purchase Order PO-CHK-9921',
    deliveryNoteId: 'dn-2',
    createdAt: '2026-03-15'
  }
];

export const initialQuotations: Quotation[] = [
  {
    id: 'qt-1',
    quotationNumber: 'QT-2026-0001',
    customerId: 'cust-3',
    issueDate: '2026-03-20',
    expiryDate: '2026-04-20',
    items: [
      {
        id: 'li-5',
        productId: 'prod-3',
        productName: 'Garlic & Herb Paratha (Pack of 5)',
        packQuantity: 5,
        size: 'Large 22cm',
        quantity: 40,
        unitPrice: 40.00,
        description: 'Weekly restaurant supply',
        totalPrice: 1600.00
      }
    ],
    subtotal: 1600.00,
    taxRate: 15,
    taxAmount: 240.00,
    totalAmount: 1840.00,
    status: 'Accepted',
    notes: 'Quotation valid for 30 days from date of issue.',
    createdAt: '2026-03-20'
  }
];

export const initialDeliveryNotes: DeliveryNote[] = [
  {
    id: 'dn-1',
    deliveryNoteNumber: 'DN-2026-0001',
    invoiceId: 'inv-1',
    customerId: 'cust-1',
    branchId: 'br-1',
    issueDate: '2026-03-01',
    deliveryAddress: 'Corner Central & Mint Road, Fordsburg, Johannesburg 2092',
    recipientContact: 'Farouk (Bakery Dept)',
    recipientPhone: '+27 11 832 9902',
    items: [
      {
        id: 'li-1',
        productId: 'prod-1',
        productName: 'Plain Roti (Pack of 10)',
        packQuantity: 10,
        size: 'Standard 20cm',
        quantity: 50,
        unitPrice: 35.00,
        description: 'Standard plain roti delivery pack',
        totalPrice: 1750.00
      },
      {
        id: 'li-2',
        productId: 'prod-2',
        productName: 'Pure Butter Roti (Pack of 10)',
        packQuantity: 10,
        size: 'Standard 20cm',
        quantity: 36,
        unitPrice: 45.00,
        description: 'Pure butter roti bakery stock',
        totalPrice: 1620.00
      }
    ],
    driverNotes: 'Delivered in refrigerated van GP 44 BB. Signed received by Farouk.',
    status: 'Delivered',
    createdAt: '2026-03-01'
  },
  {
    id: 'dn-2',
    deliveryNoteNumber: 'DN-2026-0002',
    invoiceId: 'inv-2',
    customerId: 'cust-2',
    issueDate: '2026-03-15',
    deliveryAddress: 'Sandton City Mall, Receiving Bay 4, Sandton 2196',
    recipientContact: 'Lerato Mokoena',
    recipientPhone: '+27 11 784 5500',
    items: [
      {
        id: 'li-3',
        productId: 'prod-1',
        productName: 'Plain Roti (Pack of 10)',
        packQuantity: 10,
        size: 'Standard 20cm',
        quantity: 80,
        unitPrice: 35.00,
        description: 'Retail plain roti packs',
        totalPrice: 2800.00
      },
      {
        id: 'li-4',
        productId: 'prod-5',
        productName: 'Cocktail Cheese & Corn Samoosas (Pack of 24)',
        packQuantity: 24,
        size: 'Cocktail 24s',
        quantity: 25,
        unitPrice: 85.00,
        description: 'Frozen cocktail samoosas for hot deli cabinet',
        totalPrice: 2125.00
      }
    ],
    driverNotes: 'In transit - Scheduled delivery morning 09:30 AM',
    status: 'In Transit',
    createdAt: '2026-03-15'
  }
];

export const initialPayments: PaymentRecord[] = [
  {
    id: 'pay-1',
    invoiceId: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'cust-1',
    branchId: 'br-1',
    amount: 3875.50,
    paymentDate: '2026-03-05',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'FNB-EFT-99120',
    notes: 'Full payment received into FNB business account'
  }
];

export const initialLeads: Lead[] = [];

export const initialCommunications: CommunicationEmail[] = [];
