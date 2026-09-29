import React, { useState, useMemo } from 'react';
import {
  CompanySettings, Product, Customer, Invoice, Quotation, DeliveryNote, PaymentRecord, Lead, CommunicationEmail
} from '../types';
import {
  Database, Search, Download, Upload, Trash2, Eye, Copy, Check,
  RefreshCw, FileText, FileCode, Truck, Package, Users, DollarSign,
  Building2, Layers, ShieldCheck, X, ExternalLink, HardDrive, CheckCircle2,
  AlertCircle, MessageSquare, Mail, UserCheck
} from 'lucide-react';
import { exportDatabaseJSON, importDatabaseJSON, deleteDocumentFromUserFirestore, testFirestoreConnection, purgeFakeDataFromCloudAndLocal } from '../utils/storage';
import { auth } from '../lib/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companySettings: CompanySettings;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  quotations: Quotation[];
  deliveryNotes: DeliveryNote[];
  payments: PaymentRecord[];
  leads?: Lead[];
  communications?: CommunicationEmail[];
  onDeleteInvoice?: (id: string) => void;
  onDeleteDeliveryNote?: (id: string) => void;
  onDeleteProduct?: (id: string) => void;
  onDeleteCustomer?: (id: string) => void;
  onDeleteQuotation?: (id: string) => void;
  onDeleteLead?: (id: string) => void;
  onDeleteCommunication?: (id: string) => void;
  onRefreshData?: () => void;
  onShowToast: (msg: string) => void;
}

type CollectionKey = 'all' | 'invoices' | 'delivery_notes' | 'quotations' | 'customers' | 'products' | 'payments' | 'leads' | 'communications' | 'company_settings';

export const DatabaseExplorerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  companySettings,
  products,
  customers,
  invoices,
  quotations,
  deliveryNotes,
  payments,
  leads = [],
  communications = [],
  onDeleteInvoice,
  onDeleteDeliveryNote,
  onDeleteProduct,
  onDeleteCustomer,
  onDeleteQuotation,
  onDeleteLead,
  onDeleteCommunication,
  onRefreshData,
  onShowToast
}) => {
  const [activeCollection, setActiveCollection] = useState<CollectionKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<{ collection: string; data: any } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Collection counts
  const counts = {
    invoices: invoices.length,
    delivery_notes: deliveryNotes.length,
    quotations: quotations.length,
    customers: customers.length,
    products: products.length,
    payments: payments.length,
    leads: leads.length,
    communications: communications.length,
    company_settings: 1,
    all: invoices.length + deliveryNotes.length + quotations.length + customers.length + products.length + payments.length + leads.length + communications.length + 1
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await testFirestoreConnection();
    onRefreshData?.();
    setTimeout(() => {
      setIsRefreshing(false);
      onShowToast('Database synchronized and refreshed.');
    }, 600);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importDatabaseJSON(content);
        if (success) {
          onShowToast('Database imported and restored successfully!');
          setImportError(null);
          onRefreshData?.();
        } else {
          setImportError('Invalid database JSON structure.');
        }
      } catch (err) {
        setImportError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Compile unified records for search and view
  const allRecords = useMemo(() => {
    const records: Array<{
      id: string;
      collection: CollectionKey;
      collectionName: string;
      title: string;
      subtitle: string;
      badge: string;
      badgeColor: string;
      date?: string;
      amount?: string;
      raw: any;
    }> = [];

    // Invoices
    invoices.forEach(inv => {
      const cust = customers.find(c => c.id === inv.customerId);
      records.push({
        id: inv.id,
        collection: 'invoices',
        collectionName: 'Invoices',
        title: inv.invoiceNumber,
        subtitle: cust ? cust.registeredName : `Customer ID: ${inv.customerId}`,
        badge: inv.status || 'Invoice',
        badgeColor: inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        date: inv.issueDate,
        amount: `R ${inv.totalAmount.toFixed(2)}`,
        raw: inv
      });
    });

    // Delivery Notes
    deliveryNotes.forEach(dn => {
      const cust = customers.find(c => c.id === dn.customerId);
      records.push({
        id: dn.id,
        collection: 'delivery_notes',
        collectionName: 'Delivery Notes',
        title: dn.deliveryNoteNumber,
        subtitle: cust ? cust.registeredName : `Invoice: ${dn.invoiceNumber}`,
        badge: dn.status || 'Dispatched',
        badgeColor: dn.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        date: dn.issueDate,
        amount: `${dn.items?.length || 0} items`,
        raw: dn
      });
    });

    // Quotations
    quotations.forEach(q => {
      const cust = customers.find(c => c.id === q.customerId);
      records.push({
        id: q.id,
        collection: 'quotations',
        collectionName: 'Quotations',
        title: q.quotationNumber,
        subtitle: cust ? cust.registeredName : `Customer ID: ${q.customerId}`,
        badge: q.status || 'Quote',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        date: q.issueDate,
        amount: `R ${q.totalAmount.toFixed(2)}`,
        raw: q
      });
    });

    // Customers
    customers.forEach(c => {
      records.push({
        id: c.id,
        collection: 'customers',
        collectionName: 'Customers & Branches',
        title: c.registeredName,
        subtitle: c.tradingName ? `T/A: ${c.tradingName}` : `Code: ${c.code || 'N/A'}`,
        badge: `${c.branches?.length || 0} Branches`,
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        date: c.createdAt ? c.createdAt.slice(0, 10) : undefined,
        amount: c.phone || c.email,
        raw: c
      });
    });

    // Products
    products.forEach(p => {
      records.push({
        id: p.id,
        collection: 'products',
        collectionName: 'Products',
        title: p.name,
        subtitle: `Pack: ${p.packQuantity || 1} • Size: ${p.size || 'Standard'}`,
        badge: p.sku || 'Product',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        amount: `R ${(p.price || 0).toFixed(2)}`,
        raw: p
      });
    });

    // Payments
    payments.forEach(pay => {
      records.push({
        id: pay.id,
        collection: 'payments',
        collectionName: 'Payments',
        title: `Payment: R ${pay.amount.toFixed(2)}`,
        subtitle: `Inv: ${pay.invoiceNumber} • Ref: ${pay.referenceNumber || 'None'}`,
        badge: pay.paymentMethod || 'EFT',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        date: pay.paymentDate,
        amount: `R ${pay.amount.toFixed(2)}`,
        raw: pay
      });
    });

    // Leads
    leads.forEach(lead => {
      records.push({
        id: lead.id,
        collection: 'leads',
        collectionName: 'Sales Leads',
        title: `${lead.leadNumber} - ${lead.name}`,
        subtitle: `${lead.companyName} • ${lead.phone || lead.email}`,
        badge: lead.status || 'New',
        badgeColor: lead.status === 'Won' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        date: lead.createdAt,
        amount: `R ${(lead.estimatedValue || 0).toLocaleString()}`,
        raw: lead
      });
    });

    // Communications
    communications.forEach(comm => {
      records.push({
        id: comm.id,
        collection: 'communications',
        collectionName: 'Communications',
        title: comm.subject,
        subtitle: comm.folder === 'sent' ? `To: ${comm.recipient?.name || comm.recipient?.email}` : `From: ${comm.sender?.name || comm.sender?.email}`,
        badge: comm.folder === 'sent' ? 'Sent' : (comm.status === 'unread' ? 'Unread' : 'Inbox'),
        badgeColor: comm.status === 'unread' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        date: comm.date ? comm.date.slice(0, 10) : undefined,
        amount: comm.direction === 'inbound' ? 'Inbound' : 'Outbound',
        raw: comm
      });
    });

    // Company Settings
    records.push({
      id: 'company_settings_main',
      collection: 'company_settings',
      collectionName: 'Company Settings',
      title: companySettings.name || 'Company Profile',
      subtitle: companySettings.tradingName || 'Roti Bros (Pty) Ltd',
      badge: 'Profile',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      amount: companySettings.phone,
      raw: companySettings
    });

    return records;
  }, [invoices, deliveryNotes, quotations, customers, products, payments, leads, communications, companySettings]);

  // Filter records based on collection and search query
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      const matchesCollection = activeCollection === 'all' || r.collection === activeCollection;
      if (!matchesCollection) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchSubtitle = r.subtitle.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      const matchJson = JSON.stringify(r.raw).toLowerCase().includes(q);

      return matchTitle || matchSubtitle || matchId || matchJson;
    });
  }, [allRecords, activeCollection, searchQuery]);

  // Handle document deletion from Database Explorer
  const handleDeleteRecord = (record: typeof allRecords[0]) => {
    if (!confirm(`Are you sure you want to delete this document (${record.title}) from the database?`)) return;

    if (record.collection === 'invoices') {
      onDeleteInvoice?.(record.id);
    } else if (record.collection === 'delivery_notes') {
      onDeleteDeliveryNote?.(record.id);
    } else if (record.collection === 'products') {
      onDeleteProduct?.(record.id);
    } else if (record.collection === 'customers') {
      onDeleteCustomer?.(record.id);
    } else if (record.collection === 'quotations') {
      onDeleteQuotation?.(record.id);
    } else if (record.collection === 'leads') {
      onDeleteLead?.(record.id);
    } else if (record.collection === 'communications') {
      onDeleteCommunication?.(record.id);
    } else {
      if (auth.currentUser?.uid) {
        deleteDocumentFromUserFirestore(auth.currentUser.uid, record.collection, record.id);
      }
    }

    if (selectedRecord?.data?.id === record.id) {
      setSelectedRecord(null);
    }
    onShowToast(`Deleted document [${record.id}] from ${record.collectionName}`);
  };

  const navCollections: Array<{ id: CollectionKey; label: string; icon: any; count: number }> = [
    { id: 'all', label: 'All Collections', icon: Layers, count: counts.all },
    { id: 'invoices', label: 'Invoices', icon: FileText, count: counts.invoices },
    { id: 'delivery_notes', label: 'Delivery Notes', icon: Truck, count: counts.delivery_notes },
    { id: 'quotations', label: 'Quotations', icon: FileCode, count: counts.quotations },
    { id: 'customers', label: 'Customers & Branches', icon: Users, count: counts.customers },
    { id: 'leads', label: 'Sales Leads', icon: UserCheck, count: counts.leads },
    { id: 'communications', label: 'Communications & Emails', icon: Mail, count: counts.communications },
    { id: 'products', label: 'Products', icon: Package, count: counts.products },
    { id: 'payments', label: 'Payments', icon: DollarSign, count: counts.payments },
    { id: 'company_settings', label: 'Company Profile', icon: Building2, count: counts.company_settings },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-black px-4 sm:px-6 py-4 border-b border-yellow-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400 text-black rounded-xl shadow-md font-black">
              <Database className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Live Database Explorer
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cloud Synced
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Firestore DB & Realtime Storage • Total Records: <span className="text-yellow-400 font-bold">{counts.all}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
              title="Resync with Firebase Cloud Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-yellow-400' : ''}`} />
              <span>Resync</span>
            </button>

            <button
              onClick={async () => {
                await purgeFakeDataFromCloudAndLocal(auth.currentUser?.uid);
                onShowToast('All demo/mock records have been wiped clean.');
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              title="Purge all demo and mock records from local storage and cloud database"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge Mock Data</span>
            </button>

            <button
              onClick={exportDatabaseJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-black shadow-md border border-yellow-500 transition"
              title="Download full database snapshot as JSON file"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export JSON Backup</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
              title="Close Database Explorer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cloud Info & Collection Summary Ribbon */}
        <div className="bg-slate-950/70 px-4 sm:px-6 py-2.5 border-b border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-slate-400 font-mono overflow-x-auto py-0.5">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-yellow-400" />
              <span>Target: <strong className="text-slate-200">Firebase Firestore</strong></span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">
              Collections: <strong className="text-slate-200">7 Active</strong>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline">
              Persistence: <strong className="text-emerald-400">Cloud + Local Cache</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(JSON.stringify(allRecords.map(r => r.raw), null, 2), 'all_raw')}
              className="text-[11px] font-semibold text-yellow-400 hover:underline flex items-center gap-1"
            >
              {copiedId === 'all_raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy All Records JSON</span>
            </button>
          </div>
        </div>

        {importError && (
          <div className="bg-red-950/80 border-b border-red-500/40 text-red-200 px-6 py-2 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Main Workspace: Left Sidebar Collections + Right Records Table & Inspector */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Left Collection Navigation Drawer */}
          <div className="w-full md:w-64 bg-slate-950/90 border-r border-slate-800 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
            <div className="hidden md:block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-1.5">
              Collections
            </div>
            {navCollections.map(col => {
              const Icon = col.icon;
              const isActive = activeCollection === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap md:whitespace-normal ${
                    isActive
                      ? 'bg-yellow-400 text-black shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-yellow-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{col.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                    isActive ? 'bg-black text-yellow-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {col.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Center/Right Workspace: Search, Records List & Document Inspector */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-hidden">
            
            {/* Search and Filters Bar */}
            <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search in ${activeCollection === 'all' ? 'all collections' : activeCollection} by ID, name, customer, total, or JSON field...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:border-yellow-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-400 font-mono whitespace-nowrap">
                Showing <strong className="text-yellow-400">{filteredRecords.length}</strong> records
              </div>
            </div>

            {/* Content Area: Table of Records + (Optional) Inspector Drawer */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              
              {/* Records List/Table */}
              <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 ${selectedRecord ? 'hidden lg:block lg:w-1/2' : 'w-full'}`}>
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-30 text-yellow-400" />
                    <p className="text-sm font-semibold text-slate-400">No records found matching query</p>
                    <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting a different collection.</p>
                  </div>
                ) : (
                  filteredRecords.map((record) => {
                    const isSelected = selectedRecord?.data?.id === record.id;
                    return (
                      <div
                        key={`${record.collection}-${record.id}`}
                        onClick={() => setSelectedRecord({ collection: record.collectionName, data: record.raw })}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-slate-800 border-yellow-400 shadow-md ring-1 ring-yellow-400/50'
                            : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-white truncate">
                              {record.title}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${record.badgeColor}`}>
                              {record.badge}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                              {record.collectionName}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 mt-1 truncate">
                            {record.subtitle}
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-3 flex-wrap">
                            <span>ID: <code className="text-yellow-400/80">{record.id}</code></span>
                            {record.date && <span>Date: {record.date}</span>}
                            {record.amount && <span className="font-semibold text-slate-300">{record.amount}</span>}
                          </div>
                        </div>

                        {/* Action Buttons on Record Row */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(record.id, `id_${record.id}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-yellow-400 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
                            title="Copy Document ID"
                          >
                            {copiedId === `id_${record.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord({ collection: record.collectionName, data: record.raw });
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-bold border border-slate-700/60 transition"
                            title="Inspect JSON & Fields"
                          >
                            <Eye className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Inspect</span>
                          </button>

                          {record.collection !== 'company_settings' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecord(record);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-950/40 rounded-lg border border-slate-700/60 transition"
                              title="Delete Record from Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right/Bottom JSON Document Inspector */}
              {selectedRecord && (
                <div className="w-full lg:w-1/2 bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col min-h-0 overflow-hidden">
                  
                  {/* Inspector Header */}
                  <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-white truncate">
                          Document Inspector
                        </h3>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-yellow-400/20 text-yellow-300 border border-yellow-500/30 rounded">
                          {selectedRecord.collection}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        ID: {selectedRecord.data?.id || 'main'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(JSON.stringify(selectedRecord.data, null, 2), 'doc_json')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-black transition"
                        title="Copy Formatted JSON"
                      >
                        {copiedId === 'doc_json' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>Copy JSON</span>
                      </button>

                      <button
                        onClick={() => setSelectedRecord(null)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Close Inspector"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inspector JSON Body */}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 bg-black/90">
                    <pre className="whitespace-pre-wrap break-all leading-relaxed select-text">
                      {JSON.stringify(selectedRecord.data, null, 2)}
                    </pre>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-black px-4 sm:px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Connected to project: <strong className="text-slate-200">gen-lang-client-0112209964</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Real-time listeners active</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
