import React, { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import type { LoyaltySettings } from '../types';
import { YosCrestLogo } from './YosLogo';

interface CustomerLookupPanelProps {
  settings: LoyaltySettings;
  lookupLoading: boolean;
  lookupError: string | null;
  onLookup: (query: string) => void;
  onRegister: (name: string, mobile: string) => Promise<boolean>;
}

const SHOWCASE_IMAGE = '/src/assets/images/yos_boutique_showcase_1795616087122.jpg';

export function CustomerLookupPanel({
  settings,
  lookupLoading,
  lookupError,
  onLookup,
  onRegister,
}: CustomerLookupPanelProps) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onLookup(query.trim());
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    if (name.trim().length < 2) {
      setRegisterError('Please enter the customer full name.');
      return;
    }
    if (mobile.replace(/\D/g, '').length < 6) {
      setRegisterError('Please enter a valid mobile number (at least 6 digits).');
      return;
    }
    setRegistering(true);
    try {
      const ok = await onRegister(name.trim(), mobile.trim());
      if (ok) {
        setName('');
        setMobile('');
      }
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <aside className="space-y-6">
      {/* Find Existing Card */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-5 sm:p-6">
        <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-[#FAF8F4]">
          Find Loyalty Card
        </h3>
        <p className="text-xs text-stone-500 dark:text-[#A8A298] mt-1">
          Search by customer mobile number or card code.
        </p>

        <form onSubmit={handleLookupSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-stone-400 dark:text-[#8D8576] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mobile or YOS-1042"
              aria-label="Mobile number or card code"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-[#FAF8F4] placeholder:text-stone-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#C9A34E]"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !query.trim()}
            className="min-h-[44px] px-4 rounded-xl bg-[#111114] dark:bg-[#C9A34E] text-[#FAF8F4] dark:text-[#0B0B0E] text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {lookupLoading ? 'Finding...' : 'Open Card'}
          </button>
        </form>

        {lookupError && (
          <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
            {lookupError}
          </p>
        )}

        <div className="mt-4 pt-3.5 border-t border-stone-100 dark:border-white/10 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500 dark:text-[#A8A298]">
          <span>Sample cards:</span>
          {['YOS-1042', 'YOS-1088', 'YOS-1105'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setQuery(code);
                onLookup(code);
              }}
              className="font-mono tabular-nums text-stone-800 dark:text-[#E3C168] hover:underline underline-offset-4 py-1"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Create New Customer Card */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-[#FAF8F4]">
            Issue New Card
          </h3>
          <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-[#C9A34E]">
            {settings.defaultTotalStamps} stamps
          </span>
        </div>
        <p className="text-xs text-stone-500 dark:text-[#A8A298] mt-1">
          Register a customer name and mobile number to generate a unique YOS COLLECTION card.
        </p>

        <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="new-cust-name" className="block text-xs text-stone-600 dark:text-[#A8A298] mb-1">
              Full Name
            </label>
            <input
              id="new-cust-name"
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nadia Karim"
              className="w-full h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm text-stone-900 dark:text-[#FAF8F4] placeholder:text-stone-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#C9A34E]"
            />
          </div>

          <div>
            <label htmlFor="new-cust-mobile" className="block text-xs text-stone-600 dark:text-[#A8A298] mb-1">
              Mobile Number
            </label>
            <input
              id="new-cust-mobile"
              type="tel"
              maxLength={32}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. +1 555 0199"
              className="w-full h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/15 text-sm font-mono text-stone-900 dark:text-[#FAF8F4] placeholder:text-stone-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#C9A34E]"
            />
          </div>

          {registerError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {registerError}
            </p>
          )}

          <button
            type="submit"
            disabled={registering}
            className="w-full min-h-[44px] px-4 rounded-xl border border-stone-900 dark:border-[#C9A34E]/60 bg-stone-900 dark:bg-transparent text-white dark:text-[#E3C168] hover:bg-stone-800 dark:hover:bg-[#C9A34E]/10 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{registering ? 'Creating Card...' : 'Create Loyalty Card'}</span>
          </button>
        </form>
      </div>

      {/* Reward Showcase Card */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] overflow-hidden">
        <div className="aspect-video w-full bg-[#141418] relative overflow-hidden">
          {!imgFailed ? (
            <img
              src={SHOWCASE_IMAGE}
              alt="YOS COLLECTION signature black and gold gift box on white marble"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#141418] to-[#231D12] p-6 text-center">
              <YosCrestLogo className="w-10 h-10 mb-2" strokeColor="#C9A34E" textColor="#FAF8F4" />
              <p className="font-serif text-base text-[#FAF8F4]">YOS COLLECTION</p>
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-xs text-[#A38132] dark:text-[#C9A34E] font-medium">Member Privilege</p>
          <h4 className="font-serif text-lg font-semibold text-stone-900 dark:text-[#FAF8F4] mt-0.5">
            {settings.rewardTitle}
          </h4>
          <p className="text-xs text-stone-600 dark:text-[#A8A298] mt-1 leading-relaxed">
            {settings.rewardSubtitle}
          </p>
        </div>
      </div>
    </aside>
  );
}
