/** SummaryCard — sticky booking summary rail (booking.md: global chrome).
 *  The FROZEN store charges the full locked price on the payment code, so this
 *  build takes full payment via Vault (design.md allows full-payment salons). */
import type { Salon, Service } from '@/lib/store';
import { formatDate, formatZAR } from '@/lib/format';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

interface Props {
  salon: Salon;
  service: Service;
  dateIso?: string | null;
  time?: string | null;
  /** Locked totals (from booking.priceCharged) or live special-aware price. */
  total: number;
  original: number;
  specialPct?: number | null;
  specialLocked?: boolean;
  dimmed?: boolean;
}

export default function SummaryCard({
  salon, service, dateIso, time, total, original, specialPct, specialLocked = false, dimmed = false,
}: Props) {
  const savings = Math.max(0, original - total);
  return (
    <aside
      className="card-surface rounded-ysl-l p-6 transition-opacity duration-500 lg:sticky lg:top-24"
      style={dimmed ? { opacity: 0.45, filter: 'grayscale(.6)' } : undefined}
      aria-label="Booking summary"
    >
      <div className="flex items-center gap-3">
        <img src={salon.avatar} alt={salon.name} className="h-12 w-12 rounded-full object-cover" style={{ border: '2px solid var(--ysl-gold)' }} />
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-semibold leading-tight">{salon.name}</p>
          <p className="text-[11px] uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>{salon.area} · Makhanda</p>
        </div>
      </div>

      <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--ysl-line)' }}>
        <p className="font-medium leading-snug">{service.name}</p>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--ysl-muted)' }}>
          {service.durationMin >= 60 ? `${Math.floor(service.durationMin / 60)}h${service.durationMin % 60 ? ` ${service.durationMin % 60}m` : ''}` : `${service.durationMin} min`}
          {dateIso ? ` · ${formatDate(dateIso)}` : ''}
          {time ? ` · ${time}` : ''}
        </p>
        {(specialPct || specialLocked) && (
          <span className="chip chip-special mt-2">
            {specialLocked ? 'Special price locked in' : `-${specialPct}% special`}
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-2 border-t pt-4 text-sm" style={{ borderColor: 'var(--ysl-line)' }}>
        <div className="flex items-baseline justify-between gap-3">
          <dt style={{ color: 'var(--ysl-muted)' }}>Service</dt>
          <dd className={savings > 0 ? 'line-through' : 'font-medium'} style={savings > 0 ? { color: 'var(--ysl-muted)' } : undefined}>
            {formatZAR(original)}
          </dd>
        </div>
        {savings > 0 && (
          <div className="flex items-baseline justify-between gap-3" style={{ color: 'var(--ysl-special)' }}>
            <dt>Special{specialPct ? ` −${specialPct}%` : ''}</dt>
            <dd className="font-medium">−{formatZAR(savings)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t pt-2" style={{ borderColor: 'var(--ysl-line)' }}>
          <dt className="font-medium">Total</dt>
          <dd className="font-serif text-[1.35rem] font-bold leading-none">{formatZAR(total)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-medium" style={{ color: 'var(--ysl-gold)' }}>Due now via Vault</dt>
          <dd className="font-serif text-lg font-bold" style={{ color: 'var(--ysl-gold)' }}>{formatZAR(total)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt style={{ color: 'var(--ysl-muted)' }}>At the salon</dt>
          <dd style={{ color: 'var(--ysl-muted)' }}>{formatZAR(0)}</dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
        <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-success)' }} />
        Prices in ZAR. No surge pricing — the price you see is the price you pay.
      </p>
      {specialLocked && (
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
          <LockKeyhole size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-special)' }} />
          Your special price is locked in for this booking, even if the special ends.
        </p>
      )}
    </aside>
  );
}
