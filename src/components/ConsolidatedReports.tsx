import React, { useState } from 'react';
import { Invoice, PaymentRecord, Customer, CompanySettings, ConsolidatedReportFilter, PeriodFilter } from '../types';
import { BarChart3, Calendar, Filter, Download, DollarSign, TrendingUp, AlertCircle, Building2, GitBranch, CheckCircle2, FileSpreadsheet, UserCheck, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';
import { generateConsolidatedReportPDF, formatCurrency } from '../utils/pdfGenerator';

interface Props {
  invoices: Invoice[];
  payments: PaymentRecord[];
  customers: Customer[];
  companySettings: CompanySettings;
}

export const ConsolidatedReports: React.FC<Props> = ({
  invoices,
  payments,
  customers,
  companySettings
}) => {
  const [filter, setFilter] = useState<ConsolidatedReportFilter>({
    period: 'monthly',
    customerId: 'all',
    branchId: 'all',
    startDate: '',
    endDate: '',
    searchKeyword: ''
  });

  const selectedCustomer = customers.find(c => c.id === filter.customerId);
  const availableBranches = selectedCustomer?.branches || [];
  const selectedBranch = filter.branchId !== 'all' ? availableBranches.find(b => b.id === filter.branchId) : undefined;

  // Date filtering logic based on period
  const getPeriodDateRange = (period: PeriodFilter): { start: Date; end: Date; label: string } => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start = new Date();

    switch (period) {
      case 'weekly': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        return { start, end, label: 'Weekly Consolidated Report' };
      }
      case 'monthly': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end, label: `Monthly Report (${now.toLocaleString('default', { month: 'long', year: 'numeric' })})` };
      }
      case '3month': {
        start = new Date();
        start.setMonth(start.getMonth() - 3);
        return { start, end, label: '3-Month Quarterly Consolidated Report' };
      }
      case '6month': {
        start = new Date();
        start.setMonth(start.getMonth() - 6);
        return { start, end, label: '6-Month Consolidated Report' };
      }
      case 'yearly': {
        start = new Date(now.getFullYear(), 0, 1);
        return { start, end, label: `Yearly Financial Report (${now.getFullYear()})` };
      }
      case 'lifetime': {
        start = new Date(2000, 0, 1);
        return { start, end, label: 'Lifetime Consolidated Report (All Time)' };
      }
      case 'custom': {
        const s = filter.startDate ? new Date(filter.startDate) : new Date(2000, 0, 1);
        const e = filter.endDate ? new Date(filter.endDate) : end;
        return { start: s, end: e, label: `Custom Range (${filter.startDate || 'Start'} to ${filter.endDate || 'End'})` };
      }
    }
  };

  const { start: startDate, end: endDate, label: periodLabel } = getPeriodDateRange(filter.period);

  // Filtered Invoices for the consolidated report
  const filteredInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.issueDate);
    const dateMatch = invDate >= startDate && invDate <= endDate;

    const customerMatch = filter.customerId === 'all' || inv.customerId === filter.customerId;
    const branchMatch = filter.branchId === 'all' || inv.branchId === filter.branchId;

    const searchMatch = !filter.searchKeyword ||
      inv.invoiceNumber.toLowerCase().includes(filter.searchKeyword.toLowerCase()) ||
      (customers.find(c => c.id === inv.customerId)?.registeredName || '').toLowerCase().includes(filter.searchKeyword.toLowerCase());

    return dateMatch && customerMatch && branchMatch && searchMatch;
  });

  // Filtered Payments for period
  const filteredPayments = payments.filter(p => {
    const payDate = new Date(p.paymentDate);
    const dateMatch = payDate >= startDate && payDate <= endDate;
    const customerMatch = filter.customerId === 'all' || p.customerId === filter.customerId;
    const branchMatch = filter.branchId === 'all' || p.branchId === filter.branchId;

    return dateMatch && customerMatch && branchMatch;
  });

  // Aggregated Report Metrics
  const totalInvoiced = filteredInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = filteredInvoices.reduce((acc, i) => acc + i.amountPaid, 0);
  const totalOutstanding = filteredInvoices.reduce((acc, i) => acc + i.balanceDue, 0);
  const paidCount = filteredInvoices.filter(i => i.status === 'Paid').length;
  const totalCount = filteredInvoices.length;

  const handleExportPDF = () => {
    generateConsolidatedReportPDF(
      filter,
      filteredInvoices,
      filteredPayments,
      customers,
      companySettings,
      periodLabel
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-400 text-black rounded-lg">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            Consolidated Accounting & Branch Reports
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Consolidated weekly, monthly, 3-month, 6-month, yearly, and lifetime financial reports per customer and per branch.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold rounded-lg text-sm border border-yellow-500 shadow-sm transition"
        >
          <Download className="w-4 h-4 stroke-[3]" />
          Export Consolidated Report PDF
        </button>
      </div>

      {/* Filter Control Console */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">
          <Filter className="w-4 h-4 text-blue-500" /> Report Period & Scope Selector
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Period Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Time Horizon Period *
            </label>
            <select
              value={filter.period}
              onChange={(e) => setFilter({ ...filter, period: e.target.value as PeriodFilter })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-semibold text-blue-600 dark:text-blue-400"
            >
              <option value="weekly">Weekly Report (Current Week)</option>
              <option value="monthly">Monthly Report (Current Month)</option>
              <option value="3month">3-Month Report (Quarterly)</option>
              <option value="6month">6-Month Report (Half-Yearly)</option>
              <option value="yearly">Yearly Report (Annual)</option>
              <option value="lifetime">Lifetime Consolidated (All Time)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Filter Customer *
            </label>
            <select
              value={filter.customerId}
              onChange={(e) => setFilter({ ...filter, customerId: e.target.value, branchId: 'all' })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-medium"
            >
              <option value="all">All Customers Consolidated</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.registeredName} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Filter Branch *
            </label>
            <select
              value={filter.branchId}
              onChange={(e) => setFilter({ ...filter, branchId: e.target.value })}
              disabled={filter.customerId === 'all'}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-medium disabled:opacity-50"
            >
              <option value="all">All Branches Consolidated</option>
              {availableBranches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search Keyword */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keyword / Search Ref
            </label>
            <input
              type="text"
              placeholder="Ref # or customer name..."
              value={filter.searchKeyword}
              onChange={(e) => setFilter({ ...filter, searchKeyword: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
            />
          </div>

        </div>

        {/* Custom Date Inputs if selected */}
        {filter.period === 'custom' && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <label className="block text-xs font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Date</label>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Entity Audit Panel (Company Details, Customer Details, Branch Details) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            Report Letterhead & Entity Context Details
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Audit Ready • Scope: {periodLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Company Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
              <Building2 className="w-4 h-4 text-yellow-500 shrink-0" />
              <span>Issuing Company Details</span>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm">{companySettings.name}</p>
              {companySettings.tradingName && companySettings.tradingName !== companySettings.name && (
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">T/A: {companySettings.tradingName}</p>
              )}
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
              <p><span className="font-semibold">Reg No:</span> {companySettings.registrationNumber || 'N/A'}</p>
              <p><span className="font-semibold">Tax No:</span> {companySettings.taxNumber || 'N/A'} | <span className="font-semibold">VAT No:</span> {companySettings.vatNumber || 'N/A'}</p>
              <p className="flex items-start gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" /> <span>{companySettings.address || 'Address not configured'}</span></p>
              <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400 shrink-0" /> <span>{companySettings.phone || 'N/A'}</span></p>
              <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400 shrink-0" /> <span>{companySettings.email || 'N/A'}</span></p>
              {companySettings.bankName && (
                <p className="pt-1 text-[10px] text-slate-500 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold">Bank:</span> {companySettings.bankName} ({companySettings.accountNumber})
                </p>
              )}
            </div>
          </div>

          {/* Customer Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
              <UserCheck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Customer Account Details</span>
            </div>
            {selectedCustomer ? (
              <>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedCustomer.registeredName}</p>
                  <p className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">Code: {selectedCustomer.code}</p>
                  {selectedCustomer.tradingName && selectedCustomer.tradingName !== selectedCustomer.registeredName && (
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">T/A: {selectedCustomer.tradingName}</p>
                  )}
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  <p><span className="font-semibold">Reg No:</span> {selectedCustomer.registrationNumber || 'N/A'}</p>
                  <p><span className="font-semibold">Tax ID:</span> {selectedCustomer.taxNumber || 'N/A'} | <span className="font-semibold">VAT ID:</span> {selectedCustomer.vatNumber || 'N/A'}</p>
                  <p className="flex items-start gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" /> <span>{selectedCustomer.address || 'No address registered'}</span></p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400 shrink-0" /> <span>{selectedCustomer.contactPerson} ({selectedCustomer.phone})</span></p>
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400 shrink-0" /> <span>{selectedCustomer.email}</span></p>
                </div>
              </>
            ) : (
              <div className="py-3 space-y-1 text-slate-500 dark:text-slate-400">
                <p className="font-bold text-slate-800 dark:text-slate-200">ALL REGISTERED CUSTOMERS</p>
                <p className="text-[11px]">Consolidated report across all <span className="font-bold text-blue-600">{customers.length} customer accounts</span> in catalog.</p>
                <p className="text-[10px] text-slate-400 italic">Select a specific customer in filters above to view detailed account audit info.</p>
              </div>
            )}
          </div>

          {/* Branch Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
              <GitBranch className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Branch Location Details</span>
            </div>
            {selectedBranch ? (
              <>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedBranch.name}</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">Branch Code: {selectedBranch.code}</p>
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  <p><span className="font-semibold">Branch Reg No:</span> {selectedBranch.registrationNumber || 'N/A'}</p>
                  <p><span className="font-semibold">Tax ID:</span> {selectedBranch.taxNumber || 'N/A'} | <span className="font-semibold">VAT ID:</span> {selectedBranch.vatNumber || 'N/A'}</p>
                  <p className="flex items-start gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" /> <span>{selectedBranch.address || 'Location address N/A'}</span></p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400 shrink-0" /> <span>{selectedBranch.contactPerson} ({selectedBranch.phone})</span></p>
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400 shrink-0" /> <span>{selectedBranch.email}</span></p>
                </div>
              </>
            ) : selectedCustomer ? (
              <div className="py-3 space-y-1 text-slate-500 dark:text-slate-400">
                <p className="font-bold text-slate-800 dark:text-slate-200">ALL BRANCHES ({selectedCustomer.branches.length})</p>
                <p className="text-[11px]">Consolidated across all registered branches for <span className="font-bold text-slate-700 dark:text-slate-200">{selectedCustomer.registeredName}</span>.</p>
                <p className="text-[10px] text-slate-400 italic">Select a specific branch above to isolate branch report details.</p>
              </div>
            ) : (
              <div className="py-3 space-y-1 text-slate-500 dark:text-slate-400">
                <p className="font-bold text-slate-800 dark:text-slate-200">ALL SYSTEM BRANCHES</p>
                <p className="text-[11px]">Consolidated report including all client branch locations nationwide.</p>
                <p className="text-[10px] text-slate-400 italic">Select a customer and branch to view detailed location breakdown.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Report Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Invoiced */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Invoiced</span>
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {formatCurrency(totalInvoiced, companySettings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {totalCount} total invoices in period</p>
        </div>

        {/* Total Collected */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-500">Total Collected</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(totalCollected, companySettings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{paidCount} fully settled invoices</p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-rose-500">Outstanding Balance</span>
            <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {formatCurrency(totalOutstanding, companySettings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending customer settlement</p>
        </div>

        {/* Settlement Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-purple-500">Settlement Ratio</span>
            <div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {totalInvoiced > 0 ? `${((totalCollected / totalInvoiced) * 100).toFixed(1)}%` : '0.0%'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Collection efficiency</p>
        </div>

      </div>

      {/* Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            Invoices & Revenue Breakdown for {periodLabel}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {filteredInvoices.length} Invoices Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Invoiced Amount</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No transactions recorded for the selected period and customer filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const cust = customers.find(c => c.id === inv.customerId);
                  const branch = cust?.branches.find(b => b.id === inv.branchId);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{inv.issueDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {cust ? cust.registeredName : 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {branch ? branch.name : 'Main Location'}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                          inv.status === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inv.totalAmount, companySettings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {formatCurrency(inv.amountPaid, companySettings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {formatCurrency(inv.balanceDue, companySettings.currencySymbol)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
