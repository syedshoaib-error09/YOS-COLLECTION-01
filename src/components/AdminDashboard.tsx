import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  Eye,
  KeyRound,
  Lock,
  RotateCcw,
  Search,
  Stamp,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import type { ActivityLog, ColorTheme, CustomerCard, LoyaltySettings, StampDesign } from '../types';
import { STAMP_DESIGN_OPTIONS, THEME_OPTIONS } from './ThemeConfig';
import { YosCrestLogo, YosStampGraphic } from './YosLogo';

interface AdminDashboardProps {
  adminToken: string | null;
  settings: LoyaltySettings;
  onOpenLogin: () => void;
  onLogout: () => void;
  onTokenUpdated: (nextToken: string) => void;
  onSettingsUpdated: (next: LoyaltySettings) => void;
  onOpenCustomerCard: (card: CustomerCard) => void;
  onRequestStampCustomer: (card: CustomerCard) => void;
  onRequestResetCustomer: (card: CustomerCard) => void;
  onNotify: (message: string, variant?: 'success' | 'error') => void;
  refreshTick: number;
}

type AdminTab = 'customers' | 'studio' | 'logs' | 'security';

export function AdminDashboard({
  adminToken,
  settings,
  onOpenLogin,
  onLogout,
  onTokenUpdated,
  onSettingsUpdated,
  onOpenCustomerCard,
  onRequestStampCustomer,
  onRequestResetCustomer,
  onNotify,
  refreshTick,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('customers');
  const [customers, setCustomers] = useState<CustomerCard[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Add customer state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newSlots, setNewSlots] = useState(settings.defaultTotalStamps);

  // Edit customer modal state
  const [editingCard, setEditingCard] = useState<CustomerCard | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editTotalStamps, setEditTotalStamps] = useState(6);
  const [editStampsCount, setEditStampsCount] = useState(0);
  const [editDesign, setEditDesign] = useState<string>('');
  const [editTheme, setEditTheme] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');

  // Studio settings state
  const [draftTotal, setDraftTotal] = useState(settings.defaultTotalStamps);
  const [draftDesign, setDraftDesign] = useState<StampDesign>(settings.stampDesign);
  const [draftTheme, setDraftTheme] = useState<ColorTheme>(settings.colorTheme);
  const [draftRewardTitle, setDraftRewardTitle] = useState(settings.rewardTitle);
  const [draftRewardSubtitle, setDraftRewardSubtitle] = useState(settings.rewardSubtitle);
  const [draftTagline, setDraftTagline] = useState(settings.brandTagline);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [savingStudio, setSavingStudio] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Security / Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  // Backup / Restore state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingRestore, setPendingRestore] = useState<unknown | null>(null);
  const [restorePreviewText, setRestorePreviewText] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setDraftTotal(settings.defaultTotalStamps);
    setDraftDesign(settings.stampDesign);
    setDraftTheme(settings.colorTheme);
    setDraftRewardTitle(settings.rewardTitle);
    setDraftRewardSubtitle(settings.rewardSubtitle);
    setDraftTagline(settings.brandTagline);
    setNewSlots(settings.defaultTotalStamps);
  }, [settings]);

  const fetchCustomers = useCallback(async () => {
    if (!adminToken) return;
    setLoadingCustomers(true);
    try {
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(customerSearch)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) setCustomers(data.customers || []);
    } finally {
      setLoadingCustomers(false);
    }
  }, [adminToken, customerSearch, onLogout]);

  const fetchLogs = useCallback(async () => {
    if (!adminToken) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/logs?action=${encodeURIComponent(logFilter)}&limit=120`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) setLogs(data.logs || []);
    } finally {
      setLoadingLogs(false);
    }
  }, [adminToken, logFilter, onLogout]);

  useEffect(() => {
    if (adminToken && activeTab === 'customers') {
      fetchCustomers();
    }
  }, [adminToken, activeTab, fetchCustomers, refreshTick]);

  useEffect(() => {
    if (adminToken && activeTab === 'logs') {
      fetchLogs();
    }
  }, [adminToken, activeTab, fetchLogs, refreshTick]);

  if (!adminToken) {
    return (
      <section className="max-w-lg mx-auto my-8 rounded-3xl border border-stone-200 dark:border-[#C9A34E]/35 bg-white dark:bg-[#111114] p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#111114] dark:bg-[#1C1810] border border-[#C9A34E]/40 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-[#C9A34E]" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-stone-900 dark:text-[#FAF8F4] mt-5">
          Admin Console Protected
        </h2>
        <p className="text-sm text-stone-600 dark:text-[#A8A298] mt-2 leading-relaxed">
          Sign in with your YOS COLLECTION staff PIN to manage customer loyalty cards, expand stamp slots, customize card designs, review activity logs, and export database backups.
        </p>
        <button
          type="button"
          onClick={onOpenLogin}
          className="mt-6 min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A34E] via-[#DFBE68] to-[#B89038] text-[#0B0B0E] font-semibold text-sm inline-flex items-center gap-2 hover:brightness-105 transition-all"
        >
          <KeyRound className="w-4 h-4" />
          <span>Unlock Admin Dashboard</span>
        </button>
      </section>
    );
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cards/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: newName,
          mobile: newMobile,
          notes: newNotes,
          totalStamps: newSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Could not create customer card.', 'error');
        return;
      }
      onNotify(data.message, 'success');
      setNewName('');
      setNewMobile('');
      setNewNotes('');
      setShowAddForm(false);
      fetchCustomers();
    } catch {
      onNotify('Network error while creating customer card.', 'error');
    }
  };

  const openEditor = (card: CustomerCard) => {
    setEditingCard(card);
    setEditName(card.name);
    setEditMobile(card.mobile);
    setEditTotalStamps(card.totalStamps);
    setEditStampsCount(card.stampsCount);
    setEditDesign(card.stampDesign || '');
    setEditTheme(card.colorTheme || '');
    setEditNotes(card.notes);
  };

  const handleSaveCustomerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    try {
      const res = await fetch(`/api/admin/customers/${editingCard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: editName,
          mobile: editMobile,
          totalStamps: editTotalStamps,
          stampsCount: editStampsCount,
          stampDesign: editDesign ? editDesign : null,
          colorTheme: editTheme ? editTheme : null,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Unable to update customer.', 'error');
        return;
      }
      onNotify(`Updated ${data.card.name} (${data.card.stampsCount}/${data.card.totalStamps}).`, 'success');
      setEditingCard(null);
      fetchCustomers();
    } catch {
      onNotify('Failed to save customer updates.', 'error');
    }
  };

  const handleDeleteCustomer = async (card: CustomerCard) => {
    try {
      const res = await fetch(`/api/admin/customers/${card.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        onNotify(data.error || 'Unable to delete customer.', 'error');
        return;
      }
      onNotify(`Removed card ${card.cardCode} (${card.name}).`, 'success');
      fetchCustomers();
    } catch {
      onNotify('Network error while deleting card.', 'error');
    }
  };

  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudio(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          defaultTotalStamps: draftTotal,
          stampDesign: draftDesign,
          colorTheme: draftTheme,
          rewardTitle: draftRewardTitle,
          rewardSubtitle: draftRewardSubtitle,
          brandTagline: draftTagline,
          applyToExistingCards: applyToExisting,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Failed to save studio settings.', 'error');
        return;
      }
      onSettingsUpdated(data);
      setApplyToExisting(false);
      onNotify('Stamp studio settings saved to database.', 'success');
    } finally {
      setSavingStudio(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(nextPin)) {
      onNotify('New PIN must be 4 to 8 numeric digits.', 'error');
      return;
    }
    if (nextPin !== confirmPin) {
      onNotify('New PIN and confirmation do not match.', 'error');
      return;
    }
    setChangingPin(true);
    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ currentPin, newPin: nextPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Failed to change admin PIN.', 'error');
        return;
      }
      if (data.token) {
        onTokenUpdated(data.token);
      }
      setCurrentPin('');
      setNextPin('');
      setConfirmPin('');
      onNotify('Admin PIN updated securely.', 'success');
    } finally {
      setChangingPin(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) {
        onNotify('Failed to generate database backup.', 'error');
        return;
      }
      const backup = await res.json();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yos-collection-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify('Database backup downloaded.', 'success');
    } catch {
      onNotify('Error exporting backup file.', 'error');
    }
  };

  const handleSelectRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.brand !== 'YOS COLLECTION' || !Array.isArray(parsed.customers)) {
        onNotify('Selected file is not a valid YOS COLLECTION backup.', 'error');
        return;
      }
      setPendingRestore(parsed);
      setRestorePreviewText(
        `${parsed.customers.length} customer cards · ${(parsed.stampHistory || []).length} stamp records · exported ${new Date(parsed.exportedAt).toLocaleString()}`
      );
    } catch {
      onNotify('Could not read JSON backup file.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setRestoring(true);
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(pendingRestore),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Restore failed.', 'error');
        return;
      }
      if (data.settings) {
        onSettingsUpdated(data.settings);
      }
      setPendingRestore(null);
      setRestorePreviewText(null);
      onNotify(data.message || 'Database restored successfully.', 'success');
      fetchCustomers();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/10">
          {(
            [
              { id: 'customers', label: 'Customers' },
              { id: 'studio', label: 'Stamp Studio' },
              { id: 'logs', label: 'Activity Log' },
              { id: 'security', label: 'Security & Backup' },
            ] as Array<{ id: AdminTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#C9A34E] text-stone-900 dark:text-[#0B0B0E] shadow-xs'
                  : 'text-stone-600 dark:text-[#A8A298] hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[40px] px-4 py-2 rounded-xl border border-stone-200 dark:border-white/15 text-xs font-medium text-stone-700 dark:text-[#A8A298] hover:text-stone-900 dark:hover:text-white whitespace-nowrap shrink-0 transition-colors"
        >
          Lock Admin Console
        </button>
      </div>

      {/* TAB 1: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 dark:text-[#8D8576] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customer name, mobile, or YOS code..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-[#111114] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-[#FAF8F4] placeholder:text-stone-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#C9A34E]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#111114] dark:bg-[#C9A34E] text-[#FAF8F4] dark:text-[#0B0B0E] text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'Close Form' : 'Add Customer'}</span>
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleCreateCustomer}
              className="rounded-2xl border border-stone-200 dark:border-[#C9A34E]/35 bg-white dark:bg-[#111114] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
            >
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Customer full name"
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="+1 555 0100"
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm font-mono text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Total Stamp Slots</label>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={newSlots}
                  onChange={(e) => setNewSlots(Number(e.target.value) || 6)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm font-mono tabular-nums text-stone-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#C9A34E] text-[#0B0B0E] text-xs font-semibold hover:brightness-105 transition-all"
              >
                Create Unique Card
              </button>
            </form>
          )}

          {/* Customer Records Table / List */}
          <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] overflow-hidden">
            {loadingCustomers ? (
              <div className="p-8 text-center text-sm text-stone-500 dark:text-[#A8A298]">
                Loading customer directory...
              </div>
            ) : customers.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-500 dark:text-[#A8A298]">
                No customers matched your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-white/10 text-xs text-stone-500 dark:text-[#A8A298]">
                      <th className="py-3.5 px-4 font-medium">Customer</th>
                      <th className="py-3.5 px-4 font-medium">Card Code</th>
                      <th className="py-3.5 px-4 font-medium">Mobile</th>
                      <th className="py-3.5 px-4 font-medium text-right">Progress</th>
                      <th className="py-3.5 px-4 font-medium text-right">Cycles</th>
                      <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-white/10 text-sm">
                    {customers.map((c) => {
                      const done = c.stampsCount >= c.totalStamps;
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-stone-50/80 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-stone-900 dark:text-[#FAF8F4]">{c.name}</p>
                            {c.notes && (
                              <p className="text-xs text-stone-500 dark:text-[#A8A298] truncate max-w-[220px]">
                                {c.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-stone-700 dark:text-[#E3C168]">
                            {c.cardCode}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-stone-600 dark:text-[#A8A298]">
                            {c.mobile}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            <span
                              className={
                                done
                                  ? 'font-semibold text-[#9F7821] dark:text-[#E3C168]'
                                  : 'text-stone-900 dark:text-[#FAF8F4]'
                              }
                            >
                              {c.stampsCount}/{c.totalStamps}
                            </span>
                            <span className="block text-[11px] text-stone-500 dark:text-[#A8A298]">
                              {done ? 'Reward Ready' : `${c.totalStamps - c.stampsCount} left`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-stone-600 dark:text-[#A8A298]">
                            {c.completedCycles}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenCustomerCard(c)}
                                title="View Card"
                                aria-label={`View ${c.name}'s card`}
                                className="min-h-[38px] min-w-[38px] px-2.5 rounded-lg border border-stone-200 dark:border-white/15 text-stone-700 dark:text-[#FAF8F4] hover:border-[#C9A34E] flex items-center justify-center gap-1 text-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Card</span>
                              </button>
                              {!done ? (
                                <button
                                  type="button"
                                  onClick={() => onRequestStampCustomer(c)}
                                  title="Add Stamp"
                                  aria-label={`Add stamp to ${c.name}`}
                                  className="min-h-[38px] min-w-[38px] px-2.5 rounded-lg bg-[#C9A34E] text-[#0B0B0E] font-semibold flex items-center justify-center gap-1 text-xs hover:brightness-105"
                                >
                                  <Stamp className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">Stamp</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onRequestResetCustomer(c)}
                                  title="Reset Completed Card"
                                  aria-label={`Reset ${c.name}'s completed card`}
                                  className="min-h-[38px] min-w-[38px] px-2.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold flex items-center justify-center gap-1 text-xs"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">Reset</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditor(c)}
                                title="Edit Card"
                                aria-label={`Edit ${c.name}`}
                                className="min-h-[38px] min-w-[38px] rounded-lg border border-stone-200 dark:border-white/15 text-stone-600 dark:text-[#A8A298] hover:text-stone-900 dark:hover:text-white flex items-center justify-center"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(c)}
                                title="Delete Card"
                                aria-label={`Delete ${c.name}`}
                                className="min-h-[38px] min-w-[38px] rounded-lg border border-stone-200 dark:border-white/15 text-stone-500 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STAMP STUDIO (FUTURE STAMP MANAGEMENT) */}
      {activeTab === 'studio' && (
        <form onSubmit={handleSaveStudio} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-6">
            <div>
              <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-[#FAF8F4]">
                Stamp Capacity &amp; Architecture
              </h3>
              <p className="text-xs text-stone-500 dark:text-[#A8A298] mt-1">
                Expand or customize total stamp slots for future campaigns (6, 8, 10, 12, or custom).
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {[6, 8, 10, 12].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDraftTotal(preset)}
                    className={`min-h-[44px] px-4 rounded-xl border font-mono text-sm font-semibold tabular-nums transition-colors ${
                      draftTotal === preset
                        ? 'bg-[#111114] dark:bg-[#C9A34E] text-white dark:text-[#0B0B0E] border-transparent'
                        : 'border-stone-200 dark:border-white/15 text-stone-700 dark:text-[#FAF8F4] hover:border-[#C9A34E]'
                    }`}
                  >
                    {preset} Stamps
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-1">
                  <label htmlFor="custom-slots-input" className="text-xs text-stone-500 dark:text-[#A8A298]">
                    Custom:
                  </label>
                  <input
                    id="custom-slots-input"
                    type="number"
                    min={4}
                    max={20}
                    value={draftTotal}
                    onChange={(e) => setDraftTotal(Math.min(20, Math.max(4, Number(e.target.value) || 6)))}
                    className="w-20 h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 font-mono text-sm tabular-nums text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="mt-4 flex items-center gap-2.5 text-xs text-stone-700 dark:text-[#A8A298] cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToExisting}
                  onChange={(e) => setApplyToExisting(e.target.checked)}
                  className="w-4 h-4 accent-[#C9A34E] rounded"
                />
                <span>Also update all existing customer cards to {draftTotal} total slots</span>
              </label>
            </div>

            {/* Stamp Design Picker */}
            <div className="pt-5 border-t border-stone-100 dark:border-white/10">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-[#FAF8F4]">Stamp Seal Design</h4>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STAMP_DESIGN_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftDesign(opt.id)}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      draftDesign === opt.id
                        ? 'border-[#C9A34E] bg-[#C9A34E]/10'
                        : 'border-stone-200 dark:border-white/10 hover:border-[#C9A34E]/50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#111114] border border-[#C9A34E]/40 flex items-center justify-center shrink-0">
                      <YosStampGraphic design={opt.id} className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 dark:text-[#FAF8F4]">{opt.label}</p>
                      <p className="text-xs text-stone-500 dark:text-[#A8A298] truncate">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Black, White, Gold Palette Picker */}
            <div className="pt-5 border-t border-stone-100 dark:border-white/10">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-[#FAF8F4]">
                Black, White &amp; Gold Palette Option
              </h4>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(THEME_OPTIONS) as ColorTheme[]).map((key) => {
                  const t = THEME_OPTIONS[key];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDraftTheme(t.id)}
                      className={`p-3.5 rounded-xl border text-left transition-colors ${
                        draftTheme === t.id
                          ? 'border-[#C9A34E] bg-[#C9A34E]/10'
                          : 'border-stone-200 dark:border-white/10 hover:border-[#C9A34E]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`w-6 h-6 rounded-md border ${
                            t.id === 'obsidian-gold'
                              ? 'bg-[#0E0E11] border-[#D4AF37]'
                              : t.id === 'ivory-gold'
                                ? 'bg-white border-stone-300'
                                : 'bg-[#C9A34E] border-[#0E0E11]'
                          }`}
                        />
                        {draftTheme === t.id && <Check className="w-4 h-4 text-[#C9A34E]" />}
                      </div>
                      <p className="text-xs font-semibold text-stone-900 dark:text-[#FAF8F4]">{t.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reward Copy */}
            <div className="pt-5 border-t border-stone-100 dark:border-white/10 space-y-3">
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Brand Tagline</label>
                <input
                  type="text"
                  maxLength={80}
                  value={draftTagline}
                  onChange={(e) => setDraftTagline(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Completion Reward Title</label>
                <input
                  type="text"
                  maxLength={100}
                  value={draftRewardTitle}
                  onChange={(e) => setDraftRewardTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Reward Subtitle</label>
                <textarea
                  rows={2}
                  maxLength={220}
                  value={draftRewardSubtitle}
                  onChange={(e) => setDraftRewardSubtitle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingStudio}
              className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-[#C9A34E] via-[#DFBE68] to-[#B89038] text-[#0B0B0E] font-semibold text-sm hover:brightness-105 disabled:opacity-50"
            >
              {savingStudio ? 'Saving Configuration...' : 'Save Studio Settings'}
            </button>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-3">
              <p className="text-xs font-medium text-stone-500 dark:text-[#A8A298]">Live Card Preview</p>
              <div
                className={`rounded-3xl border p-6 shadow-lg ${THEME_OPTIONS[draftTheme].cardBg} ${THEME_OPTIONS[draftTheme].cardBorder} ${THEME_OPTIONS[draftTheme].cardText}`}
              >
                <div className="flex items-center justify-between pb-4 border-b border-current/10">
                  <div className="flex items-center gap-2.5">
                    <YosCrestLogo
                      className="w-8 h-8"
                      strokeColor={draftTheme === 'champagne-noir' ? '#0E0E11' : '#C9A34E'}
                      textColor={
                        draftTheme === 'ivory-gold'
                          ? '#111114'
                          : draftTheme === 'champagne-noir'
                            ? '#0E0E11'
                            : '#FAF8F4'
                      }
                    />
                    <div>
                      <p className="font-serif text-lg font-semibold leading-none">YOS COLLECTION</p>
                      <p className={`text-[11px] mt-1 ${THEME_OPTIONS[draftTheme].cardMuted}`}>{draftTagline}</p>
                    </div>
                  </div>
                  <span className="font-mono text-base font-semibold tabular-nums">2/{draftTotal}</span>
                </div>

                <div className="grid grid-cols-4 gap-2.5 mt-5">
                  {Array.from({ length: Math.min(draftTotal, 12) }).map((_, i) => {
                    const stamped = i < 2;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-xl border flex items-center justify-center ${
                          stamped
                            ? `${THEME_OPTIONS[draftTheme].slotFilledBg} ${THEME_OPTIONS[draftTheme].slotFilledBorder}`
                            : `${THEME_OPTIONS[draftTheme].slotEmptyBg} ${THEME_OPTIONS[draftTheme].slotEmptyBorder} border-dashed`
                        }`}
                      >
                        {stamped ? (
                          <YosStampGraphic
                            design={draftDesign}
                            inkColor={THEME_OPTIONS[draftTheme].stampInk}
                            accentColor={THEME_OPTIONS[draftTheme].stampAccent}
                            className="w-9 h-9"
                          />
                        ) : (
                          <span className={`font-mono text-[10px] ${THEME_OPTIONS[draftTheme].slotEmptyText}`}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {draftTotal > 12 && (
                  <p className={`text-[11px] mt-3 font-mono ${THEME_OPTIONS[draftTheme].cardMuted}`}>
                    +{draftTotal - 12} more slots on active card
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: ACTIVITY LOG */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-[#FAF8F4]">
              Admin &amp; Staff Activity Log
            </h3>
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              aria-label="Filter activity log by action"
              className="h-11 px-3.5 rounded-xl bg-white dark:bg-[#111114] border border-stone-200 dark:border-white/15 text-xs font-medium text-stone-800 dark:text-[#FAF8F4]"
            >
              <option value="">All Events</option>
              <option value="STAMP_ADDED">Stamp Added</option>
              <option value="CARD_RESET">Card Reset</option>
              <option value="CUSTOMER_CREATED">Customer Created</option>
              <option value="CUSTOMER_EDITED">Customer Edited</option>
              <option value="SETTINGS_UPDATED">Settings Updated</option>
              <option value="PIN_CHANGED">PIN Changed</option>
              <option value="AUTH_FAILED">Failed PIN Attempt</option>
              <option value="BACKUP_EXPORTED">Backup Exported</option>
              <option value="BACKUP_RESTORED">Backup Restored</option>
            </select>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] overflow-hidden">
            {loadingLogs ? (
              <p className="p-8 text-center text-sm text-stone-500 dark:text-[#A8A298]">Loading audit trail...</p>
            ) : logs.length === 0 ? (
              <p className="p-8 text-center text-sm text-stone-500 dark:text-[#A8A298]">No activity logs recorded.</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-white/10">
                {logs.map((log) => (
                  <li key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-[#A8A298]">
                        <span
                          className={`font-mono font-semibold ${
                            log.action === 'AUTH_FAILED'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-stone-900 dark:text-[#E3C168]'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{log.actorRole}</span>
                        {log.targetName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{log.targetName}</span>
                          </>
                        )}
                      </div>
                      <p className="text-stone-800 dark:text-[#FAF8F4] mt-1">{log.details}</p>
                    </div>
                    <time
                      dateTime={log.createdAt}
                      className="text-xs font-mono tabular-nums text-stone-500 dark:text-[#A8A298] whitespace-nowrap shrink-0"
                    >
                      {new Date(log.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & BACKUP */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change PIN */}
          <form
            onSubmit={handleChangePin}
            className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-6 space-y-4"
          >
            <div>
              <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-[#FAF8F4]">
                Change Staff / Admin PIN
              </h3>
              <p className="text-xs text-stone-500 dark:text-[#A8A298] mt-1">
                PIN is stored as a salted cryptographic hash on the server. Updating it invalidates previous admin sessions.
              </p>
            </div>

            {settings.pinConfiguredViaEnv && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                Server environment variable ADMIN_PIN is active and overrides database PIN changes.
              </div>
            )}

            <div>
              <label className="block text-xs text-stone-600 dark:text-[#A8A298] mb-1">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,8}"
                maxLength={8}
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 font-mono text-sm text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-600 dark:text-[#A8A298] mb-1">New PIN (4–8 digits)</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,8}"
                maxLength={8}
                required
                value={nextPin}
                onChange={(e) => setNextPin(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 font-mono text-sm text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-600 dark:text-[#A8A298] mb-1">Confirm New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,8}"
                maxLength={8}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 font-mono text-sm text-stone-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={changingPin || settings.pinConfiguredViaEnv}
              className="min-h-[44px] px-5 rounded-xl bg-[#111114] dark:bg-[#C9A34E] text-white dark:text-[#0B0B0E] text-xs font-semibold disabled:opacity-40"
            >
              {changingPin ? 'Updating PIN...' : 'Update Security PIN'}
            </button>
          </form>

          {/* Backup & Restore */}
          <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-6 space-y-5">
            <div>
              <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-[#FAF8F4]">
                Database Backup &amp; Restore
              </h3>
              <p className="text-xs text-stone-500 dark:text-[#A8A298] mt-1">
                Export all YOS COLLECTION customer cards, stamp history, and settings as a portable archive, or restore from a previous backup.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-[#C9A34E] to-[#B89038] text-[#0B0B0E] text-xs font-semibold inline-flex items-center gap-2 hover:brightness-105"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleSelectRestoreFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-5 rounded-xl border border-stone-300 dark:border-white/20 text-stone-800 dark:text-[#FAF8F4] text-xs font-semibold inline-flex items-center gap-2 hover:border-[#C9A34E]"
              >
                <Upload className="w-4 h-4" />
                <span>Select Backup File</span>
              </button>
            </div>

            {restorePreviewText && (
              <div className="rounded-xl border border-[#C9A34E]/50 bg-[#C9A34E]/10 p-4 space-y-3">
                <p className="text-xs font-semibold text-stone-900 dark:text-[#FAF8F4]">Ready to Restore Archive</p>
                <p className="text-xs text-stone-600 dark:text-[#A8A298] font-mono">{restorePreviewText}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={restoring}
                    onClick={handleConfirmRestore}
                    className="min-h-[40px] px-4 rounded-lg bg-[#111114] dark:bg-[#C9A34E] text-white dark:text-[#0B0B0E] text-xs font-semibold"
                  >
                    {restoring ? 'Restoring...' : 'Confirm Atomic Restore'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRestore(null);
                      setRestorePreviewText(null);
                    }}
                    className="min-h-[40px] px-4 rounded-lg text-xs text-stone-600 dark:text-[#A8A298]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCard && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Customer Loyalty Card"
        >
          <form
            onSubmit={handleSaveCustomerEdit}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111114] border border-stone-200 dark:border-[#C9A34E]/40 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/10">
              <div>
                <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-[#FAF8F4]">
                  Edit Loyalty Card · {editingCard.cardCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                aria-label="Close editor"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 font-mono text-sm text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Current Stamps</label>
                <input
                  type="number"
                  min={0}
                  max={editTotalStamps}
                  value={editStampsCount}
                  onChange={(e) => setEditStampsCount(Math.min(editTotalStamps, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 font-mono text-sm tabular-nums text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Total Slots (4–20)</label>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={editTotalStamps}
                  onChange={(e) => {
                    const v = Math.min(20, Math.max(4, Number(e.target.value) || 6));
                    setEditTotalStamps(v);
                    if (editStampsCount > v) setEditStampsCount(v);
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 font-mono text-sm tabular-nums text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Stamp Design Override</label>
                <select
                  value={editDesign}
                  onChange={(e) => setEditDesign(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
                >
                  <option value="">Use Brand Default</option>
                  {STAMP_DESIGN_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Color Theme Override</label>
                <select
                  value={editTheme}
                  onChange={(e) => setEditTheme(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
                >
                  <option value="">Use Brand Default</option>
                  {(Object.keys(THEME_OPTIONS) as ColorTheme[]).map((k) => (
                    <option key={k} value={k}>
                      {THEME_OPTIONS[k].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-500 dark:text-[#A8A298] mb-1">Notes</label>
              <input
                type="text"
                maxLength={240}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-medium text-stone-600 dark:text-[#A8A298]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-6 rounded-xl bg-[#C9A34E] text-[#0B0B0E] text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
