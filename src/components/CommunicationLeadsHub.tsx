import React, { useState, useMemo } from 'react';
import {
  Lead,
  LeadStatus,
  LeadSource,
  LeadPriority,
  CommunicationEmail,
  EmailFolder,
  EmailStatus,
  CompanySettings,
  Customer,
  Quotation,
  Invoice
} from '../types';
import {
  Mail, Send, Inbox, MessageSquare, Plus, Search, Filter, Trash2, Star,
  CheckCircle2, Clock, Phone, ExternalLink, ArrowRight, ArrowLeft, UserPlus,
  Building, DollarSign, Tag, RefreshCw, FileText, FileCode, Check,
  AlertCircle, Sparkles, ChevronRight, X, Reply, Forward, Copy, Eye,
  LayoutGrid, List, UserCheck, Calendar, Paperclip, MessageCircle
} from 'lucide-react';

interface Props {
  leads: Lead[];
  communications: CommunicationEmail[];
  customers: Customer[];
  companySettings: CompanySettings;
  quotations: Quotation[];
  invoices: Invoice[];
  onSaveLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onSaveCommunication: (comm: CommunicationEmail) => void;
  onDeleteCommunication: (id: string) => void;
  onConvertToCustomer: (lead: Lead) => void;
  onOpenCreateQuotationForLead?: (lead: Lead) => void;
  onShowToast: (msg: string) => void;
  autoOpenCompose?: boolean;
  autoOpenLead?: boolean;
}

const LEAD_STAGES: { id: LeadStatus; label: string; color: string; border: string; bg: string }[] = [
  { id: 'New', label: 'New / Inquiry', color: 'text-blue-700', border: 'border-blue-400', bg: 'bg-blue-50' },
  { id: 'Contacted', label: 'Contacted', color: 'text-indigo-700', border: 'border-indigo-400', bg: 'bg-indigo-50' },
  { id: 'Qualified', label: 'Qualified', color: 'text-amber-700', border: 'border-amber-400', bg: 'bg-amber-50' },
  { id: 'Proposal', label: 'Proposal Sent', color: 'text-purple-700', border: 'border-purple-400', bg: 'bg-purple-50' },
  { id: 'Won', label: 'Won / Converted', color: 'text-emerald-700', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  { id: 'Lost', label: 'Lost', color: 'text-rose-700', border: 'border-rose-400', bg: 'bg-rose-50' }
];

export const CommunicationLeadsHub: React.FC<Props> = ({
  leads,
  communications,
  customers,
  companySettings,
  quotations,
  invoices,
  onSaveLead,
  onDeleteLead,
  onSaveCommunication,
  onDeleteCommunication,
  onConvertToCustomer,
  onOpenCreateQuotationForLead,
  onShowToast,
  autoOpenCompose = false,
  autoOpenLead = false
}) => {
  // Main view switcher: 'communications' or 'leads'
  const [mainView, setMainView] = useState<'communications' | 'leads'>('communications');

  // Communications Sub-Navigation (Folder)
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>('inbox');
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(() => {
    return communications.length > 0 ? communications[0].id : null;
  });

  // Leads Sub-Navigation & Filters
  const [leadViewMode, setLeadViewMode] = useState<'board' | 'table'>('board');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadStageFilter, setLeadStageFilter] = useState<string>('all');
  const [leadPriorityFilter, setLeadPriorityFilter] = useState<string>('all');

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(autoOpenCompose);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(autoOpenLead);
  const [isSimulateInboundOpen, setIsSimulateInboundOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeToName, setComposeToName] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSelectedLeadId, setComposeSelectedLeadId] = useState<string>('');
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Email KPI counts
  const unreadCount = useMemo(() => {
    return communications.filter(c => c.folder === 'inbox' && c.status === 'unread').length;
  }, [communications]);

  const starredCount = useMemo(() => {
    return communications.filter(c => c.starred).length;
  }, [communications]);

  const totalPipelineValue = useMemo(() => {
    return leads
      .filter(l => l.status !== 'Lost')
      .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  }, [leads]);

  const activeLeadsCount = useMemo(() => {
    return leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;
  }, [leads]);

  // Filtered Communications
  const filteredEmails = useMemo(() => {
    return communications
      .filter(email => {
        // Folder match
        if (currentFolder === 'all') {
          // show all
        } else if (currentFolder === 'drafts') {
          if (email.folder !== 'drafts') return false;
        } else if (currentFolder === 'sent') {
          if (email.folder !== 'sent') return false;
        } else if (currentFolder === 'inbox') {
          if (email.folder !== 'inbox') return false;
        }

        // Search match
        if (emailSearchQuery.trim()) {
          const q = emailSearchQuery.toLowerCase();
          const matchSender = email.sender?.name?.toLowerCase().includes(q) || email.sender?.email?.toLowerCase().includes(q);
          const matchRecipient = email.recipient?.name?.toLowerCase().includes(q) || email.recipient?.email?.toLowerCase().includes(q);
          const matchSubject = email.subject?.toLowerCase().includes(q);
          const matchBody = email.body?.toLowerCase().includes(q);
          const matchLead = email.leadNumber?.toLowerCase().includes(q);
          if (!matchSender && !matchRecipient && !matchSubject && !matchBody && !matchLead) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [communications, currentFolder, emailSearchQuery]);

  // Selected Email
  const currentEmail = useMemo(() => {
    if (!selectedEmailId && filteredEmails.length > 0) {
      return filteredEmails[0];
    }
    return communications.find(e => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [selectedEmailId, communications, filteredEmails]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (leadStageFilter !== 'all' && lead.status !== leadStageFilter) {
        return false;
      }
      if (leadPriorityFilter !== 'all' && lead.priority !== leadPriorityFilter) {
        return false;
      }
      if (leadSearchQuery.trim()) {
        const q = leadSearchQuery.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(q);
        const matchComp = lead.companyName.toLowerCase().includes(q);
        const matchEmail = lead.email.toLowerCase().includes(q);
        const matchPhone = lead.phone.toLowerCase().includes(q);
        const matchNo = lead.leadNumber.toLowerCase().includes(q);
        const matchNotes = (lead.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchComp && !matchEmail && !matchPhone && !matchNo && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [leads, leadStageFilter, leadPriorityFilter, leadSearchQuery]);

  // Helper: Open Compose for specific Lead or Customer
  const handleOpenComposeForLead = (lead: Lead) => {
    setComposeTo(lead.email);
    setComposeToName(lead.name);
    setComposeSubject(`Roti Bros Wholesale Inquiry - Follow-up with ${lead.companyName || lead.name}`);
    setComposeBody(
      `Dear ${lead.name},\n\nThank you for connecting with Roti Bros (Pty) Ltd regarding our fresh and frozen wholesale bakery range.\n\nPlease let us know if you would like a product trial sample delivered to your premises, or if you need an itemized quotation for your branch.\n\nWarm regards,\n${companySettings.name}\nTel: ${companySettings.phone}\n${companySettings.email}`
    );
    setComposeSelectedLeadId(lead.id);
    setIsComposeOpen(true);
  };

  // Helper: Open Compose for Reply
  const handleReplyToEmail = (email: CommunicationEmail) => {
    const isSentByUs = email.folder === 'sent';
    const replyTo = isSentByUs ? email.recipient.email : email.sender.email;
    const replyToName = isSentByUs ? email.recipient.name : email.sender.name;

    setComposeTo(replyTo);
    setComposeToName(replyToName);
    setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    setComposeBody(
      `\n\n--- On ${new Date(email.date).toLocaleString()}, ${email.sender.name} (${email.sender.email}) wrote ---\n> ${email.body.replace(/\n/g, '\n> ')}`
    );
    if (email.leadId) {
      setComposeSelectedLeadId(email.leadId);
    }
    setIsComposeOpen(true);
  };

  // Helper: Star toggle
  const handleToggleStar = (email: CommunicationEmail) => {
    const updated: CommunicationEmail = {
      ...email,
      starred: !email.starred
    };
    onSaveCommunication(updated);
    onShowToast(updated.starred ? 'Email marked as starred.' : 'Email unstarred.');
  };

  // Helper: Mark as Read/Unread
  const handleToggleReadStatus = (email: CommunicationEmail) => {
    const newStatus: EmailStatus = email.status === 'unread' ? 'read' : 'unread';
    const updated: CommunicationEmail = {
      ...email,
      status: newStatus
    };
    onSaveCommunication(updated);
  };

  // Convert Email sender into a Lead in 1 click!
  const handleConvertEmailToLead = (email: CommunicationEmail) => {
    const leadNo = `LD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      leadNumber: leadNo,
      name: email.sender.name || 'New Contact',
      companyName: email.sender.name || 'Prospect Company',
      email: email.sender.email,
      phone: '',
      status: 'Qualified',
      source: 'Email',
      priority: 'High',
      estimatedValue: 12000,
      notes: `Inquiry from email: "${email.subject}".\n\nSnippet:\n${email.body.slice(0, 300)}...`,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString()
    };

    onSaveLead(newLead);

    // Update email with lead reference
    const updatedEmail: CommunicationEmail = {
      ...email,
      leadId: newLead.id,
      leadNumber: newLead.leadNumber
    };
    onSaveCommunication(updatedEmail);

    onShowToast(`Created Sales Lead ${newLead.leadNumber} for "${newLead.name}" from email inquiry!`);
    setMainView('leads');
  };

  // Convert Lead into full Customer in 1 click!
  const handleConvertLeadToCustomer = (lead: Lead) => {
    onConvertToCustomer(lead);
    const updatedLead: Lead = {
      ...lead,
      status: 'Won',
      updatedAt: new Date().toISOString()
    };
    onSaveLead(updatedLead);
    onShowToast(`Lead ${lead.leadNumber} successfully converted to official Customer record & marked as Won!`);
  };

  // Move Lead Stage
  const handleMoveLeadStage = (lead: Lead, direction: 'next' | 'prev') => {
    const currentIndex = LEAD_STAGES.findIndex(s => s.id === lead.status);
    if (currentIndex < 0) return;

    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= LEAD_STAGES.length) return;

    const newStatus = LEAD_STAGES[newIndex].id;
    const updated: Lead = {
      ...lead,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      lastContactDate: new Date().toISOString().slice(0, 10)
    };
    onSaveLead(updated);
    onShowToast(`Lead ${lead.leadNumber} moved to "${LEAD_STAGES[newIndex].label}".`);
  };

  // Save new or edited lead
  const handleSaveLeadForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const leadNo = editingLead ? editingLead.leadNumber : `LD-${Math.floor(1000 + Math.random() * 9000)}`;

    const leadObj: Lead = {
      id: editingLead ? editingLead.id : `lead-${Date.now()}`,
      leadNumber: leadNo,
      name: formData.get('name') as string,
      companyName: formData.get('companyName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: (formData.get('status') as LeadStatus) || 'New',
      source: (formData.get('source') as LeadSource) || 'Website',
      priority: (formData.get('priority') as LeadPriority) || 'Medium',
      estimatedValue: Number(formData.get('estimatedValue')) || 0,
      notes: (formData.get('notes') as string) || '',
      assignedTo: (formData.get('assignedTo') as string) || '',
      nextFollowUpDate: (formData.get('nextFollowUpDate') as string) || '',
      lastContactDate: new Date().toISOString().slice(0, 10),
      createdAt: editingLead ? editingLead.createdAt : new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString()
    };

    onSaveLead(leadObj);
    setIsLeadModalOpen(false);
    setEditingLead(null);
    onShowToast(`Lead ${leadObj.leadNumber} saved.`);
  };

  // Submit Compose Email
  const handleSendComposeEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) {
      onShowToast('Please provide a recipient email address.');
      return;
    }

    const linkedLead = leads.find(l => l.id === composeSelectedLeadId || l.email.toLowerCase() === composeTo.toLowerCase());

    const newEmail: CommunicationEmail = {
      id: `comm-${Date.now()}`,
      folder: 'sent',
      direction: 'outbound',
      status: 'sent',
      sender: {
        name: companySettings.tradingName || companySettings.name,
        email: companySettings.email || 'orders@rotibros.co.za'
      },
      recipient: {
        name: composeToName || composeTo.split('@')[0],
        email: composeTo.trim()
      },
      cc: composeCc.trim() || undefined,
      subject: composeSubject.trim() || 'Communication from Roti Bros',
      body: composeBody,
      date: new Date().toISOString(),
      leadId: linkedLead?.id,
      leadNumber: linkedLead?.leadNumber,
      tags: ['Outgoing', 'Logged']
    };

    onSaveCommunication(newEmail);
    setSelectedEmailId(newEmail.id);
    setIsComposeOpen(false);
    setComposeTo('');
    setComposeToName('');
    setComposeSubject('');
    setComposeBody('');
    setComposeCc('');
    setComposeSelectedLeadId('');
    onShowToast(`Email logged and dispatched to ${newEmail.recipient.email}.`);
  };

  // Template select in composer
  const handleApplyTemplate = (type: string) => {
    const contactName = composeToName || 'Valued Client';
    if (type === 'quote_followup') {
      setComposeSubject(`Quotation Follow-Up - ${companySettings.name}`);
      setComposeBody(
        `Dear ${contactName},\n\nI hope this email finds you well.\n\nI am following up on the wholesale price quotation we sent through earlier this week. We have dedicated bakery capacity reserved for your upcoming deliveries.\n\nPlease let us know if you need any adjustments to the pack quantities, delivery frequency, or credit terms.\n\nBest regards,\n${companySettings.name}\nTel: ${companySettings.phone}`
      );
    } else if (type === 'invoice_reminder') {
      setComposeSubject(`Statement & Invoice Payment Reminder - ${companySettings.name}`);
      setComposeBody(
        `Dear ${contactName},\n\nThis is a friendly courtesy reminder regarding outstanding invoices on your account with ${companySettings.name}.\n\nBanking Details for EFT Settlement:\nBank: ${companySettings.bankName}\nAccount Name: ${companySettings.accountName}\nAccount Number: ${companySettings.accountNumber}\nBranch Code: ${companySettings.branchCode}\n\nPlease email remittance proofs to ${companySettings.email}.\n\nThank you for your prompt attention.\n\nKind regards,\nAccounts Department`
      );
    } else if (type === 'welcome') {
      setComposeSubject(`Welcome to ${companySettings.name} Wholesale Family`);
      setComposeBody(
        `Dear ${contactName},\n\nWelcome to ${companySettings.name}! We are delighted to partner with your business.\n\nOur team delivers freshly crafted rotis, parathas, and bakery specialties daily across Gauteng. Our customer service desk is available at ${companySettings.phone} for any urgent order updates.\n\nWe look forward to a fruitful and long-lasting partnership.\n\nWarm regards,\n${companySettings.name} Team`
      );
    } else if (type === 'delivery') {
      setComposeSubject(`Delivery Dispatch Confirmation - ${companySettings.name}`);
      setComposeBody(
        `Dear ${contactName},\n\nPlease be advised that your order has been dispatched from our bakery facility and is currently in transit with our driver.\n\nPlease inspect all pack seals upon delivery and retain the signed Delivery Note for your branch records.\n\nBest regards,\nDispatch Operations\n${companySettings.name}`
      );
    }
  };

  // Open default mail client (mailto:)
  const handleLaunchMailClient = () => {
    const mailto = `mailto:${encodeURIComponent(composeTo)}?subject=${encodeURIComponent(composeSubject)}&body=${encodeURIComponent(composeBody)}${composeCc ? `&cc=${encodeURIComponent(composeCc)}` : ''}`;
    window.location.href = mailto;
    onShowToast('Opening your default mail client with prefilled details...');
  };

  // Copy compose draft
  const handleCopyDraft = () => {
    const text = `To: ${composeTo}\nSubject: ${composeSubject}\n\n${composeBody}`;
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
    onShowToast('Email content copied to clipboard.');
  };

  // Log real incoming email or customer inquiry
  const [inboundFromName, setInboundFromName] = useState('');
  const [inboundFromEmail, setInboundFromEmail] = useState('');
  const [inboundSubject, setInboundSubject] = useState('');
  const [inboundBody, setInboundBody] = useState('');
  const [inboundAutoCreateLead, setInboundAutoCreateLead] = useState(true);

  const handleLogInboundEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundFromEmail.trim() || !inboundSubject.trim()) {
      onShowToast('Please provide a sender email address and subject.');
      return;
    }

    let createdLeadId: string | undefined = undefined;
    let createdLeadNo: string | undefined = undefined;

    if (inboundAutoCreateLead) {
      createdLeadNo = `LD-${Math.floor(1000 + Math.random() * 9000)}`;
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        leadNumber: createdLeadNo,
        name: inboundFromName.trim() || 'New Inquiry Contact',
        companyName: inboundFromName.trim() || 'Prospect',
        email: inboundFromEmail.trim(),
        phone: '',
        status: 'New',
        source: 'Email',
        priority: 'Medium',
        estimatedValue: 0,
        notes: `Inbound Subject: "${inboundSubject}"\n\n${inboundBody.slice(0, 300)}`,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString()
      };
      onSaveLead(newLead);
      createdLeadId = newLead.id;
    }

    const newInbound: CommunicationEmail = {
      id: `comm-${Date.now()}`,
      folder: 'inbox',
      direction: 'inbound',
      status: 'unread',
      sender: {
        name: inboundFromName.trim() || inboundFromEmail.split('@')[0],
        email: inboundFromEmail.trim()
      },
      recipient: {
        name: companySettings.tradingName || companySettings.name,
        email: companySettings.email || 'orders@rotibros.co.za'
      },
      subject: inboundSubject.trim(),
      body: inboundBody,
      date: new Date().toISOString(),
      leadId: createdLeadId,
      leadNumber: createdLeadNo,
      starred: false,
      tags: ['Inbound', 'Logged']
    };

    onSaveCommunication(newInbound);
    setSelectedEmailId(newInbound.id);
    setCurrentFolder('inbox');
    setMainView('communications');
    setIsSimulateInboundOpen(false);
    setInboundFromName('');
    setInboundFromEmail('');
    setInboundSubject('');
    setInboundBody('');
    onShowToast(`📥 Inbound email logged from ${newInbound.sender.email}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-black text-white rounded-2xl p-6 shadow-xl border border-yellow-500/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-yellow-400 text-black rounded-lg">
                <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Communication & Leads Hub
                <span className="text-xs bg-yellow-400 text-black font-extrabold px-2 py-0.5 rounded-full">
                  CRM & Mail
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage client inquiries, send and log email correspondence, and track wholesale sales leads through to converted invoices.
            </p>
          </div>

          {/* Quick Hub Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setComposeTo('');
                setComposeToName('');
                setComposeSubject('');
                setComposeBody('');
                setIsComposeOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl text-xs font-black shadow-md border border-yellow-500 transition"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>Compose Email</span>
            </button>

            <button
              onClick={() => {
                setEditingLead(null);
                setIsLeadModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition"
            >
              <UserPlus className="w-4 h-4 text-yellow-400" />
              <span>+ Add Lead</span>
            </button>

            <button
              onClick={() => setIsSimulateInboundOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/50 shadow-sm transition"
              title="Record an inbound email or customer inquiry into your Inbox"
            >
              <Inbox className="w-4 h-4 text-emerald-400" />
              <span>+ Log Inbound Email</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Unread Emails</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              {unreadCount}
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.2 rounded-full animate-pulse">
                  Action Required
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-yellow-400" />
              <span>Active Leads</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {activeLeadsCount} <span className="text-xs font-normal text-slate-400">prospects</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pipeline Value</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {companySettings.currencySymbol} {totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Starred Messages</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {starredCount} <span className="text-xs font-normal text-slate-400">priority</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main View Switcher: Email Communications vs Leads Pipeline */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMainView('communications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition ${
              mainView === 'communications'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Mail className="w-4 h-4 text-yellow-400" />
            <span>Email Communication Center</span>
            {unreadCount > 0 && (
              <span className="ml-1 text-[11px] bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainView('leads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition ${
              mainView === 'leads'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Sales Leads Pipeline</span>
            <span className="ml-1 text-[11px] bg-slate-200 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-full">
              {leads.length}
            </span>
          </button>
        </div>

        {mainView === 'leads' && (
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setLeadViewMode('board')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                leadViewMode === 'board' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setLeadViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                leadViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 1. EMAIL COMMUNICATIONS CENTER VIEW                        */}
      {/* ========================================================== */}
      {mainView === 'communications' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[640px]">
            
            {/* Left Column: Folders & Search */}
            <div className="md:col-span-4 lg:col-span-3 bg-slate-50 p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search emails, sender, lead..."
                  value={emailSearchQuery}
                  onChange={(e) => setEmailSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                />
              </div>

              {/* Folders List */}
              <div className="space-y-1">
                <button
                  onClick={() => setCurrentFolder('inbox')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    currentFolder === 'inbox' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Inbox className="w-4 h-4 text-blue-400" />
                    <span>Inbox</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-rose-500 text-white font-black px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setCurrentFolder('sent')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    currentFolder === 'sent' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Sent Mail</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {communications.filter(c => c.folder === 'sent').length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentFolder('drafts')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    currentFolder === 'drafts' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Drafts</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {communications.filter(c => c.folder === 'drafts').length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentFolder('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    currentFolder === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <span>All Correspondence</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {communications.length}
                  </span>
                </button>
              </div>

              {/* Quick Filter / Tags */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                  Live Dispatch Tools
                </span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      setComposeTo('');
                      setComposeToName('');
                      setComposeSubject('');
                      setComposeBody('');
                      setIsComposeOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-bold transition"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ New Email Message</span>
                  </button>

                  <button
                    onClick={() => setIsSimulateInboundOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition"
                  >
                    <Inbox className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Log Inbound Email</span>
                  </button>
                </div>
              </div>

              {/* Message List Preview */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Messages ({filteredEmails.length})</span>
                </div>
                <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
                  {filteredEmails.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No emails found in this folder.
                    </div>
                  ) : (
                    filteredEmails.map(email => {
                      const isSelected = currentEmail?.id === email.id;
                      const isUnread = email.status === 'unread';
                      return (
                        <div
                          key={email.id}
                          onClick={() => {
                            setSelectedEmailId(email.id);
                            if (email.status === 'unread') {
                              handleToggleReadStatus(email);
                            }
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition border text-left ${
                            isSelected
                              ? 'bg-yellow-50 border-yellow-400 shadow-xs'
                              : isUnread
                              ? 'bg-white border-blue-200 hover:border-blue-400 font-semibold'
                              : 'bg-white/80 border-slate-200 hover:border-slate-300 opacity-90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {email.folder === 'sent' ? `To: ${email.recipient.name}` : email.sender.name}
                            </span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0 font-mono">
                              {new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <div className="text-xs text-slate-800 truncate font-medium">
                            {email.subject}
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {email.body.replace(/\n/g, ' ')}
                          </p>

                          <div className="flex items-center gap-1.5 mt-2">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                            )}
                            {email.leadNumber && (
                              <span className="text-[9px] bg-yellow-200 text-slate-900 font-extrabold px-1.5 py-0.2 rounded-xs">
                                {email.leadNumber}
                              </span>
                            )}
                            {email.starred && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Full Email Reading Pane */}
            <div className="md:col-span-8 lg:col-span-9 p-6 flex flex-col justify-between">
              {currentEmail ? (
                <div className="space-y-6">
                  {/* Subject & Top Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                        {currentEmail.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          currentEmail.direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {currentEmail.direction === 'inbound' ? '📥 Incoming' : '📤 Outgoing'}
                        </span>

                        {currentEmail.leadNumber && (
                          <span className="text-[10px] bg-yellow-300 text-black font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            Linked Lead: {currentEmail.leadNumber}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(currentEmail.date).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Email Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleToggleStar(currentEmail)}
                        className={`p-2 rounded-lg border transition ${
                          currentEmail.starred
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                        title="Toggle Star"
                      >
                        <Star className={`w-4 h-4 ${currentEmail.starred ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleToggleReadStatus(currentEmail)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        {currentEmail.status === 'unread' ? 'Mark Read' : 'Mark Unread'}
                      </button>

                      <button
                        onClick={() => handleReplyToEmail(currentEmail)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <Reply className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Reply</span>
                      </button>

                      {!currentEmail.leadId && currentEmail.direction === 'inbound' && (
                        <button
                          onClick={() => handleConvertEmailToLead(currentEmail)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-black transition shadow-xs"
                          title="Convert this incoming inquiry into an active Sales Lead"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Convert to Lead</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const mailto = `mailto:${encodeURIComponent(currentEmail.direction === 'inbound' ? currentEmail.sender.email : currentEmail.recipient.email)}?subject=${encodeURIComponent('Re: ' + currentEmail.subject)}`;
                          window.location.href = mailto;
                        }}
                        className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg"
                        title="Open in System Mail App (mailto:)"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Delete this email record?')) {
                            onDeleteCommunication(currentEmail.id);
                            onShowToast('Email record deleted.');
                          }
                        }}
                        className="p-2 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sender / Recipient Profile Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div>
                        <span className="font-semibold text-slate-500">From: </span>
                        <span className="font-bold text-slate-900">{currentEmail.sender.name}</span>{' '}
                        <span className="text-slate-500">&lt;{currentEmail.sender.email}&gt;</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">To: </span>
                        <span className="font-bold text-slate-900">{currentEmail.recipient.name}</span>{' '}
                        <span className="text-slate-500">&lt;{currentEmail.recipient.email}&gt;</span>
                      </div>
                      {currentEmail.cc && (
                        <div>
                          <span className="font-semibold text-slate-500">Cc: </span>
                          <span className="text-slate-700">{currentEmail.cc}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentEmail.body);
                          onShowToast('Email message copied to clipboard.');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-100"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[220px]">
                    {currentEmail.body}
                  </div>

                  {/* Quick Inline Reply Bar */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Looking to respond directly? Click <strong>Reply</strong> to use the integrated composer or open in your default mail app.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReplyToEmail(currentEmail)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl text-xs font-black transition"
                      >
                        <Reply className="w-4 h-4" />
                        <span>Compose Reply</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-24 text-slate-400 space-y-3">
                  <Mail className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                  <h4 className="text-base font-bold text-slate-700">No message selected</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Select an email from the list on the left to preview, reply, or convert prospective inquiries into sales leads.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. SALES LEADS PIPELINE VIEW                               */}
      {/* ========================================================== */}
      {mainView === 'leads' && (
        <div className="space-y-4">
          
          {/* Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by contact name, company, phone, email, notes..."
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={leadStageFilter}
                onChange={(e) => setLeadStageFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Pipeline Stages</option>
                {LEAD_STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

              <select
                value={leadPriorityFilter}
                onChange={(e) => setLeadPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>

              <button
                onClick={() => {
                  setEditingLead(null);
                  setIsLeadModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl text-xs font-black shadow-xs transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New Lead</span>
              </button>
            </div>
          </div>

          {/* Kanban Board Mode */}
          {leadViewMode === 'board' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
              {LEAD_STAGES.map(stage => {
                const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                const stageTotalVal = stageLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0);

                return (
                  <div
                    key={stage.id}
                    className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200 flex flex-col min-w-[240px]"
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${stage.bg} border ${stage.border}`}></span>
                        <h4 className="text-xs font-black text-slate-900">{stage.label}</h4>
                      </div>
                      <span className="text-[10px] font-black bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="text-[10px] font-semibold text-slate-500 mb-2 font-mono">
                      Val: {companySettings.currencySymbol} {stageTotalVal.toLocaleString()}
                    </div>

                    {/* Stage Cards */}
                    <div className="space-y-2.5 flex-1 min-h-[180px]">
                      {stageLeads.length === 0 ? (
                        <div className="text-center py-8 text-[11px] text-slate-400 italic">
                          No leads in this stage
                        </div>
                      ) : (
                        stageLeads.map(lead => {
                          const priorityColor =
                            lead.priority === 'High'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : lead.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200';

                          return (
                            <div
                              key={lead.id}
                              className="bg-white rounded-xl p-3 shadow-xs border border-slate-200 hover:border-yellow-400 transition space-y-2 text-left"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-black bg-slate-900 text-yellow-400 px-1.5 py-0.2 rounded-xs">
                                  {lead.leadNumber}
                                </span>
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-xs border ${priorityColor}`}>
                                  {lead.priority}
                                </span>
                              </div>

                              <div>
                                <h5 className="font-extrabold text-xs text-slate-900 truncate">
                                  {lead.name}
                                </h5>
                                <p className="text-[11px] font-semibold text-slate-600 truncate flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  {lead.companyName}
                                </p>
                              </div>

                              <div className="text-xs font-black text-emerald-700">
                                {companySettings.currencySymbol} {(lead.estimatedValue || 0).toLocaleString()}
                              </div>

                              {lead.notes && (
                                <p className="text-[10px] text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                  {lead.notes}
                                </p>
                              )}

                              {/* Card Action Strip */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenComposeForLead(lead)}
                                    className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    title="Send Email to this Lead"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </button>

                                  {lead.phone && (
                                    <a
                                      href={`tel:${lead.phone}`}
                                      className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                      title={`Call ${lead.phone}`}
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {lead.status !== 'Won' && (
                                    <button
                                      onClick={() => handleConvertLeadToCustomer(lead)}
                                      className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                      title="Convert to Customer & Mark as Won"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setEditingLead(lead);
                                      setIsLeadModalOpen(true);
                                    }}
                                    className="p-1 text-slate-500 hover:text-slate-800 rounded"
                                    title="Edit Lead"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Step arrows */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleMoveLeadStage(lead, 'prev')}
                                    disabled={stage.id === 'New'}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                                    title="Move stage back"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveLeadStage(lead, 'next')}
                                    disabled={stage.id === 'Lost'}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                                    title="Move stage forward"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View Mode */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Lead #</th>
                      <th className="py-3 px-4">Contact & Company</th>
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Est. Value</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Next Action</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          No sales leads found matching current criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map(lead => {
                        const stageInfo = LEAD_STAGES.find(s => s.id === lead.status);
                        return (
                          <tr key={lead.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {lead.leadNumber}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{lead.name}</div>
                              <div className="text-[11px] text-slate-500">{lead.companyName}</div>
                              <div className="text-[10px] text-blue-600">{lead.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${stageInfo?.bg} ${stageInfo?.color} ${stageInfo?.border}`}>
                                {stageInfo?.label || lead.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                lead.priority === 'High' ? 'bg-rose-100 text-rose-800' : lead.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {lead.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-black text-slate-900">
                              {companySettings.currencySymbol} {(lead.estimatedValue || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium">
                              {lead.source}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                              {lead.nextFollowUpDate || '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenComposeForLead(lead)}
                                  className="p-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-bold"
                                  title="Send Email"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                {lead.status !== 'Won' && (
                                  <button
                                    onClick={() => handleConvertLeadToCustomer(lead)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                                    title="Convert to Customer"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingLead(lead);
                                    setIsLeadModalOpen(true);
                                  }}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                                  title="Edit"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete lead ${lead.leadNumber}?`)) {
                                      onDeleteLead(lead.id);
                                      onShowToast('Lead removed.');
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

        </div>
      )}

      {/* ========================================================== */}
      {/* COMPOSE EMAIL MODAL                                        */}
      {/* ========================================================== */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-yellow-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-yellow-400 text-black rounded-lg">
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Compose Email Dispatch</h3>
                  <p className="text-xs text-yellow-400 font-medium">Send real email & log communication thread</p>
                </div>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendComposeEmail} className="p-6 space-y-4">
              
              {/* Quick Template Picker */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <span className="text-[10px] font-extrabold uppercase text-yellow-900 tracking-wider block mb-1.5">
                  ⚡ Pre-formatted Email Templates
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('quote_followup')}
                    className="px-2.5 py-1 bg-white hover:bg-yellow-100 text-slate-800 border border-yellow-300 rounded-lg text-xs font-semibold"
                  >
                    Quotation Follow-Up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('invoice_reminder')}
                    className="px-2.5 py-1 bg-white hover:bg-yellow-100 text-slate-800 border border-yellow-300 rounded-lg text-xs font-semibold"
                  >
                    Payment EFT Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('welcome')}
                    className="px-2.5 py-1 bg-white hover:bg-yellow-100 text-slate-800 border border-yellow-300 rounded-lg text-xs font-semibold"
                  >
                    New Customer Welcome
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('delivery')}
                    className="px-2.5 py-1 bg-white hover:bg-yellow-100 text-slate-800 border border-yellow-300 rounded-lg text-xs font-semibold"
                  >
                    Delivery Dispatch Notice
                  </button>
                </div>
              </div>

              {/* Recipient Dropdown / Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. client@restaurant.co.za"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient / Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Contact Person or Business"
                    value={composeToName}
                    onChange={(e) => setComposeToName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Autocomplete Shortcut from Customers or Leads */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Or select from existing Customer or Lead directory:
                </label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val.startsWith('lead:')) {
                      const l = leads.find(item => item.id === val.replace('lead:', ''));
                      if (l) {
                        setComposeTo(l.email);
                        setComposeToName(l.name);
                        setComposeSelectedLeadId(l.id);
                      }
                    } else if (val.startsWith('cust:')) {
                      const c = customers.find(item => item.id === val.replace('cust:', ''));
                      if (c) {
                        setComposeTo(c.email);
                        setComposeToName(c.contactPerson || c.registeredName);
                      }
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                >
                  <option value="">-- Choose directory contact --</option>
                  <optgroup label="Sales Leads">
                    {leads.map(l => (
                      <option key={`lead:${l.id}`} value={`lead:${l.id}`}>
                        {l.leadNumber} - {l.name} ({l.companyName}) - {l.email}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Existing Customers">
                    {customers.map(c => (
                      <option key={`cust:${c.id}`} value={`cust:${c.id}`}>
                        {c.code} - {c.registeredName} ({c.contactPerson}) - {c.email}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quotation #QT-2026-101 from Roti Bros"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Message Body *
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Type message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal focus:ring-2 focus:ring-yellow-400 focus:outline-hidden font-sans"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLaunchMailClient}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                    title="Launch default system mail application (Gmail, Outlook, Apple Mail)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Open in Email App</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyDraft}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedDraft ? 'Copied!' : 'Copy Draft'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl text-xs font-black shadow-md border border-yellow-500 transition"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Send & Save to Database</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ADD / EDIT LEAD MODAL                                      */}
      {/* ========================================================== */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-yellow-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-yellow-400 text-black rounded-lg">
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {editingLead ? `Edit Lead ${editingLead.leadNumber}` : 'Register New Sales Lead'}
                  </h3>
                  <p className="text-xs text-yellow-400 font-medium">Capture prospect contact & requirements</p>
                </div>
              </div>
              <button
                onClick={() => setIsLeadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeadForm} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={editingLead?.name || ''}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Trading Name *</label>
                  <input
                    name="companyName"
                    type="text"
                    required
                    defaultValue={editingLead?.companyName || ''}
                    placeholder="e.g. Acme Enterprise"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={editingLead?.email || ''}
                    placeholder="e.g. client@domain.co.za"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    name="phone"
                    type="text"
                    defaultValue={editingLead?.phone || ''}
                    placeholder="e.g. +27 82 455 9012"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pipeline Stage</label>
                  <select
                    name="status"
                    defaultValue={editingLead?.status || 'New'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    {LEAD_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Priority</label>
                  <select
                    name="priority"
                    defaultValue={editingLead?.priority || 'Medium'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Est. Deal Value (ZAR)</label>
                  <input
                    name="estimatedValue"
                    type="number"
                    defaultValue={editingLead?.estimatedValue || 10000}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
                  <select
                    name="source"
                    defaultValue={editingLead?.source || 'Website'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="Website">Website Form</option>
                    <option value="Email">Direct Email</option>
                    <option value="Phone Call">Phone Call / Inbound</option>
                    <option value="Referral">Client Referral</option>
                    <option value="Walk-in">Walk-in Visit</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Next Follow-Up Date</label>
                  <input
                    name="nextFollowUpDate"
                    type="date"
                    defaultValue={editingLead?.nextFollowUpDate || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requirements & Prospect Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingLead?.notes || ''}
                  placeholder="e.g. Requires 50 packs fresh parathas delivered daily before 08:00 AM..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl text-xs font-black shadow-md border border-yellow-500 transition"
                >
                  {editingLead ? 'Update Lead' : 'Save New Lead'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* LOG INBOUND EMAIL MODAL                                    */}
      {/* ========================================================== */}
      {isSimulateInboundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-yellow-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-400 text-black rounded-lg">
                  <Inbox className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Log Received Client Email</h3>
                  <p className="text-xs text-yellow-400 font-medium">Record incoming client inquiry into your Inbox</p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulateInboundOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogInboundEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sender / Client Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={inboundFromName}
                  onChange={(e) => setInboundFromName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sender Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@domain.co.za"
                  value={inboundFromEmail}
                  onChange={(e) => setInboundFromEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wholesale inquiry for daily delivery"
                  value={inboundSubject}
                  onChange={(e) => setInboundSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste or enter the message received..."
                  value={inboundBody}
                  onChange={(e) => setInboundBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoCreateLead"
                  checked={inboundAutoCreateLead}
                  onChange={(e) => setInboundAutoCreateLead(e.target.checked)}
                  className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
                />
                <label htmlFor="autoCreateLead" className="text-xs font-semibold text-slate-700">
                  Also register this sender as a New Sales Lead
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimulateInboundOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Inbox className="w-4 h-4" />
                  <span>Log to Inbox</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
