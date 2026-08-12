import { CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord } from '../types';

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

export const initialProducts: Product[] = [];

export const initialCustomers: Customer[] = [];

export const initialInvoices: Invoice[] = [];

export const initialQuotations: Quotation[] = [];

export const initialDeliveryNotes: DeliveryNote[] = [];

export const initialPayments: PaymentRecord[] = [];


