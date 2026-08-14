/** PaymentCodePanel — §6.13 payment-code block (booking.md Stage 3).
 *  Giant mono code on dashed gold panel, copy button, steps, Vault CTA. */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, LockKeyhole } from 'lucide-react';
import type { PaymentCode } from '@/lib/store';
import { formatZAR } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';

interface Props {
  code: PaymentCode;
  holdEndsAt?: number;
  onPayVault: () => void;
  onCancel: () => void;
}

export default function PaymentCodePanel({ code, holdEndsAt, onPayVault, onCancel }: Props) {
  const [typed, setTyped] = useState(0);
  const [copied, setCopied] = useState(false);

  // characters type in one-by-one (60ms apart)
  useEffect(() => {
    setTyped(0);
    const t = window.setInterval(() => {
      setTyped((n) => {
        if (n >= code.code.length) {
          window.clearInterval(t);
          return n;
        }
        return n + 1;
      });
    }, 60);
    return () => window.clearInterval(t);
  }, [code.code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="card-surface mx-auto max-w-xl rounded-ysl-l p-7 text-center shadow-ysl-lg sm:p-9">
      <p className="eyebrow center justify-center">Secure payment</p>
      <h2 className="display-2 mt-3">
        Pay with your <em style={{ color: 'var(--ysl-purple)' }}>payment code</em>
      </h2>

      {holdEndsAt !== undefined && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-pill px-4 py-2" style={{ background: 'rgba(232,161,58,.12)' }}>
          <span className="text-[11px] font-medium uppercase tracking-[.14em]" style={{ color: 'var(--ysl-amber)' }}>
            Code expires in
          </span>
          <CountdownTimer endsAt={holdEndsAt} variant="hold" compact />
        </div>
      )}

      {/* code panel */}
      <motion.div
        className="mt-6 rounded-ysl-l px-5 py-7"
        style={{ border: '2px dashed var(--ysl-gold)', background: 'var(--ysl-cream)' }}
        animate={{ boxShadow: ['0 0 0 rgba(212,175,106,0)', '0 0 34px rgba(212,175,106,.35)', '0 0 0 rgba(212,175,106,0)'] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <p
          className="font-mono font-bold"
          style={{ fontSize: 'clamp(1.7rem, 6vw, 3.1rem)', letterSpacing: '.12em', color: 'var(--ysl-violet-deep)', minHeight: '1.2em' }}
          aria-label={code.code}
        >
          {code.code.slice(0, typed)}
          {typed < code.code.length && <span className="animate-caret-blink" style={{ color: 'var(--ysl-gold)' }}>▍</span>}
        </p>
        <button
          onClick={copy}
          className="mt-4 inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-[12px] font-medium uppercase tracking-[.14em] transition-all"
          style={{
            border: '1px solid var(--ysl-line)',
            background: copied ? 'rgba(30,158,106,.12)' : 'var(--ysl-surface)',
            color: copied ? 'var(--ysl-success)' : 'var(--ysl-ink)',
          }}
        >
          {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </motion.div>

      {/* amount */}
      <p className="mt-5 text-sm" style={{ color: 'var(--ysl-muted)' }}>
        Amount due now
      </p>
      <p className="font-serif text-4xl font-bold" style={{ color: 'var(--ysl-gold)' }}>
        {formatZAR(code.amount)}
      </p>
      <p className="mt-1 text-xs" style={{ color: 'var(--ysl-muted)' }}>
        Full payment via Vault — nothing more due at the salon.
      </p>

      {/* steps */}
      <ol className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm">
        {['Copy your single-use code', 'Pay at Youna Venture Vault', 'We confirm your ticket instantly'].map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
              style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)' }}
            >
              {i + 1}
            </span>
            <span style={{ color: 'var(--ysl-ink)' }}>{s}</span>
          </li>
        ))}
      </ol>

      {/* vault CTA */}
      <button onClick={onPayVault} className="btn btn-gold mt-7 w-full sm:w-auto">
        Pay at Youna Venture Vault
      </button>
      <div className="mt-3 flex items-center justify-center gap-2">
        <img src="/vault-logo.svg" alt="Youna Venture Vault" className="h-5" style={{ filter: 'var(--ysl-vault-filter, none)' }} />
        <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>
          Youna Venture Vault is our secure payment partner
        </span>
      </div>

      <p className="mx-auto mt-5 flex max-w-sm items-start justify-center gap-2 text-xs leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
        <LockKeyhole size={13} className="mt-0.5 shrink-0" />
        Single-use code · expires with your hold · we never see your card.
      </p>

      <button
        onClick={onCancel}
        className="mt-5 text-[12px] font-medium uppercase tracking-[.14em] underline-offset-4 transition-colors hover:underline"
        style={{ color: 'var(--ysl-danger)' }}
      >
        Problems? Cancel booking
      </button>
    </div>
  );
}
