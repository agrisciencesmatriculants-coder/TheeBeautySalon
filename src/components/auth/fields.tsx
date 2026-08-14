import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check } from 'lucide-react';

/** Shared auth form primitives (design.md §6.10): labels, inputs with purple
 *  focus rings, inline validation captions, password eye toggle, strength
 *  meter, custom checkbox. */

export const inputCls =
  'w-full rounded-[var(--radius-s)] border px-4 py-[13px] text-[15px] transition-all outline-none ' +
  'focus:border-ysl-purple focus:[box-shadow:0_0_0_3px_rgba(139,92,246,.14)]';

export const inputStyle = {
  background: 'var(--ysl-cream)',
  borderColor: 'var(--ysl-line)',
  color: 'var(--ysl-ink)',
} as const;

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium" style={{ color: 'var(--ysl-danger)' }}>{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs" style={{ color: 'var(--ysl-muted)' }}>{hint}</span>
      ) : null}
    </label>
  );
}

interface PasswordFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  showStrength?: boolean;
  autoComplete?: string;
  placeholder?: string;
}

export function PasswordField({
  label = 'Password', value, onChange, error, showStrength = false,
  autoComplete = 'current-password', placeholder = '••••••••',
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${inputCls} pr-12 ${error ? '!border-ysl-danger' : ''}`}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors hover:bg-ysl-lilac"
          style={{ color: 'var(--ysl-muted)' }}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {showStrength && <StrengthMeter password={value} />}
    </Field>
  );
}

const STRENGTH_LABELS = ['Weak', 'Good', 'Strong', 'Great'] as const;
const SEGMENT_COLORS = ['var(--ysl-lilac)', 'var(--ysl-purple)', 'var(--ysl-purple-deep)', 'var(--ysl-gold)'] as const;

export function strengthScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.max(1, score);
}

export function StrengthMeter({ password }: { password: string }) {
  const score = strengthScore(password);
  return (
    <div className="mt-2.5" aria-hidden={!password}>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            initial={false}
            animate={{
              backgroundColor: password && i < score ? SEGMENT_COLORS[score - 1] : 'var(--ysl-lilac)',
            }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          />
        ))}
      </div>
      {password && (
        <span className="mt-1.5 block text-[11px] font-medium uppercase tracking-[.15em]"
          style={{ color: SEGMENT_COLORS[score - 1] }}>
          {STRENGTH_LABELS[score - 1]}
        </span>
      )}
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  error?: string;
}

export function Checkbox({ checked, onChange, label, error }: CheckboxProps) {
  return (
    <div>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex items-start gap-3 text-left"
      >
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border transition-all ${checked ? 'border-ysl-purple bg-ysl-purple' : ''}`}
          style={!checked ? { borderColor: error ? 'var(--ysl-danger)' : 'var(--ysl-line)', background: 'var(--ysl-surface)' } : undefined}
        >
          {checked && <Check size={13} strokeWidth={3} color="#fff" />}
        </span>
        <span className="text-sm leading-snug" style={{ color: 'var(--ysl-ink)' }}>{label}</span>
      </button>
      {error && <span className="mt-1.5 block pl-8 text-xs font-medium" style={{ color: 'var(--ysl-danger)' }}>{error}</span>}
    </div>
  );
}

/** Primary submit button with loading spinner state. */
export function SubmitButton({ loading, children, gold = false, disabled = false }: {
  loading: boolean; children: ReactNode; gold?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`btn ${gold ? 'btn-gold' : 'btn-primary'} w-full disabled:opacity-70`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {loading ? 'One moment…' : children}
    </button>
  );
}
