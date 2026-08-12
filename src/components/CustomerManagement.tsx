import React, { useState } from 'react';
import { Customer, Branch, CustomerDocument, Invoice, PaymentRecord, DeliveryNote, Quotation } from '../types';
import { Users, Plus, Search, GitBranch, FileText, History, DollarSign, Edit3, Trash2, Upload, File, Download, ChevronRight, X, CheckCircle, Save, Phone, Mail, MapPin, Building } from 'lucide-react';

interface Props {
  customers: Customer[];
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  invoices: Invoice[];
  payments: PaymentRecord[];
  deliveryNotes: DeliveryNote[];
  quotations: Quotation[];
  currencySymbol: string;
  autoOpenCreate?: boolean;
}

export const CustomerManagement: React.FC<Props> = ({
  customers,
  onSaveCustomer,
  onDeleteCustomer,
  invoices,
  payments,
  deliveryNotes,
  quotations,
  currencySymbol,
  autoOpenCreate
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [activeTab, setActiveTab] = useState<'profile' | 'branches' | 'documents' | 'payments' | 'history'>('profile');

  // Customer Form Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  React.useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCustomerModal();
    }
  }, [autoOpenCreate]);

  // Branch Form Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);

  // Document Modal
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  // Search History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  const filteredCustomers = customers.filter(c =>
    c.registeredName.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.tradingName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  // Sync selected customer state when customers list changes
  const activeCustomer = customers.find(c => c.id === selectedCustomer?.id) || customers[0] || null;

  // ------------------- Customer Modal Handlers -------------------
  const handleOpenCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer({ ...customer });
    } else {
      setEditingCustomer({
        id: `cust-${Date.now()}`,
        registeredName: '',
        code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        tradingName: '',
        isTradingSameAsRegistered: true,
        address: '',
        email: '',
        contactPerson: '',
        phone: '',
        taxNumber: '',
        vatNumber: '',
        registrationNumber: '',
        branches: [],
        documents: [],
        createdAt: new Date().toISOString().slice(0, 10)
      });
    }
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.registeredName) return;

    const tradingName = editingCustomer.isTradingSameAsRegistered
      ? editingCustomer.registeredName
      : editingCustomer.tradingName || editingCustomer.registeredName;

    const updatedCustomer: Customer = {
      ...(editingCustomer as Customer),
      tradingName
    };

    onSaveCustomer(updatedCustomer);
    setSelectedCustomer(updatedCustomer);
    setIsCustomerModalOpen(false);
  };

  // ------------------- Branch Modal Handlers -------------------
  const handleOpenBranchModal = (branch?: Branch) => {
    if (!activeCustomer) return;
    if (branch) {
      setEditingBranch({ ...branch });
    } else {
      setEditingBranch({
        id: `br-${Date.now()}`,
        customerId: activeCustomer.id,
        name: '',
        code: `BR-${Math.floor(100 + Math.random() * 900)}`,
        tradingName: activeCustomer.tradingName,
        address: activeCustomer.address,
        email: activeCustomer.email,
        contactPerson: activeCustomer.contactPerson,
        phone: activeCustomer.phone,
        taxNumber: activeCustomer.taxNumber,
        vatNumber: activeCustomer.vatNumber,
        registrationNumber: activeCustomer.registrationNumber
      });
    }
    setIsBranchModalOpen(true);
  };

  const handleSaveBranchForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !editingBranch || !editingBranch.name) return;

    const existingBranches = activeCustomer.branches || [];
    const branchIdx = existingBranches.findIndex(b => b.id === editingBranch.id);

    let updatedBranches: Branch[];
    if (branchIdx >= 0) {
      updatedBranches = [...existingBranches];
      updatedBranches[branchIdx] = editingBranch as Branch;
    } else {
      updatedBranches = [...existingBranches, editingBranch as Branch];
    }

    const updatedCustomer = {
      ...activeCustomer,
      branches: updatedBranches
    };

    onSaveCustomer(updatedCustomer);
    setSelectedCustomer(updatedCustomer);
    setIsBranchModalOpen(false);
  };

  const handleDeleteBranch = (branchId: string) => {
    if (!activeCustomer) return;
    if (confirm('Delete this customer branch?')) {
      const updatedBranches = activeCustomer.branches.filter(b => b.id !== branchId);
      const updatedCustomer = { ...activeCustomer, branches: updatedBranches };
      onSaveCustomer(updatedCustomer);
      setSelectedCustomer(updatedCustomer);
    }
  };

  // ------------------- Document Upload Handlers -------------------
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !docName) return;

    const reader = new FileReader();
    const saveDoc = (fileDataUrl?: string) => {
      const newDoc: CustomerDocument = {
        id: `doc-${Date.now()}`,
        customerId: activeCustomer.id,
        fileName: docName,
        fileType: docFile?.type || 'application/pdf',
        uploadDate: new Date().toISOString().slice(0, 10),
        fileSize: docFile ? `${(docFile.size / 1024 / 1024).toFixed(1)} MB` : '0.5 MB',
        fileDataUrl: fileDataUrl || '',
        notes: docNotes
      };

      const updatedCustomer = {
        ...activeCustomer,
        documents: [...(activeCustomer.documents || []), newDoc]
      };

      onSaveCustomer(updatedCustomer);
      setSelectedCustomer(updatedCustomer);
      setIsDocModalOpen(false);
      setDocName('');
      setDocNotes('');
      setDocFile(null);
    };

    if (docFile) {
      reader.onloadend = () => saveDoc(reader.result as string);
      reader.readAsDataURL(docFile);
    } else {
      saveDoc();
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (!activeCustomer) return;
    if (confirm('Delete this document?')) {
      const updatedDocs = activeCustomer.documents.filter(d => d.id !== docId);
      const updatedCustomer = { ...activeCustomer, documents: updatedDocs };
      onSaveCustomer(updatedCustomer);
      setSelectedCustomer(updatedCustomer);
    }
  };

  // ------------------- History Search Filters -------------------
  const customerInvoices = activeCustomer
    ? invoices.filter(i => i.customerId === activeCustomer.id)
    : [];

  const customerPayments = activeCustomer
    ? payments.filter(p => p.customerId === activeCustomer.id)
    : [];

  const customerQuotations = activeCustomer
    ? quotations.filter(q => q.customerId === activeCustomer.id)
    : [];

  const customerDeliveryNotes = activeCustomer
    ? deliveryNotes.filter(d => d.customerId === activeCustomer.id)
    : [];

  // Unified History items array
  const unifiedHistory = [
    ...customerInvoices.map(i => ({ type: 'Invoice', id: i.id, ref: i.invoiceNumber, date: i.issueDate, amount: i.totalAmount, status: i.status, desc: `${i.items.length} line items` })),
    ...customerPayments.map(p => ({ type: 'Payment', id: p.id, ref: p.invoiceNumber, date: p.paymentDate, amount: p.amount, status: 'Settled', desc: `${p.paymentMethod} (${p.referenceNumber || 'No ref'})` })),
    ...customerQuotations.map(q => ({ type: 'Quotation', id: q.id, ref: q.quotationNumber, date: q.issueDate, amount: q.totalAmount, status: q.status, desc: `${q.items.length} quoted items` })),
    ...customerDeliveryNotes.map(d => ({ type: 'Delivery Note', id: d.id, ref: d.deliveryNoteNumber, date: d.issueDate, amount: 0, status: d.status, desc: `Delivered to: ${d.deliveryAddress}` }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredHistory = unifiedHistory.filter(item => {
    const matchesKeyword = historySearch === '' ||
      item.ref.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.type.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.desc.toLowerCase().includes(historySearch.toLowerCase());

    const matchesDateFrom = !historyDateFrom || item.date >= historyDateFrom;
    const matchesDateTo = !historyDateTo || item.date <= historyDateTo;

    return matchesKeyword && matchesDateFrom && matchesDateTo;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Customer & Branch Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage customer accounts, branches, document storage, and track complete payment history.
          </p>
        </div>

        <button
          onClick={() => handleOpenCustomerModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Main Split Layout: Customer List Left, Detail View Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Searchable Customer List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer code, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs max-h-[650px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No customers found matching search.
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = activeCustomer?.id === cust.id;
                const custInvTotal = invoices
                  .filter(i => i.customerId === cust.id)
                  .reduce((acc, i) => acc + i.totalAmount, 0);

                return (
                  <button
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setActiveTab('profile');
                    }}
                    className={`w-full text-left p-4 transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {cust.registeredName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">
                          {cust.code}
                        </span>
                        <span>• {cust.branches?.length || 0} Branches</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        {currencySymbol}{custInvTotal.toFixed(2)}
                      </div>
                      <ChevronRight className={`w-4 h-4 ml-auto mt-1 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed View */}
        <div className="lg:col-span-8">
          {activeCustomer ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              
              {/* Active Customer Banner */}
              <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider">
                    <span>CODE: {activeCustomer.code}</span>
                    <span>•</span>
                    <span>Created {activeCustomer.createdAt}</span>
                  </div>
                  <h3 className="text-xl font-bold mt-1 text-white">{activeCustomer.registeredName}</h3>
                  {activeCustomer.tradingName !== activeCustomer.registeredName && (
                    <p className="text-xs text-slate-300">Trading as: {activeCustomer.tradingName}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenCustomerModal(activeCustomer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete customer "${activeCustomer.registeredName}"?`)) {
                        onDeleteCustomer(activeCustomer.id);
                        setSelectedCustomer(customers.find(c => c.id !== activeCustomer.id) || null);
                      }
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg transition border border-slate-700"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  Customer Specs & Tax
                </button>

                <button
                  onClick={() => setActiveTab('branches')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === 'branches'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  Branches ({activeCustomer.branches?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === 'documents'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Documents ({activeCustomer.documents?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('payments')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === 'payments'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Payment History ({customerPayments.length})
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Activity Log & Search
                </button>
              </div>

              {/* Tab Content Container */}
              <div className="p-6">
                
                {/* 1. Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-500" /> Physical & Billing Address
                        </h4>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">
                          {activeCustomer.address || 'No address provided'}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-500" /> Contact Details
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">Person:</span> {activeCustomer.contactPerson}
                          </div>
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {activeCustomer.email}
                          </div>
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {activeCustomer.phone}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Tax & Registration Info */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                        Tax & Government Registration
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block mb-1">Tax Number</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {activeCustomer.taxNumber || 'Not Specified'}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block mb-1">VAT Number</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {activeCustomer.vatNumber || 'Not Specified'}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block mb-1">Company Reg Number</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {activeCustomer.registrationNumber || 'Not Specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Branches Tab */}
                {activeTab === 'branches' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500">
                        Branches represent secondary locations/stores under {activeCustomer.registeredName}.
                      </p>
                      <button
                        onClick={() => handleOpenBranchModal()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Branch
                      </button>
                    </div>

                    {!activeCustomer.branches || activeCustomer.branches.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-sm">
                        <GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No branches created under this customer. Click "Add Branch" above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeCustomer.branches.map(br => (
                          <div
                            key={br.id}
                            className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 relative group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                                  {br.code}
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{br.name}</h4>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenBranchModal(br)}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBranch(br.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                              <div><strong>Address:</strong> {br.address || 'N/A'}</div>
                              <div><strong>Contact:</strong> {br.contactPerson || 'N/A'} ({br.phone || 'N/A'})</div>
                              <div><strong>Email:</strong> {br.email || 'N/A'}</div>
                              <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-x-3 text-[11px]">
                                <span><strong>Tax Reg:</strong> {br.taxNumber || 'N/A'}</span>
                                <span><strong>VAT No:</strong> {br.vatNumber || 'N/A'}</span>
                                <span><strong>Reg No:</strong> {br.registrationNumber || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500">
                        Upload contracts, tax certificates, credit applications, or ID copies.
                      </p>
                      <button
                        onClick={() => setIsDocModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Attach Document
                      </button>
                    </div>

                    {!activeCustomer.documents || activeCustomer.documents.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No documents stored for this customer.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeCustomer.documents.map(doc => (
                          <div
                            key={doc.id}
                            className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                                <File className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{doc.fileName}</h4>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Uploaded {doc.uploadDate} • {doc.fileSize}
                                </div>
                                {doc.notes && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                                    {doc.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {doc.fileDataUrl ? (
                                <a
                                  href={doc.fileDataUrl}
                                  download={doc.fileName}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                  title="Download File"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              ) : null}
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Payment History Tab */}
                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                          Total Payments Received
                        </span>
                        <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5 block">
                          {currencySymbol}
                          {customerPayments.reduce((acc, p) => acc + p.amount, 0).toFixed(2)}
                        </span>
                      </div>
                      <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-semibold border-b">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Invoice Ref</th>
                            <th className="p-2.5">Branch</th>
                            <th className="p-2.5">Method</th>
                            <th className="p-2.5">TRX Ref</th>
                            <th className="p-2.5 text-right">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {customerPayments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-slate-400">
                                No payment receipts recorded yet.
                              </td>
                            </tr>
                          ) : (
                            customerPayments.map(p => {
                              const branch = activeCustomer.branches?.find(b => b.id === p.branchId);
                              return (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="p-2.5 font-medium">{p.paymentDate}</td>
                                  <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">{p.invoiceNumber}</td>
                                  <td className="p-2.5">{branch ? branch.name : 'Main Location'}</td>
                                  <td className="p-2.5">{p.paymentMethod}</td>
                                  <td className="p-2.5 font-mono text-slate-500">{p.referenceNumber || '-'}</td>
                                  <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                    {currencySymbol}{p.amount.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. Searchable Activity History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Search Keywords</label>
                        <input
                          type="text"
                          placeholder="Doc # or description..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">From Date</label>
                        <input
                          type="date"
                          value={historyDateFrom}
                          onChange={(e) => setHistoryDateFrom(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">To Date</label>
                        <input
                          type="date"
                          value={historyDateTo}
                          onChange={(e) => setHistoryDateTo(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {filteredHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          No matching history found for date range or keyword.
                        </div>
                      ) : (
                        filteredHistory.map((item, idx) => (
                          <div key={idx} className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                item.type === 'Invoice' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                item.type === 'Payment' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                item.type === 'Quotation' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}>
                                {item.type}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 mr-2">{item.ref}</span>
                                <span className="text-slate-400">{item.desc}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.amount > 0 ? `${currencySymbol}${item.amount.toFixed(2)}` : '-'}
                              </div>
                              <div className="text-[10px] text-slate-400">{item.date}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
              Select a customer from the left directory to view profile, branches, and documents.
            </div>
          )}
        </div>
      </div>

      {/* Customer Create/Edit Modal */}
      {isCustomerModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {editingCustomer.id ? 'Edit Customer Specification' : 'Add New Customer Account'}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Customer Registered Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.registeredName || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, registeredName: e.target.value })}
                    placeholder="e.g. Horizon Hotel & Resort Corp"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unique Customer Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.code || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, code: e.target.value })}
                    placeholder="CUST-HZ01"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Trading Name + Option Checkbox */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCustomer.isTradingSameAsRegistered ?? true}
                    onChange={(e) => setEditingCustomer({
                      ...editingCustomer,
                      isTradingSameAsRegistered: e.target.checked
                    })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Trading name is same as registered name</span>
                </label>

                {!editingCustomer.isTradingSameAsRegistered && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Customer Trading Name
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.tradingName || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, tradingName: e.target.value })}
                      placeholder="e.g. Horizon Hospitality Services"
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer Physical / Billing Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  placeholder="450 Oceanfront Avenue, Miami, FL 33139"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.contactPerson || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, contactPerson: e.target.value })}
                    placeholder="David Miller"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    placeholder="accounts@customer.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Telephone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    placeholder="+1 (305) 888-4321"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Optional Fields */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Optional Identifiers
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Tax Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.taxNumber || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, taxNumber: e.target.value })}
                      placeholder="TAX-FL-9021"
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      VAT Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.vatNumber || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, vatNumber: e.target.value })}
                      placeholder="VAT-US-88123"
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Registration Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.registrationNumber || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, registrationNumber: e.target.value })}
                      placeholder="FL-CORP-44312"
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  Save Customer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Branch Modal */}
      {isBranchModalOpen && editingBranch && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-400" />
                Add Branch under {activeCustomer.registeredName}
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranchForm} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={editingBranch.name || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                    placeholder="e.g. Downtown Bay Branch"
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={editingBranch.code || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value })}
                    placeholder="HZ-MIA-01"
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Branch Physical Address *</label>
                <textarea
                  required
                  rows={2}
                  value={editingBranch.address || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  placeholder="123 Branch St, Suburb, City"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              {/* Branch Tax, VAT & Reg Numbers */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Reg No</label>
                  <input
                    type="text"
                    value={editingBranch.taxNumber || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, taxNumber: e.target.value })}
                    placeholder="e.g. 9012384920"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">VAT Ref No</label>
                  <input
                    type="text"
                    value={editingBranch.vatNumber || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, vatNumber: e.target.value })}
                    placeholder="e.g. 4012984920"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Company Reg No</label>
                  <input
                    type="text"
                    value={editingBranch.registrationNumber || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, registrationNumber: e.target.value })}
                    placeholder="e.g. 2026/000123/07"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editingBranch.contactPerson || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, contactPerson: e.target.value })}
                    placeholder="Sarah Jenkins"
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editingBranch.email || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, email: e.target.value })}
                    placeholder="bay@horizon.com"
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={editingBranch.phone || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                    placeholder="+1 305-888"
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {isDocModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                Upload Document for {activeCustomer.registeredName}
              </h3>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Document Title / Name *</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Tax Exemption Certificate 2026"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Select File (PDF / Image / Doc)</label>
                <input
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Expiry Date</label>
                <textarea
                  rows={2}
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Valid through December 2026..."
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
