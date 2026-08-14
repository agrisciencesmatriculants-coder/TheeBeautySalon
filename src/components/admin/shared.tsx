/** Shared admin-console primitives: theme switch, KPI count-up, modals, chips. */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/** Pill toggle switch (design.md §6.10) — purple track when on, gold variant for graduation. */
export function ThemeSwitch({
  on,
  onChange,
  gold = false,
  large = false,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  gold?: boolean;
  large?: boolean;
  label?: string;
}) {
  const trackW = large ? 64 : 48;
  const trackH = large ? 34 : 28;
  const knob = large ? 26 : 20;
  const pad = (trackH - knob) / 2;
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label ?? 'toggle'}
      onClick={() => onChange(!on)}
      className="relative shrink-0 rounded-full transition-colors duration-300"
      style={{
        width: trackW,
        height: trackH,
        background: on
          ? gold
            ? 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))'
            : 'var(--ysl-purple)'
          : 'var(--ysl-line)',
        boxShadow: on ? (gold ? '0 4px 18px rgba(212,175,106,.4)' : 'var(--glow-purple)') : 'none',
      }}
    >
      <motion.span
        className="absolute rounded-full"
        style={{
          top: pad,
          width: knob,
          height: knob,
          background: on && gold ? 'var(--ysl-violet-deep)' : 'var(--ysl-surface)',
          boxShadow: 'var(--shadow-sm)',
        }}
        animate={{ left: on ? trackW - knob - pad : pad }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/** Ease-out count-up for KPI numerals. */
export function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/** Section header — serif title + optional right-side slot. */
export function SectionHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-serif text-3xl font-semibold" style={{ color: 'var(--ysl-ink)' }}>{title}</h2>
        {sub && <p className="mt-1 text-sm" style={{ color: 'var(--ysl-muted)' }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Admin modal — scrim blur + spring panel (design.md §6.11). */
export function AdminModal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90]"
            style={{ background: 'rgba(20,8,32,.55)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed left-1/2 top-1/2 z-[100] max-h-[86vh] w-[92%] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-7"
            style={{
              maxWidth: wide ? 640 : 480,
              background: 'var(--ysl-surface)',
              border: '1px solid var(--ysl-line)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'var(--shadow-lg)',
              color: 'var(--ysl-ink)',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-serif text-2xl font-semibold">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform hover:rotate-90"
                style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-ink)' }}
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Brevo-branded email preview modal (design.md §8.8). */
export function EmailPreviewModal({
  open,
  onClose,
  subject,
  to,
  body,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  to: string;
  body: string;
}) {
  return (
    <AdminModal open={open} onClose={onClose} title="Email sent via Brevo" wide>
      <div
        className="overflow-hidden"
        style={{ border: '1px solid var(--ysl-line)', borderRadius: 'var(--radius-m)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--ysl-violet-deep)' }}>
          <span className="text-[11px] font-medium uppercase tracking-[.2em]" style={{ color: 'var(--ysl-gold-light)' }}>
            Brevo · transactional
          </span>
          <span className="text-[11px]" style={{ color: 'var(--ysl-muted)' }}>demo preview</span>
        </div>
        <div className="space-y-2 px-5 py-4 text-sm">
          <p><span style={{ color: 'var(--ysl-muted)' }}>To:</span> {to}</p>
          <p><span style={{ color: 'var(--ysl-muted)' }}>Subject:</span> <strong>{subject}</strong></p>
          <div className="mt-3 p-4" style={{ background: 'var(--ysl-cream)', borderRadius: 'var(--radius-s)', border: '1px dashed var(--ysl-line)' }}>
            <p className="font-serif text-lg font-semibold" style={{ color: 'var(--ysl-purple-deep)' }}>Young Space Lighty</p>
            <p className="mt-2 leading-relaxed" style={{ color: 'var(--ysl-ink)' }}>{body}</p>
          </div>
        </div>
      </div>
      <button onClick={onClose} className="btn btn-primary mt-5 w-full !py-3 text-[11px]">Close preview</button>
    </AdminModal>
  );
}

/** Small labelled input wrapper. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  background: 'var(--ysl-cream)',
  border: '1px solid var(--ysl-line)',
  borderRadius: 'var(--radius-s)',
  color: 'var(--ysl-ink)',
  padding: '11px 14px',
  fontSize: 14,
  width: '100%',
};

/** Filter pill row. */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className="chip transition-all"
            style={{
              background: active ? 'var(--ysl-violet-deep)' : 'var(--ysl-lilac)',
              color: active ? 'var(--ysl-gold-light)' : 'var(--ysl-purple)',
              padding: '8px 16px',
            }}
          >
            {o.label}
            {o.count !== undefined && <span className="opacity-70">· {o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
