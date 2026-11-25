import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Shield, UserSearch, XCircle } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { CustomerLookupPanel } from './components/CustomerLookupPanel';
import { LoyaltyCard } from './components/LoyaltyCard';
import { PinModal } from './components/PinModal';
import { THEME_OPTIONS } from './components/ThemeConfig';
import type { ColorTheme, CustomerCard, LoyaltySettings, StampEvent } from './types';

type AppView = 'card' | 'member' | 'admin';

type PinAction =
  | { kind: 'stamp'; card: CustomerCard; idempotencyKey: string }
  | { kind: 'reset'; card: CustomerCard }
  | { kind: 'login' }
  | null;

const DEFAULT_SETTINGS: LoyaltySettings = {
  defaultTotalStamps: 6,
  stampDesign: 'monogram',
  colorTheme: 'obsidian-gold',
  rewardTitle: 'Complimentary Signature Gift',
  rewardSubtitle: 'Redeemable on your next boutique visit upon completing your stamp card.',
  brandTagline: 'Bespoke Atelier & Fine Objects',
  pinConfiguredViaEnv: false,
};

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  const [view, setView] = useState<AppView>('card');
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_SETTINGS);
  const [uiPalette, setUiPalette] = useState<ColorTheme>('obsidian-gold');
  const [activeCard, setActiveCard] = useState<CustomerCard | null>(null);
  const [cardHistory, setCardHistory] = useState<StampEvent[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Admin token stored strictly in React memory (never persisted in localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // PIN modal state
  const [pinAction, setPinAction] = useState<PinAction>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [justStampedSlot, setJustStampedSlot] = useState<number | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const notify = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Sync Tailwind .dark class with the active Black / White / Gold palette
  useEffect(() => {
    const isDark = THEME_OPTIONS[uiPalette]?.isDarkPage ?? true;
    document.documentElement.classList.toggle('dark', isDark);
  }, [uiPalette]);

  const loadInitialData = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const [settingsRes, featuredRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/cards/featured'),
      ]);
      if (settingsRes.ok) {
        const s: LoyaltySettings = await settingsRes.json();
        setSettings(s);
        setUiPalette(s.colorTheme);
      }
      if (featuredRes.ok) {
        const f = await featuredRes.json();
        if (f.card) {
          setActiveCard(f.card);
          setCardHistory(f.history || []);
        }
      }
    } catch {
      notify('Unable to connect to the YOS COLLECTION database.', 'error');
    } finally {
      setLoadingInitial(false);
    }
  }, [notify]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLookup = async (query: string) => {
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/cards/lookup?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || 'Card not found.');
        return;
      }
      setActiveCard(data.card);
      setCardHistory(data.history || []);
      setJustStampedSlot(null);
      setView('card');
      notify(`Loaded loyalty card ${data.card.cardCode} for ${data.card.name}.`, 'success');
    } catch {
      setLookupError('Network error while searching for loyalty card.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRegister = async (name: string, mobile: string): Promise<boolean> => {
    const res = await fetch('/api/cards/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
      body: JSON.stringify({ name, mobile }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not create loyalty card.');
    }
    setActiveCard(data.card);
    setCardHistory(data.history || []);
    setJustStampedSlot(null);
    setLookupError(null);
    setView('card');
    setRefreshTick((t) => t + 1);
    notify(data.message, 'success');
    return true;
  };

  const openStampPrompt = (card: CustomerCard) => {
    setPinError(null);
    setPinAction({
      kind: 'stamp',
      card,
      idempotencyKey: makeIdempotencyKey(),
    });
  };

  const openResetPrompt = (card: CustomerCard) => {
    setPinError(null);
    setPinAction({ kind: 'reset', card });
  };

  const openLoginPrompt = () => {
    setPinError(null);
    setPinAction({ kind: 'login' });
  };

  const handlePinSubmit = async (pin: string, note: string) => {
    if (!pinAction) return;
    setPinLoading(true);
    setPinError(null);

    try {
      if (pinAction.kind === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPinError(data.error || 'Incorrect Admin PIN.');
          return;
        }
        setAdminToken(data.token);
        setPinAction(null);
        setView('admin');
        notify('Admin Console unlocked.', 'success');
        return;
      }

      if (pinAction.kind === 'stamp') {
        const res = await fetch(`/api/cards/${pinAction.card.id}/stamp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin,
            note,
            idempotencyKey: pinAction.idempotencyKey,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPinError(data.error || 'Unable to verify PIN or add stamp.');
          return;
        }
        setPinAction(null);
        setActiveCard(data.card);
        setCardHistory(data.history || []);
        setJustStampedSlot(data.card.stampsCount);
        setRefreshTick((t) => t + 1);
        notify(data.message, 'success');
        return;
      }

      if (pinAction.kind === 'reset') {
        const res = await fetch(`/api/cards/${pinAction.card.id}/reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          body: JSON.stringify({ pin, note }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPinError(data.error || 'Authorization failed.');
          return;
        }
        setPinAction(null);
        setActiveCard(data.card);
        setCardHistory(data.history || []);
        setJustStampedSlot(null);
        setRefreshTick((t) => t + 1);
        notify(data.message, 'success');
      }
    } catch {
      setPinError('Connection error while verifying authorization.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSettingsUpdated = async (next: LoyaltySettings) => {
    setSettings(next);
    setUiPalette(next.colorTheme);
    if (activeCard) {
      const res = await fetch(`/api/cards/${activeCard.id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCard(data.card);
        setCardHistory(data.history || []);
      }
    }
  };

  const handleOpenCardFromAdmin = async (card: CustomerCard) => {
    setActiveCard(card);
    const res = await fetch(`/api/cards/${card.id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveCard(data.card);
      setCardHistory(data.history || []);
    }
    setJustStampedSlot(null);
    setView('card');
  };

  const effectiveSettings: LoyaltySettings = {
    ...settings,
    colorTheme: uiPalette,
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] dark:bg-[#09090B] text-stone-900 dark:text-[#FAF8F4] pb-20 md:pb-12 transition-colors duration-200">
      {/* Top Bar Contract: 3 exact zones (Brand Wordmark — Concise Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-stone-200/80 dark:border-white/10 bg-[#FAF8F3]/90 dark:bg-[#09090B]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setView('card')}
            className="font-serif text-lg sm:text-xl font-semibold tracking-[0.14em] text-stone-900 dark:text-[#FAF8F4] whitespace-nowrap shrink-0 text-left"
          >
            YOS COLLECTION
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-[#A8A298]">
            <button
              type="button"
              onClick={() => setView('card')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                view === 'card'
                  ? 'border-[#C9A34E] text-stone-900 dark:text-[#FAF8F4]'
                  : 'border-transparent hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Stamp Card
            </button>
            <button
              type="button"
              onClick={() => setView('member')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                view === 'member'
                  ? 'border-[#C9A34E] text-stone-900 dark:text-[#FAF8F4]'
                  : 'border-transparent hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Find &amp; Join
            </button>
            <button
              type="button"
              onClick={() => setView('admin')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                view === 'admin'
                  ? 'border-[#C9A34E] text-stone-900 dark:text-[#FAF8F4]'
                  : 'border-transparent hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Admin Console
            </button>
          </nav>

          <div className="shrink-0">
            {adminToken ? (
              <button
                type="button"
                onClick={() => setView('admin')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#C9A34E] text-[#0B0B0E] text-xs font-semibold whitespace-nowrap shrink-0 hover:brightness-105 transition-all"
              >
                Admin Active
              </button>
            ) : (
              <button
                type="button"
                onClick={openLoginPrompt}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#111114] dark:bg-[#C9A34E] text-[#FAF8F4] dark:text-[#0B0B0E] text-xs font-semibold whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
              >
                Staff Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Workspace Toolbar: Editorial Title + Black/White/Gold Palette Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-6 border-b border-stone-200/80 dark:border-white/10">
          <div>
            <p className="text-xs text-[#9E7B2B] dark:text-[#C9A34E] font-medium">
              {view === 'admin'
                ? 'Boutique Management Console'
                : view === 'member'
                  ? 'Member Enrollment & Lookup'
                  : 'Digital Loyalty Stamp Card'}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-[#FAF8F4] mt-1">
              {view === 'admin'
                ? 'YOS Loyalty Administration'
                : view === 'member'
                  ? 'Locate or Issue a Member Card'
                  : 'Collect Stamps & Unlock Privileges'}
            </h1>
          </div>

          {/* Black / White / Gold Color Option Switcher */}
          <div
            role="group"
            aria-label="Color palette option"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-200/70 dark:bg-white/[0.06] border border-stone-300/60 dark:border-white/10 self-start sm:self-auto"
          >
            {(Object.keys(THEME_OPTIONS) as ColorTheme[]).map((themeId) => {
              const option = THEME_OPTIONS[themeId];
              const isSelected = uiPalette === themeId;
              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => setUiPalette(themeId)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-white dark:bg-[#1C1B18] text-stone-900 dark:text-[#E3C168] shadow-xs'
                      : 'text-stone-600 dark:text-[#A8A298] hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full border ${
                      themeId === 'obsidian-gold'
                        ? 'bg-[#0E0E11] border-[#D4AF37]'
                        : themeId === 'ivory-gold'
                          ? 'bg-white border-stone-400'
                          : 'bg-[#C9A34E] border-[#0E0E11]'
                    }`}
                  />
                  <span>{option.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toast Confirmation Banner */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-6 rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-3 text-sm ${
              toast.variant === 'error'
                ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-500/40 text-red-800 dark:text-red-200'
                : 'bg-white dark:bg-[#16140F] border-[#C9A34E]/60 text-stone-900 dark:text-[#FAF8F4]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.variant === 'error' ? (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#C9A34E] shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs font-medium opacity-70 hover:opacity-100 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* VIEW 1: STAMP CARD + SIDEBAR LOOKUP (Desktop 2-col, Mobile focused) */}
        {view === 'card' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-8">
              {loadingInitial ? (
                <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-10 text-center text-sm text-stone-500 dark:text-[#A8A298]">
                  Loading YOS COLLECTION loyalty card...
                </div>
              ) : activeCard ? (
                <LoyaltyCard
                  card={activeCard}
                  settings={effectiveSettings}
                  history={cardHistory}
                  justStampedSlot={justStampedSlot}
                  onRequestAddStamp={() => openStampPrompt(activeCard)}
                  onRequestReset={() => openResetPrompt(activeCard)}
                />
              ) : (
                <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-10 text-center space-y-4">
                  <h2 className="font-serif text-2xl font-semibold">No Active Card Selected</h2>
                  <p className="text-sm text-stone-500 dark:text-[#A8A298]">
                    Search by mobile number or issue a new loyalty card to begin collecting stamps.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView('member')}
                    className="min-h-[44px] px-5 rounded-xl bg-[#C9A34E] text-[#0B0B0E] text-xs font-semibold"
                  >
                    Find or Issue Card
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 xl:col-span-4">
              <CustomerLookupPanel
                settings={effectiveSettings}
                lookupLoading={lookupLoading}
                lookupError={lookupError}
                onLookup={handleLookup}
                onRegister={handleRegister}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: DEDICATED MOBILE-FIRST MEMBER LOOKUP & REGISTRATION */}
        {view === 'member' && (
          <div className="max-w-xl mx-auto">
            <CustomerLookupPanel
              settings={effectiveSettings}
              lookupLoading={lookupLoading}
              lookupError={lookupError}
              onLookup={handleLookup}
              onRegister={handleRegister}
            />
          </div>
        )}

        {/* VIEW 3: ADMIN DASHBOARD */}
        {view === 'admin' && (
          <AdminDashboard
            adminToken={adminToken}
            settings={settings}
            onOpenLogin={openLoginPrompt}
            onLogout={() => {
              setAdminToken(null);
              notify('Admin Console locked.', 'success');
            }}
            onTokenUpdated={(nextToken) => setAdminToken(nextToken)}
            onSettingsUpdated={handleSettingsUpdated}
            onOpenCustomerCard={handleOpenCardFromAdmin}
            onRequestStampCustomer={openStampPrompt}
            onRequestResetCustomer={openResetPrompt}
            onNotify={notify}
            refreshTick={refreshTick}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (combined sticky top+bottom < 15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#FAF8F3]/95 dark:bg-[#09090B]/95 backdrop-blur-md border-t border-stone-200 dark:border-white/10 grid grid-cols-3 items-center"
      >
        <button
          type="button"
          onClick={() => setView('card')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            view === 'card'
              ? 'text-[#9E7B2B] dark:text-[#E3C168]'
              : 'text-stone-500 dark:text-[#A8A298]'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>Stamp Card</span>
        </button>

        <button
          type="button"
          onClick={() => setView('member')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            view === 'member'
              ? 'text-[#9E7B2B] dark:text-[#E3C168]'
              : 'text-stone-500 dark:text-[#A8A298]'
          }`}
        >
          <UserSearch className="w-5 h-5" />
          <span>Find / Join</span>
        </button>

        <button
          type="button"
          onClick={() => setView('admin')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            view === 'admin'
              ? 'text-[#9E7B2B] dark:text-[#E3C168]'
              : 'text-stone-500 dark:text-[#A8A298]'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>Admin</span>
        </button>
      </nav>

      {/* Secure PIN Modal */}
      <PinModal
        open={pinAction !== null}
        title={
          pinAction?.kind === 'stamp'
            ? 'Authorize Stamp'
            : pinAction?.kind === 'reset'
              ? 'Authorize Card Reset'
              : 'Admin Sign In'
        }
        subtitle={
          pinAction?.kind === 'stamp'
            ? `Adding stamp ${pinAction.card.stampsCount + 1}/${pinAction.card.totalStamps} for ${pinAction.card.name}`
            : pinAction?.kind === 'reset'
              ? `Redeem reward and reset ${pinAction.card.cardCode} (${pinAction.card.name})`
              : 'Enter your staff PIN to access the YOS COLLECTION console'
        }
        confirmLabel={
          pinAction?.kind === 'stamp'
            ? 'Verify PIN & Add Stamp'
            : pinAction?.kind === 'reset'
              ? 'Verify PIN & Reset Card'
              : 'Unlock Admin Console'
        }
        showNoteField={pinAction?.kind === 'stamp' || pinAction?.kind === 'reset'}
        defaultNote={
          pinAction?.kind === 'reset'
            ? 'Reward redeemed in boutique'
            : 'In-store purchase verified'
        }
        loading={pinLoading}
        error={pinError}
        onClose={() => {
          if (!pinLoading) {
            setPinAction(null);
            setPinError(null);
          }
        }}
        onSubmit={handlePinSubmit}
      />
    </div>
  );
}
