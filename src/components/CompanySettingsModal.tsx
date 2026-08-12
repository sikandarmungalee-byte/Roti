import React, { useState, useRef } from 'react';
import { CompanySettings } from '../types';
import { Building2, X, Save, Image, CreditCard, Database, Download, Upload, CheckCircle2, HardDrive } from 'lucide-react';
import { exportDatabaseJSON, importDatabaseJSON } from '../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  onSave: (updated: CompanySettings) => void;
}

export const CompanySettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setImportStatus('Database successfully imported! Reloading page...');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setImportStatus('Failed to import database file. Please check file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl my-2 sm:my-8 overflow-hidden max-h-[96vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-black text-white border-b border-yellow-500/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400 rounded-lg text-black font-extrabold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Company Profile & SARS Settings</h2>
              <p className="text-xs text-yellow-400/90 font-medium">Configure SA tax numbers, banking details, & official document defaults</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-yellow-400/50 pb-1 flex items-center justify-between">
              <span>Business Identity (South Africa)</span>
              <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-mono font-bold">ZAR</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Registered Company Name (Pty Ltd / CC) *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="Roti Bros (Pty) Ltd"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Trading Name / Brand
                </label>
                <input
                  type="text"
                  name="tradingName"
                  value={formData.tradingName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="Roti Bros"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="accounts@company.co.za"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Telephone Number *
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="+27 11 884 9000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Physical / Billing Address (South Africa) *
              </label>
              <textarea
                name="address"
                required
                rows={2}
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                placeholder="Suite 500, Sandton City Office Tower, Sandton, Johannesburg, Gauteng 2196"
              />
            </div>
          </div>

          {/* Tax & Registration Numbers */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-yellow-400/50 pb-1">
              SARS Tax & CIPC Registration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  SARS Income Tax Ref No.
                </label>
                <input
                  type="text"
                  name="taxNumber"
                  value={formData.taxNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-mono"
                  placeholder="9012384920"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  SARS VAT Registration No.
                </label>
                <input
                  type="text"
                  name="vatNumber"
                  value={formData.vatNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-mono"
                  placeholder="4012984920"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  CIPC Reg No. (e.g., 2021/123456/07)
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-mono"
                  placeholder="2021/489210/07"
                />
              </div>
            </div>
          </div>

          {/* Banking Instructions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-yellow-400/50 pb-1">
              <CreditCard className="w-4 h-4 text-slate-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                South Africa Banking Details (Printed on Invoices)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Bank Name (e.g. FNB, Standard Bank, Absa, Nedbank)
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="First National Bank (FNB)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="Roti Bros (Pty) Ltd"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-mono"
                  placeholder="62849103829"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Branch Code / Universal Code
                </label>
                <input
                  type="text"
                  name="branchCode"
                  value={formData.branchCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-mono"
                  placeholder="250655"
                />
              </div>
            </div>
          </div>

          {/* Terms & Currency */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-yellow-400/50 pb-1">
              Document Defaults
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  name="currencySymbol"
                  value={formData.currencySymbol}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-bold text-center"
                  placeholder="R"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Default Payment Terms & Notes
                </label>
                <input
                  type="text"
                  name="defaultTerms"
                  value={formData.defaultTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="Payment due within 30 days of Tax Invoice date in Rand..."
                />
              </div>
            </div>
          </div>

          {/* Firebase Cloud Database & Backup */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Firebase Cloud Database (Live Cloud Sync)
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cloud Active
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your database is connected to <strong>Firebase Cloud Database (Firestore)</strong>. All products, customers, invoices, and settings automatically synchronize live across sessions and devices so your data is never lost.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportDatabaseJSON()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-slate-900 text-yellow-400 rounded-lg text-xs font-bold transition border border-yellow-500/30 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-yellow-400" />
                  Backup Local Database (.json)
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition border border-slate-300 dark:border-slate-600 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Restore Database Backup
                </button>
              </div>

              {importStatus && (
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                  {importStatus}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-500 rounded-lg shadow-sm border border-yellow-500 transition"
            >
              <Save className="w-4 h-4" />
              Save Company Profile
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
