import React, { useState, useMemo } from 'react';
import { Invoice, PaymentRecord, Customer, CompanySettings, ConsolidatedReportFilter, PeriodFilter } from '../types';
import {
  BarChart3, Calendar, Filter, Download, DollarSign, TrendingUp, AlertCircle,
  Building2, GitBranch, CheckCircle2, FileSpreadsheet, UserCheck, MapPin, Mail,
  Phone, ShieldCheck, ChevronLeft, ChevronRight, History, Sparkles, Clock, Layers
} from 'lucide-react';
import { generateConsolidatedReportPDF, formatCurrency } from '../utils/pdfGenerator';
import {
  getMondayOfWeek,
  getSundayOfWeek,
  toISODateString,
  getISOWeekInfo,
  formatShortDate,
  getHistoricalWeeksArchive
} from '../utils/dateUtils';

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
  const today = new Date();
  const currentMondayStr = toISODateString(getMondayOfWeek(today));

  const [filter, setFilter] = useState<ConsolidatedReportFilter>({
    period: 'weekly',
    customerId: 'all',
    branchId: 'all',
    startDate: currentMondayStr,
    endDate: toISODateString(getSundayOfWeek(today)),
    selectedWeekStart: currentMondayStr,
    searchKeyword: ''
  });

  // Calculate all historical weeks archive
  const historicalWeeks = useMemo(() => {
    return getHistoricalWeeksArchive(invoices, payments, 52);
  }, [invoices, payments]);

  // Current active Monday string for weekly navigation
  const activeMondayStr = filter.selectedWeekStart || currentMondayStr;
  const currentWeekIdx = historicalWeeks.findIndex(w => w.id === activeMondayStr);

  const selectedCustomer = customers.find(c => c.id === filter.customerId);
  const availableBranches = selectedCustomer?.branches || [];
  const selectedBranch = filter.branchId !== 'all' ? availableBranches.find(b => b.id === filter.branchId) : undefined;

  // Compute active date range and descriptive label
  const { start: startDate, end: endDate, label: periodLabel } = useMemo(() => {
    const now = new Date();
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (filter.period) {
      case 'weekly': {
        const monParts = (filter.selectedWeekStart || currentMondayStr).split('-').map(Number);
        const start = new Date(monParts[0], monParts[1] - 1, monParts[2], 0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const weekInfo = getISOWeekInfo(start);
        const isThisWeek = (filter.selectedWeekStart || currentMondayStr) === currentMondayStr;
        const label = `${isThisWeek ? 'Current ' : 'Historical '}Weekly Report: Week ${weekInfo.week} (${formatShortDate(start)} – ${formatShortDate(end)})`;
        return { start, end, label };
      }

      case 'custom_weekly': {
        const s = filter.startDate ? new Date(filter.startDate) : getMondayOfWeek(now);
        s.setHours(0, 0, 0, 0);
        let e = new Date(s);
        if (filter.endDate) {
          e = new Date(filter.endDate);
          e.setHours(23, 59, 59, 999);
        } else {
          e.setDate(s.getDate() + 6);
          e.setHours(23, 59, 59, 999);
        }
        const daySpan = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const label = `Custom Weekly Cycle: ${formatShortDate(s)} – ${formatShortDate(e)} (${daySpan} Days)`;
        return { start: s, end: e, label };
      }

      case 'monthly': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return {
          start,
          end: endToday,
          label: `Monthly Report (${now.toLocaleString('default', { month: 'long', year: 'numeric' })})`
        };
      }

      case '3month': {
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        return { start, end: endToday, label: '3-Month Quarterly Consolidated Report' };
      }

      case '6month': {
        const start = new Date();
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        return { start, end: endToday, label: '6-Month Consolidated Report' };
      }

      case 'yearly': {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return { start, end: endToday, label: `Yearly Financial Report (${now.getFullYear()})` };
      }

      case 'lifetime': {
        const start = new Date(2000, 0, 1, 0, 0, 0, 0);
        return { start, end: endToday, label: 'Lifetime Consolidated Report (All Time)' };
      }

      case 'custom': {
        const s = filter.startDate ? new Date(filter.startDate) : new Date(2000, 0, 1);
        s.setHours(0, 0, 0, 0);
        const e = filter.endDate ? new Date(filter.endDate) : endToday;
        e.setHours(23, 59, 59, 999);
        return {
          start: s,
          end: e,
          label: `Custom Date Range (${filter.startDate || 'Start'} to ${filter.endDate || 'End'})`
        };
      }
    }
  }, [filter, currentMondayStr]);

  // Navigate between historical weeks
  const handleSelectWeek = (mondayStr: string) => {
    const parts = mondayStr.split('-').map(Number);
    const m = new Date(parts[0], parts[1] - 1, parts[2]);
    const sun = new Date(m);
    sun.setDate(m.getDate() + 6);

    setFilter(prev => ({
      ...prev,
      period: 'weekly',
      selectedWeekStart: mondayStr,
      startDate: mondayStr,
      endDate: toISODateString(sun)
    }));
  };

  const handlePrevWeek = () => {
    const currentMon = filter.selectedWeekStart ? new Date(filter.selectedWeekStart) : getMondayOfWeek(new Date());
    currentMon.setDate(currentMon.getDate() - 7);
    handleSelectWeek(toISODateString(currentMon));
  };

  const handleNextWeek = () => {
    const currentMon = filter.selectedWeekStart ? new Date(filter.selectedWeekStart) : getMondayOfWeek(new Date());
    currentMon.setDate(currentMon.getDate() + 7);
    handleSelectWeek(toISODateString(currentMon));
  };

  const handleSetCustomDays = (days: number) => {
    const startStr = filter.startDate || currentMondayStr;
    const parts = startStr.split('-').map(Number);
    const startD = new Date(parts[0], parts[1] - 1, parts[2]);
    const endD = new Date(startD);
    endD.setDate(startD.getDate() + (days - 1));

    setFilter(prev => ({
      ...prev,
      period: 'custom_weekly',
      startDate: startStr,
      endDate: toISODateString(endD)
    }));
  };

  // Filtered Invoices for the consolidated report
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.issueDate);
      const dateMatch = invDate >= startDate && invDate <= endDate;

      const customerMatch = filter.customerId === 'all' || inv.customerId === filter.customerId;
      const branchMatch = filter.branchId === 'all' || inv.branchId === filter.branchId;

      const searchMatch = !filter.searchKeyword ||
        inv.invoiceNumber.toLowerCase().includes(filter.searchKeyword.toLowerCase()) ||
        (customers.find(c => c.id === inv.customerId)?.registeredName || '').toLowerCase().includes(filter.searchKeyword.toLowerCase());

      return dateMatch && customerMatch && branchMatch && searchMatch;
    });
  }, [invoices, startDate, endDate, filter.customerId, filter.branchId, filter.searchKeyword, customers]);

  // Filtered Payments for period
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const payDate = new Date(p.paymentDate);
      const dateMatch = payDate >= startDate && payDate <= endDate;
      const customerMatch = filter.customerId === 'all' || p.customerId === filter.customerId;
      const branchMatch = filter.branchId === 'all' || p.branchId === filter.branchId;

      return dateMatch && customerMatch && branchMatch;
    });
  }, [payments, startDate, endDate, filter.customerId, filter.branchId]);

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

  // Active bucket info for weekly display
  const activeBucket = historicalWeeks.find(w => w.id === activeMondayStr);

  return (
    <div className="space-y-6">
      
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="p-1.5 bg-yellow-400 text-black rounded-lg shadow-sm">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            Consolidated Accounting & Weekly Reports
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            Generate current, historical, and custom weekly accounting reports with full ledger breakdowns and zero data loss.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-lg text-sm border border-yellow-500 shadow-sm transition"
        >
          <Download className="w-4 h-4 stroke-[3]" />
          Export Consolidated Report PDF
        </button>
      </div>

      {/* Primary Report Scope & Filter Control Console */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-500" />
            Report Period & Scope Selector
          </div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
            {periodLabel}
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => {
              setFilter(prev => ({
                ...prev,
                period: 'weekly',
                selectedWeekStart: currentMondayStr,
                startDate: currentMondayStr,
                endDate: toISODateString(getSundayOfWeek(today))
              }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
              filter.period === 'weekly'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Reports (Current & Archive)</span>
          </button>

          <button
            onClick={() => {
              setFilter(prev => ({
                ...prev,
                period: 'custom_weekly',
                startDate: currentMondayStr,
                endDate: toISODateString(getSundayOfWeek(today))
              }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
              filter.period === 'custom_weekly'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom Weekly / Rolling Days</span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, period: 'monthly' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              filter.period === 'monthly'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            Monthly
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, period: '3month' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              filter.period === '3month'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            Quarterly (3 Mo)
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, period: '6month' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              filter.period === '6month'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            Half-Yearly (6 Mo)
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, period: 'yearly' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              filter.period === 'yearly'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            Yearly
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, period: 'lifetime' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              filter.period === 'lifetime'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            Lifetime (All)
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, period: 'custom' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              filter.period === 'custom'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* ----------------- DEDICATED WEEKLY NAVIGATION CONSOLE (MODE 1: WEEKLY) ----------------- */}
        {filter.period === 'weekly' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-yellow-500/30 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Stepper Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevWeek}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold transition shadow-xs"
                  title="Go to previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev Week</span>
                </button>

                <button
                  onClick={() => handleSelectWeek(currentMondayStr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition border ${
                    activeMondayStr === currentMondayStr
                      ? 'bg-yellow-400 text-black border-yellow-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Current Week
                </button>

                <button
                  onClick={handleNextWeek}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold transition shadow-xs"
                  title="Go to next week"
                >
                  <span>Next Week</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Historical Archive Dropdown Selector */}
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <History className="w-4 h-4 text-yellow-600 shrink-0" />
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                    Jump to Any Historical / Past Week Archive:
                  </label>
                  <select
                    value={activeMondayStr}
                    onChange={(e) => handleSelectWeek(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-yellow-400 outline-none"
                  >
                    {historicalWeeks.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.isCurrentWeek ? '★ Current Week: ' : ''}{w.label} {w.invoiceCount > 0 ? `• ${w.invoiceCount} Invoices (R ${w.totalInvoiced.toFixed(2)})` : '• 0 Invoices'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Quick Week Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Select:</span>
              {historicalWeeks.slice(0, 5).map((w, idx) => {
                const isSelected = activeMondayStr === w.id;
                const titles = ['Current Week', 'Last Week', '2 Wks Ago', '3 Wks Ago', '4 Wks Ago'];
                return (
                  <button
                    key={w.id}
                    onClick={() => handleSelectWeek(w.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-black text-yellow-400 border-black shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-yellow-400'
                    }`}
                  >
                    <span>{titles[idx] || `Week ${w.weekNumber}`}</span>
                    {w.invoiceCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                        isSelected ? 'bg-yellow-400 text-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}>
                        {w.invoiceCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Jump via date picker */}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[11px] text-slate-500">Pick any date:</span>
                <input
                  type="date"
                  value={activeMondayStr}
                  onChange={(e) => {
                    if (e.target.value) {
                      const mon = getMondayOfWeek(new Date(e.target.value));
                      handleSelectWeek(toISODateString(mon));
                    }
                  }}
                  className="px-2 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Active Selected Week Details Ribbon */}
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-400/40 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Active Range: {formatShortDate(startDate)} to {formatShortDate(endDate)} (Monday to Sunday)
                </span>
                {activeBucket?.isCurrentWeek && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">
                    Current Live Week
                  </span>
                )}
              </div>
              <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                Found <strong>{filteredInvoices.length}</strong> invoices & <strong>{filteredPayments.length}</strong> payment receipts
              </div>
            </div>
          </div>
        )}

        {/* ----------------- CUSTOM WEEKLY / ROLLING CYCLE (MODE 2: CUSTOM_WEEKLY) ----------------- */}
        {filter.period === 'custom_weekly' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-yellow-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  Custom Weekly & Rolling N-Day Cycle Configurator
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select any starting date and choose a standard 7-day, 14-day, 21-day, 28-day cycle, or any custom interval.
                </p>
              </div>

              {/* Preset Cycle Duration Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">Preset Cycles:</span>
                <button
                  onClick={() => handleSetCustomDays(7)}
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-extrabold shadow-xs transition"
                >
                  7 Days (1 Wk)
                </button>
                <button
                  onClick={() => handleSetCustomDays(14)}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-bold transition"
                >
                  14 Days (2 Wks)
                </button>
                <button
                  onClick={() => handleSetCustomDays(21)}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-bold transition"
                >
                  21 Days (3 Wks)
                </button>
                <button
                  onClick={() => handleSetCustomDays(28)}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-bold transition"
                >
                  28 Days (4 Wks)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date (Beginning of Cycle) *
                </label>
                <input
                  type="date"
                  value={filter.startDate || currentMondayStr}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const parts = newStart.split('-').map(Number);
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    const endD = new Date(d);
                    endD.setDate(d.getDate() + 6);
                    setFilter(prev => ({
                      ...prev,
                      startDate: newStart,
                      endDate: toISODateString(endD)
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-yellow-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  End Date (End of Cycle) *
                </label>
                <input
                  type="date"
                  value={filter.endDate || toISODateString(getSundayOfWeek(today))}
                  onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-yellow-400 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ----------------- CUSTOM DATE RANGE (MODE: CUSTOM) ----------------- */}
        {filter.period === 'custom' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filter.startDate || ''}
                  onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={filter.endDate || ''}
                  onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Customer, Branch, and Search Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Customer Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Filter Customer *
            </label>
            <select
              value={filter.customerId}
              onChange={(e) => setFilter({ ...filter, customerId: e.target.value, branchId: 'all' })}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Filter Branch *
            </label>
            <select
              value={filter.branchId}
              onChange={(e) => setFilter({ ...filter, branchId: e.target.value })}
              disabled={filter.customerId === 'all'}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 disabled:opacity-50"
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Keyword / Search Ref
            </label>
            <input
              type="text"
              placeholder="Ref # or customer name..."
              value={filter.searchKeyword}
              onChange={(e) => setFilter({ ...filter, searchKeyword: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
            />
          </div>

        </div>

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

        <div className={`grid grid-cols-1 ${selectedBranch ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 text-xs`}>
          
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

          {/* Branch Card (Only rendered if a specific branch is selected) */}
          {selectedBranch && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
                <GitBranch className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Branch Location Details</span>
              </div>
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
            </div>
          )}

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
