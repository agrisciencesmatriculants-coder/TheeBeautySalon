import { useEffect, useState } from 'react';
import { countdownParts } from '@/lib/format';

/** GiantCountdown — ceremony countdown with gold flip digits d/h/m/s (graduation.md S1). */

interface Props {
  endsAt: number; // epoch ms
  className?: string;
}

export default function GiantCountdown({ endsAt, className = '' }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const ms = endsAt - now;
  const c = countdownParts(ms);
  const cells: { v: string; label: string }[] = [
    { v: c.d, label: 'days' },
    { v: c.h, label: 'hours' },
    { v: c.m, label: 'min' },
    { v: c.s, label: 'sec' },
  ];

  if (ms <= 0) {
    return (
      <p className={`font-serif text-3xl italic ${className}`} style={{ color: 'var(--grad-gold)' }}>
        The caps have flown — congratulations, graduates!
      </p>
    );
  }

  return (
    <div className={`flex items-start justify-center gap-3 sm:gap-5 ${className}`} aria-live="off">
      {cells.map((cell, i) => (
        <div key={cell.label} className="flex items-start gap-3 sm:gap-5">
          {i > 0 && (
            <span className="pt-2 font-mono text-3xl font-bold sm:pt-3 sm:text-5xl" style={{ color: 'var(--grad-gold)', opacity: 0.6 }}>
              :
            </span>
          )}
          <div className="text-center">
            <div
              className="flip-digit !px-3 !py-2 text-3xl sm:!px-4 sm:!py-3 sm:text-5xl"
              style={{
                color: 'var(--grad-gold)',
                background: 'rgba(255,255,255,.10)',
                border: '1px solid rgba(242,201,76,.35)',
                borderRadius: '10px',
              }}
            >
              {cell.v}
            </div>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[.3em]" style={{ color: 'rgba(255,255,255,.75)' }}>
              {cell.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
