import React from 'react';
import { motion } from 'motion/react';
import { Award, Lock, RotateCcw, Stamp } from 'lucide-react';
import type { CustomerCard, LoyaltySettings, StampEvent } from '../types';
import { THEME_OPTIONS } from './ThemeConfig';
import { YosCrestLogo, YosStampGraphic } from './YosLogo';

interface LoyaltyCardProps {
  card: CustomerCard;
  settings: LoyaltySettings;
  history: StampEvent[];
  justStampedSlot: number | null;
  onRequestAddStamp: () => void;
  onRequestReset: () => void;
}

export function LoyaltyCard({
  card,
  settings,
  history,
  justStampedSlot,
  onRequestAddStamp,
  onRequestReset,
}: LoyaltyCardProps) {
  const activeThemeId = card.colorTheme || settings.colorTheme;
  const activeDesign = card.stampDesign || settings.stampDesign;
  const theme = THEME_OPTIONS[activeThemeId] || THEME_OPTIONS['obsidian-gold'];

  const totalSlots = Math.max(4, card.totalStamps || 6);
  const filledCount = Math.min(totalSlots, Math.max(0, card.stampsCount));
  const isComplete = filledCount >= totalSlots;
  const progressPct = Math.round((filledCount / totalSlots) * 100);

  // Responsive grid columns tailored to stamp slot count
  const gridColsClass =
    totalSlots <= 6
      ? 'grid-cols-3'
      : totalSlots <= 8
        ? 'grid-cols-4'
        : totalSlots <= 10
          ? 'grid-cols-5'
          : 'grid-cols-4 sm:grid-cols-6';

  return (
    <div className="space-y-6">
      {/* Main Physical-Inspired Digital Loyalty Card */}
      <section
        aria-label="YOS COLLECTION Digital Stamp Card"
        className={`relative rounded-3xl border p-6 sm:p-8 shadow-xl transition-colors duration-200 ${theme.cardBg} ${theme.cardBorder} ${theme.cardText}`}
      >
        {/* Top Row: Brand Mark & Card Progress */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-current/10">
          <div className="flex items-center gap-3.5">
            <YosCrestLogo
              className="w-11 h-11 shrink-0"
              strokeColor={activeThemeId === 'champagne-noir' ? '#0E0E11' : '#C9A34E'}
              textColor={activeThemeId === 'ivory-gold' ? '#111114' : activeThemeId === 'champagne-noir' ? '#0E0E11' : '#FAF8F4'}
            />
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-wide leading-none">
                YOS COLLECTION
              </h2>
              <p className={`text-xs mt-1.5 ${theme.cardMuted}`}>
                <span>{settings.brandTagline}</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="font-mono tabular-nums">{card.cardCode}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums leading-none">
              {filledCount}/{totalSlots}
            </div>
            <p className={`text-xs mt-1.5 tabular-nums ${theme.cardMuted}`}>
              <span>{progressPct}% complete</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>Cycle {card.completedCycles + 1}</span>
            </p>
          </div>
        </div>

        {/* Customer Identity Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <div>
            <p className={`text-xs ${theme.cardMuted}`}>Cardholder</p>
            <p className="font-semibold text-base sm:text-lg tracking-tight mt-0.5">{card.name}</p>
          </div>
          <div className="sm:text-right">
            <p className={`text-xs ${theme.cardMuted}`}>Mobile Number</p>
            <p className="font-mono text-sm sm:text-base tabular-nums mt-0.5">{card.mobile}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`h-1.5 w-full rounded-full overflow-hidden mb-6 ${theme.progressTrack}`}>
          <motion.div
            className={`h-full rounded-full ${theme.progressFill}`}
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Stamp Grid */}
        <div className={`grid ${gridColsClass} gap-3 sm:gap-4`}>
          {Array.from({ length: totalSlots }).map((_, index) => {
            const slotNumber = index + 1;
            const isStamped = slotNumber <= filledCount;
            const isNewlyStamped = justStampedSlot === slotNumber;

            return (
              <div
                key={slotNumber}
                aria-label={`Stamp slot ${slotNumber} of ${totalSlots}: ${isStamped ? 'Stamped' : 'Empty'}`}
                className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 transition-colors duration-200 ${
                  isStamped
                    ? `${theme.slotFilledBg} ${theme.slotFilledBorder}`
                    : `${theme.slotEmptyBg} ${theme.slotEmptyBorder} border-dashed`
                }`}
              >
                {isStamped ? (
                  <motion.div
                    key={`stamped-${card.id}-${slotNumber}-${card.completedCycles}`}
                    initial={
                      isNewlyStamped
                        ? { scale: 1.45, opacity: 0, rotate: -14 }
                        : { scale: 1, opacity: 1, rotate: -3 }
                    }
                    animate={{ scale: 1, opacity: 1, rotate: -3 }}
                    transition={{
                      type: 'spring',
                      stiffness: 340,
                      damping: 22,
                    }}
                    className="flex flex-col items-center justify-center"
                  >
                    <YosStampGraphic
                      design={activeDesign}
                      inkColor={theme.stampInk}
                      accentColor={theme.stampAccent}
                      className="w-12 h-12 sm:w-14 sm:h-14"
                    />
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-dashed ${theme.slotEmptyBorder} flex items-center justify-center`}
                    >
                      <span className={`font-mono text-xs tabular-nums ${theme.slotEmptyText}`}>
                        {String(slotNumber).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                )}

                <span
                  className={`absolute bottom-1.5 right-2 font-mono text-[10px] tabular-nums ${
                    isStamped ? 'opacity-65 text-[#E3C168]' : theme.slotEmptyText
                  }`}
                >
                  {slotNumber}
                </span>
              </div>
            );
          })}
        </div>

        {/* Congratulations Banner when Completed */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`mt-6 rounded-2xl border p-5 ${
              activeThemeId === 'obsidian-gold'
                ? 'bg-[#221C10] border-[#D4AF37]/60 text-[#FAF8F4]'
                : 'bg-[#111114] border-[#C9A34E] text-[#FAF8F4]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-[#E3C168]" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-[#E3C168]">
                    Congratulations, {card.name}
                  </h3>
                  <p className="text-sm font-medium text-white mt-0.5">{settings.rewardTitle}</p>
                  <p className="text-xs text-[#B8B1A5] mt-1">{settings.rewardSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestReset}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E3C168] text-[#0B0B0E] font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Redeem &amp; Reset Card</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Primary Action Footer */}
        <div className="mt-6 pt-5 border-t border-current/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className={`text-xs flex items-center gap-2 ${theme.cardMuted}`}>
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isComplete
                ? 'All slots completed — redeem reward and reset with staff PIN.'
                : 'Staff PIN required to authorize each new stamp.'}
            </span>
          </div>

          <button
            type="button"
            disabled={isComplete}
            onClick={onRequestAddStamp}
            className={`min-h-[48px] px-6 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${theme.ctaBg} ${theme.ctaText}`}
          >
            <Stamp className="w-4 h-4" />
            <span>{isComplete ? 'Card Completed' : 'Add Stamp'}</span>
          </button>
        </div>
      </section>

      {/* Customer Stamp History */}
      <section className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#111114] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-100 dark:border-white/10">
          <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-[#FAF8F4]">
            Card Stamp History
          </h3>
          <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-[#A8A298]">
            {history.length} {history.length === 1 ? 'entry' : 'entries'} · {card.completedCycles} completed{' '}
            {card.completedCycles === 1 ? 'cycle' : 'cycles'}
          </span>
        </div>

        {history.length === 0 ? (
          <p className="py-6 text-sm text-stone-500 dark:text-[#A8A298] text-center">
            No stamps recorded on this card yet. Present this card in-store to earn your first stamp.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-white/10">
            {history.slice(0, 12).map((evt) => (
              <li key={evt.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 dark:text-[#FAF8F4] truncate">
                    {evt.eventType === 'STAMP_ADDED'
                      ? `Slot ${evt.slotNumber} Stamped`
                      : evt.eventType === 'CYCLE_RESET'
                        ? `Cycle ${evt.cycleNumber} Redeemed & Reset`
                        : 'Card Updated by Admin'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-[#A8A298] truncate mt-0.5">
                    <span>Cycle {evt.cycleNumber}</span>
                    {evt.note ? (
                      <>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        <span>{evt.note}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <time
                  dateTime={evt.createdAt}
                  className="text-xs font-mono tabular-nums text-stone-500 dark:text-[#A8A298] whitespace-nowrap shrink-0"
                >
                  {new Date(evt.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  {new Date(evt.createdAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
