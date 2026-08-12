import React, { useState } from 'react';
import { CompanySettings } from '../types';
import { FileText, FileCode, Truck, Package, Users, BarChart3, Building2, Menu, X, ShieldCheck, Plus, Sparkles, ChevronRight, Database } from 'lucide-react';

export type NavTab = 'invoices' | 'quotations' | 'deliveryNotes' | 'products' | 'customers' | 'reports';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  companySettings: CompanySettings;
  onOpenCompanySettings: () => void;
  onOpenCreateInvoice?: () => void;
  onOpenCreateQuotation?: () => void;
  onOpenCreateProduct?: () => void;
  onOpenCreateCustomer?: () => void;
}

export const Navigation: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  companySettings,
  onOpenCompanySettings,
  onOpenCreateInvoice,
  onOpenCreateQuotation,
  onOpenCreateProduct,
  onOpenCreateCustomer
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickActionModalOpen, setQuickActionModalOpen] = useState(false);

  const navItems = [
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'quotations', label: 'Quotations', icon: FileCode },
    { id: 'deliveryNotes', label: 'Delivery Notes', icon: Truck },
    { id: 'products', label: 'Product Catalog', icon: Package },
    { id: 'customers', label: 'Customers & Branches', icon: Users },
    { id: 'reports', label: 'Consolidated Reports', icon: BarChart3 }
  ];

  const quickActions = [
    {
      title: 'Create Tax Invoice',
      subtitle: 'Generate tax invoice & delivery note simultaneously',
      icon: FileText,
      badge: 'Invoice',
      action: () => {
        onSelectTab('invoices');
        onOpenCreateInvoice?.();
      }
    },
    {
      title: 'Create Price Quotation',
      subtitle: 'Issue formal quote with item breakdown',
      icon: FileCode,
      badge: 'Quote',
      action: () => {
        onSelectTab('quotations');
        onOpenCreateQuotation?.();
      }
    },
    {
      title: 'Add Catalog Product',
      subtitle: 'Add new item with pack quantity & pricing',
      icon: Package,
      badge: 'Product',
      action: () => {
        onSelectTab('products');
        onOpenCreateProduct?.();
      }
    },
    {
      title: 'Add Customer & Branch',
      subtitle: 'Register new client profile & location',
      icon: Users,
      badge: 'Customer',
      action: () => {
        onSelectTab('customers');
        onOpenCreateCustomer?.();
      }
    },
    {
      title: 'Consolidated Financial Reports',
      subtitle: 'View & export PDF monthly/yearly revenue statements',
      icon: BarChart3,
      badge: 'Reports',
      action: () => {
        onSelectTab('reports');
      }
    }
  ];

  return (
    <>
      <header className="bg-black text-white sticky top-0 z-40 shadow-lg border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Logo & Brand Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-yellow-400 text-black rounded-xl shadow-md font-black text-lg flex-shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div className="truncate">
                <h1 className="font-extrabold text-sm sm:text-lg text-white leading-tight flex items-center gap-1.5 truncate">
                  <span className="truncate">{companySettings.tradingName || companySettings.name || 'Roti Bros'}</span>
                  <span className="text-[10px] bg-yellow-400 text-black font-extrabold px-1.5 py-0.5 rounded-xs tracking-wider flex-shrink-0">ZA</span>
                </h1>
                <p className="text-[9px] sm:text-[10px] text-yellow-400/90 font-mono tracking-wider uppercase font-semibold truncate">
                  South Africa Invoicing & Dispatch
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden lg:flex items-center space-x-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id as NavTab)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-yellow-400 text-black shadow-md'
                        : 'text-slate-300 hover:text-yellow-400 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Action: Quick Action & Company Settings Button */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={onOpenCompanySettings}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-500/40 transition"
                title="Your database is synchronized live with Firebase Cloud Database."
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cloud DB (Synced)</span>
              </button>

              <button
                onClick={() => setQuickActionModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-black shadow-md border border-yellow-500 transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Quick Action</span>
              </button>

              <button
                onClick={onOpenCompanySettings}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-yellow-500/40 hover:border-yellow-400 transition"
              >
                <Building2 className="w-4 h-4 text-yellow-400" />
                Company Profile
              </button>
            </div>

            {/* Mobile Actions: Quick Action + Menu Toggle */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={() => setQuickActionModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-extrabold border border-yellow-500 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Action</span>
              </button>

              <button
                onClick={onOpenCompanySettings}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-900 rounded-lg border border-yellow-500/30"
                title="Company Settings"
              >
                <Building2 className="w-4 h-4 text-yellow-400" />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-yellow-400" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-yellow-500/20 bg-black px-4 pt-2 pb-4 space-y-1 shadow-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id as NavTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition ${
                    isActive
                      ? 'bg-yellow-400 text-black'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-yellow-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-5 right-5 z-40 md:hidden">
        <button
          onClick={() => setQuickActionModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold rounded-full shadow-2xl border-2 border-black active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span className="text-xs tracking-wide uppercase">Quick Action</span>
        </button>
      </div>

      {/* Quick Action Modal */}
      {quickActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            
            {/* Modal Header */}
            <div className="bg-black text-white p-4 sm:p-5 flex items-center justify-between border-b border-yellow-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-yellow-400 text-black rounded-lg">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Quick Actions Console</h3>
                  <p className="text-xs text-yellow-400 font-medium">Select an operation to perform instantly</p>
                </div>
              </div>
              <button
                onClick={() => setQuickActionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {quickActions.map((act, idx) => {
                const Icon = act.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuickActionModalOpen(false);
                      act.action();
                    }}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-yellow-50 border border-slate-200 hover:border-yellow-400 rounded-xl transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-black text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black rounded-lg transition-colors">
                        <Icon className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-black flex items-center gap-2">
                          {act.title}
                          <span className="text-[10px] bg-slate-200 group-hover:bg-yellow-200 text-slate-700 font-extrabold px-1.5 py-0.5 rounded-xs uppercase">
                            {act.badge}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">{act.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 text-center">
              <button
                onClick={() => setQuickActionModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

