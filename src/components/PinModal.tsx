import React, { useEffect, useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';
import { YosCrestLogo } from './YosLogo';

interface PinModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  confirmLabel: string;
  showNoteField?: boolean;
  defaultNote?: string;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (pin: string, note: string) => void;
}

export function PinModal({
  open,
  title,
  subtitle,
  confirmLabel,
  showNoteField = false,
  defaultNote = '',
  loading = false,
  error = null,
  onClose,
  onSubmit,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [note, setNote] = useState(defaultNote);

  useEffect(() => {
    if (open) {
      setPin('');
      setNote(defaultNote);
    }
  }, [open, defaultNote]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Backspace' && document.activeElement?.tagName !== 'INPUT') {
        setPin((prev) => prev.slice(0, -1));
      } else if (/^\d$/.test(e.key) && document.activeElement?.tagName !== 'INPUT') {
        setPin((prev) => (prev.length < 8 ? prev + e.key : prev));
      } else if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && pin.length >= 4 && !loading) {
        onSubmit(pin, note);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, pin, note, loading, onClose, onSubmit]);

  if (!open) return null;

  const appendDigit = (d: string) => {
    setPin((prev) => (prev.length < 8 ? prev + d : prev));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || loading) return;
    onSubmit(pin, note);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#111114] text-[#FAF8F4] border border-[#C9A34E]/35 shadow-2xl overflow-hidden">
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3" />

        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <YosCrestLogo className="w-8 h-8 shrink-0" strokeColor="#C9A34E" textColor="#FAF8F4" />
            <div>
              <h2 id="pin-modal-title" className="font-serif text-xl font-semibold tracking-tight text-[#FAF8F4]">
                {title}
              </h2>
              <p className="text-xs text-[#A8A298] mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PIN verification"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-[#A8A298] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {/* PIN dots indicator */}
          <div>
            <div className="flex items-center justify-between text-xs text-[#A8A298] mb-2">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#C9A34E]" />
                <span>Authorized Staff PIN</span>
              </span>
              <span className="font-mono tabular-nums">{pin.length}/8</span>
            </div>
            <div className="h-14 rounded-xl bg-white/[0.04] border border-white/15 flex items-center justify-center gap-3 px-4">
              {[0, 1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-transform duration-150 ${
                    idx < pin.length
                      ? 'bg-[#D4AF37] scale-110'
                      : 'bg-white/15 scale-90'
                  }`}
                />
              ))}
              {pin.length > 4 &&
                Array.from({ length: pin.length - 4 }).map((_, extraIdx) => (
                  <span key={extraIdx + 4} className="w-3.5 h-3.5 rounded-full bg-[#D4AF37]" />
                ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-950/60 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200"
            >
              {error}
            </div>
          )}

          {showNoteField && (
            <div>
              <label htmlFor="stamp-visit-note" className="block text-xs text-[#A8A298] mb-1.5">
                Purchase / Visit Note (optional)
              </label>
              <input
                id="stamp-visit-note"
                type="text"
                maxLength={120}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Boutique purchase #409"
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A34E]"
              />
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {keys.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendDigit(digit)}
                className="min-h-[48px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.97] border border-white/10 font-mono text-lg font-medium text-white transition-all"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="min-h-[48px] rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-[#A8A298] hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => appendDigit('0')}
              className="min-h-[48px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.97] border border-white/10 font-mono text-lg font-medium text-white transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((prev) => prev.slice(0, -1))}
              aria-label="Backspace digit"
              className="min-h-[48px] rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-[#A8A298] hover:text-white transition-colors"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={pin.length < 4 || loading}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#C9A34E] via-[#E3C168] to-[#B89038] text-[#0B0B0E] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Verifying...' : confirmLabel}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
