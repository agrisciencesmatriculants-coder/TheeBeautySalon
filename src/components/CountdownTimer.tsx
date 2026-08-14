import { useEffect, useState } from 'react';
import { countdownParts } from '@/lib/format';

/** CountdownTimer — flip-digit chips (design.md §6.7).
 *  variant 'special' (magenta) | 'hold' (amber, m:s) | 'grad' (gold, d/h/m). */

interface Props {
  endsAt: number; // epoch ms
  variant?: 'special' | 'hold' | 'grad';
  label?: string;
  compact?: boolean;
  className?: string;
}

export default function CountdownTimer({ endsAt, variant = 'special', label, compact = false, className = '' }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const ms = endsAt - now;
  const c = countdownParts(ms);
  const color =
    variant === 'special' ? 'var(--ysl-special)' : variant === 'hold' ? 'var(--ysl-amber)' : 'var(--ysl-gold)';
  const urgent = ms > 0 && ms < 60_000;
  const segments: string[] = [];
  if (variant !== 'hold' && c.days > 0) segments.push(`${c.d}d`);
  if (variant !== 'hold' || c.hours > 0) segments.push(c.h);
  segments.push(c.m, c.s);

  if (ms <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[.12em] ${className}`}
        style={{ color: 'var(--ysl-muted)' }}>
        {label ? `${label} · ` : ''}Ended
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${urgent ? 'countdown-urgent' : ''} ${className}`}
      style={{ color }}
      aria-live="off"
    >
      {label && !compact && (
        <span className="text-[10px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
          {label}
        </span>
      )}
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="opacity-60">:</span>}
          <span className="flip-digit">{seg}</span>
        </span>
      ))}
    </span>
  );
}
