/** VaultOverlay — simulated Youna Venture Vault partner page (booking.md Stage 4).
 *  Deliberately different visual identity (deep ink-teal, no YSL purple) so it
 *  reads as a separate company. Pay → ~3s processing (the simulated signed
 *  callback) → payWithVault → onSuccess. */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import type { PaymentCode } from '@/lib/store';
import { payWithVault } from '@/lib/store';
import { formatZAR } from '@/lib/format';

type Phase = 'idle' | 'bank' | 'signing' | 'done' | 'error';

interface Props {
  open: boolean;
  code: PaymentCode;
  payerName: string;
  payerEmail: string;
  onSuccess: () => void;
  onFail: () => void;
  onClose: () => void;
}

export default function VaultOverlay({ open, code, payerName, payerEmail, onSuccess, onFail, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (open) {
      setPhase('idle');
      setError(null);
    }
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [open]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const pay = () => {
    if (phase !== 'idle' && phase !== 'error') return;
    setPhase('bank');
    setError(null);
    later(1300, () => setPhase('signing'));
    later(2900, () => {
      const res = payWithVault(code.id);
      if (res.ok) {
        setPhase('done');
        later(650, onSuccess);
      } else {
        setPhase('error');
        setError(res.error ?? 'Payment failed.');
      }
    });
  };

  const busy = phase === 'bank' || phase === 'signing' || phase === 'done';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] overflow-y-auto bg-[#0C1B21] text-[#E7F2EF]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 py-8">
            {/* vault chrome */}
            <div className="flex items-center justify-between">
              <img src="/vault-logo.svg" alt="Youna Venture Vault" className="h-8" />
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[.15em] text-[#7BA79E]">
                <ShieldCheck size={13} /> Secure checkout
              </span>
            </div>

            {/* card */}
            <motion.div
              className="mt-10 rounded-2xl border border-[#1E3942] bg-[#11242B] p-7 shadow-2xl sm:p-8"
              initial={{ opacity: 0, scale: 0.92, y: 26 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.1 }}
            >
              <p className="text-[11px] uppercase tracking-[.2em] text-[#7BA79E]">Payment request</p>
              <h1 className="mt-2 font-serif text-2xl font-semibold leading-snug text-white">
                Young Space Lighty (YSL) Mega Beauty Salon
              </h1>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[#1E3942] pb-3">
                  <dt className="text-[#7BA79E]">Reference</dt>
                  <dd className="font-mono font-bold tracking-[.12em] text-[#A8E6CF]">{code.code}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[#1E3942] pb-3">
                  <dt className="text-[#7BA79E]">Amount</dt>
                  <dd className="text-lg font-semibold text-white">{formatZAR(code.amount)} <span className="text-xs text-[#7BA79E]">ZAR</span></dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[#1E3942] pb-3">
                  <dt className="text-[#7BA79E]">Payer</dt>
                  <dd className="text-right text-white">{payerName}<br /><span className="text-xs text-[#7BA79E]">{payerEmail}</span></dd>
                </div>
              </dl>

              {/* pay button with idle shimmer */}
              <button
                onClick={pay}
                disabled={busy}
                className="relative mt-7 w-full overflow-hidden rounded-full py-4 text-[13px] font-semibold uppercase tracking-[.15em] text-[#06201C] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0FA37E, #35C99B)' }}
              >
                {!busy && (
                  <motion.span
                    className="pointer-events-none absolute inset-y-0 w-1/3"
                    style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent)' }}
                    animate={{ x: ['-140%', '420%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                  />
                )}
                {phase === 'idle' && <>Pay Young Space Lighty — {formatZAR(code.amount)}</>}
                {phase === 'bank' && (
                  <span className="inline-flex items-center gap-2.5">
                    <VaultDoor /> Contacting your bank…
                  </span>
                )}
                {phase === 'signing' && (
                  <span className="inline-flex items-center gap-2.5">
                    <VaultDoor /> Signing receipt…
                  </span>
                )}
                {phase === 'done' && (
                  <span className="inline-flex items-center gap-2.5">
                    <Check size={16} strokeWidth={3} /> Paid — redirecting…
                  </span>
                )}
                {phase === 'error' && 'Try payment again'}
              </button>

              {phase === 'error' && (
                <p className="mt-3 text-center text-xs" style={{ color: '#E89A9A' }}>{error}</p>
              )}

              <div className="mt-5 flex items-center justify-between text-xs text-[#5E857D]">
                <span>Secured by Youna Venture Vault · Demo simulation</span>
                {!busy && (
                  <button onClick={onFail} className="underline underline-offset-2 transition-colors hover:text-[#A8E6CF]">
                    Simulate failed payment
                  </button>
                )}
              </div>
            </motion.div>

            {!busy && (
              <button
                onClick={onClose}
                className="mx-auto mt-6 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[.15em] text-[#7BA79E] transition-colors hover:text-white"
              >
                <ArrowLeft size={14} /> Back to Young Space Lighty
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Rotating vault-door spinner. */
function VaultDoor() {
  return (
    <motion.svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx="12" cy="12" r="9" strokeDasharray="42 14" />
      <circle cx="12" cy="12" r="3.5" />
    </motion.svg>
  );
}
