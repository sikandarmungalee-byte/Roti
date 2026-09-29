import React, { useState, useRef, useEffect } from 'react';
import { CompanySettings } from '../types';
import { FileText, FileCode, Truck, Package, Users, BarChart3, Building2, Menu, X, ShieldCheck, Plus, Sparkles, ChevronRight, Database, Lock, MessageSquare, Send, UserPlus, Cloud, LogOut, CheckCircle, RefreshCw, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'invoices' | 'quotations' | 'deliveryNotes' | 'products' | 'customers' | 'reports' | 'communications';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  companySettings: CompanySettings;
  onOpenCompanySettings: () => void;
  onOpenDatabaseExplorer?: () => void;
  onOpenCreateInvoice?: () => void;
  onOpenCreateQuotation?: () => void;
  onOpenCreateProduct?: () => void;
  onOpenCreateCustomer?: () => void;
  onOpenComposeEmail?: () => void;
  onOpenCreateLead?: () => void;
  unreadEmailCount?: number;
  onLockApp?: () => void;
}

export const Navigation: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  companySettings,
  onOpenCompanySettings,
  onOpenDatabaseExplorer,
  onOpenCreateInvoice,
  onOpenCreateQuotation,
  onOpenCreateProduct,
  onOpenCreateCustomer,
  onOpenComposeEmail,
  onOpenCreateLead,
  unreadEmailCount = 0,
  onLockApp
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickActionModalOpen, setQuickActionModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { currentUser, syncState, signInWithGoogle, signOutUser, isLoading } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'quotations', label: 'Quotations', icon: FileCode },
    { id: 'deliveryNotes', label: 'Delivery Notes', icon: Truck },
    { id: 'products', label: 'Product Catalog', icon: Package },
    { id: 'customers', label: 'Customers & Branches', icon: Users },
    { id: 'communications', label: 'Communication & Leads', icon: MessageSquare, badgeCount: unreadEmailCount },
    { id: 'reports', label: 'Consolidated Reports', icon: BarChart3 }
  ];

  const quickActions = [
    {
      title: 'Compose & Send Email',
      subtitle: 'Dispatch email message or follow-up with quotation/invoice',
      icon: Send,
      badge: 'Mail',
      action: () => {
        onSelectTab('communications');
        onOpenComposeEmail?.();
      }
    },
    {
      title: 'Capture Sales Lead',
      subtitle: 'Register new wholesale inquiry, prospective customer or lead',
      icon: UserPlus,
      badge: 'Lead',
      action: () => {
        onSelectTab('communications');
        onOpenCreateLead?.();
      }
    },
    {
      title: 'Database Explorer (All Records)',
      subtitle: 'View, search, inspect raw JSON & manage all database records',
      icon: Database,
      badge: 'Database',
      action: () => {
        onOpenDatabaseExplorer?.();
      }
    },
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
            <nav className="hidden xl:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id as NavTab)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all relative ${
                      isActive
                        ? 'bg-yellow-400 text-black shadow-md'
                        : 'text-slate-300 hover:text-yellow-400 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {Boolean(item.badgeCount && item.badgeCount > 0) && (
                      <span className="text-[10px] bg-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                        {item.badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Action: Quick Action & Company Settings Button */}
            <div className="hidden md:flex items-center gap-2">
              {/* Cloud Sync Status Indicator */}
              {currentUser ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-medium text-slate-300">
                  {syncState === 'synced' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 font-bold">Cloud Synced</span>
                    </>
                  ) : syncState === 'syncing' ? (
                    <>
                      <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
                      <span className="text-yellow-400 font-bold">Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>Offline Cache</span>
                    </>
                  )}
                </div>
              ) : null}

              <button
                onClick={onOpenDatabaseExplorer}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-black border border-emerald-500/50 shadow-sm transition"
                title="Open Live Database Explorer to view, search, and inspect all records"
              >
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Database</span>
              </button>

              <button
                onClick={() => setQuickActionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-black shadow-md border border-yellow-500 transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Action</span>
              </button>

              <button
                onClick={onOpenCompanySettings}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-yellow-500/40 hover:border-yellow-400 transition"
              >
                <Building2 className="w-4 h-4 text-yellow-400" />
                Profile
              </button>

              {/* User Account / Sign In */}
              {currentUser ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                  >
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center font-black text-[10px]">
                        {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                      </div>
                    )}
                    <span className="font-bold text-slate-200 max-w-[100px] truncate">
                      {currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in text-xs space-y-3">
                      <div className="border-b border-slate-800 pb-2.5">
                        <p className="font-bold text-white truncate">{currentUser.displayName || 'Google Account'}</p>
                        <p className="text-slate-400 text-[11px] truncate">{currentUser.email}</p>
                        <p className="text-[10px] text-emerald-400 font-mono mt-1">UID: {currentUser.uid.slice(0, 12)}...</p>
                      </div>

                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenDatabaseExplorer?.();
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                        >
                          <Database className="w-4 h-4 text-emerald-400" />
                          <span>View Cloud Documents</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-800 pt-2">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            signOutUser();
                          }}
                          className="w-full flex items-center gap-2 p-2 text-rose-400 hover:bg-rose-950/40 rounded-lg font-bold transition"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sign In</span>
                </button>
              )}

              {onLockApp && (
                <button
                  onClick={onLockApp}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-950/70 hover:bg-red-900 text-red-300 rounded-lg text-xs font-bold border border-red-500/40 hover:border-red-400 transition cursor-pointer"
                  title="Lock application access with PIN"
                >
                  <Lock className="w-3.5 h-3.5 text-red-400" />
                  <span>Lock</span>
                </button>
              )}
            </div>

            {/* Mobile Actions: Quick Action + Menu Toggle */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={onOpenDatabaseExplorer}
                className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-950/80 rounded-lg border border-emerald-500/40"
                title="Database Explorer"
              >
                <Database className="w-4 h-4" />
              </button>

              <button
                onClick={() => setQuickActionModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-extrabold border border-yellow-500 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Action</span>
              </button>

              {onLockApp && (
                <button
                  onClick={onLockApp}
                  className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/70 rounded-lg border border-red-500/30"
                  title="Lock Application Access"
                >
                  <Lock className="w-4 h-4 text-red-400" />
                </button>
              )}

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
          <div className="lg:hidden border-t border-yellow-500/20 bg-black px-4 pt-2 pb-4 space-y-2 shadow-2xl">
            {/* User Profile in Mobile Drawer */}
            {currentUser ? (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center font-black text-xs">
                      {currentUser.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white text-xs truncate">{currentUser.displayName || currentUser.email}</p>
                    <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Cloud Account
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOutUser();
                    setMobileMenuOpen(false);
                  }}
                  className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg text-xs font-bold"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  signInWithGoogle();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white text-slate-900 rounded-xl text-xs font-black shadow-lg"
              >
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>Sign in with Google to Sync Data</span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenDatabaseExplorer?.();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 mb-2"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-emerald-400" />
                <span>Database Explorer (All Records)</span>
              </div>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-mono">Live</span>
            </button>

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
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition ${
                    isActive
                      ? 'bg-yellow-400 text-black'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-yellow-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {Boolean(item.badgeCount && item.badgeCount > 0) && (
                    <span className="text-[10px] bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full">
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}

            {onLockApp && (
              <button
                onClick={() => {
                  onLockApp();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold bg-red-950/70 border border-red-500/40 text-red-300 mt-3 transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-red-400" />
                  <span>Lock System Access</span>
                </div>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-mono">PIN</span>
              </button>
            )}
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

