import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Landmark, HandCoins, PiggyBank } from 'lucide-react';
import type { Salon } from '@/lib/store';
import { useStoreState, getService, getUserById } from '@/lib/store';
import { formatZAR, formatDateShort, formatZARShort } from '@/lib/format';
import { TabHeader, useCountUp, EmptyState } from '@/components/dash/ui';

/** T6 · Earnings (dashboard.md): hero number, deposits/remainder/commission/
 *  payout summary, 8-week CSS bar chart, recent payments table.
 *  Demo model: students pay a 50% deposit via the Vault; the balance is
 *  collected at the salon. YSL takes a 15% commission on Vault deposits. */

const DEPOSIT_RATE = 0.5;
const COMMISSION = 0.15;

export default function EarningsTab({ salon }: { salon: Salon }) {
  const state = useStoreState();

  const data = useMemo(() => {
    const bookingIds = new Map(state.bookings.filter((b) => b.salonId === salon.id).map((b) => [b.id, b]));
    const codes = state.paymentCodes
      .filter((c) => bookingIds.has(c.bookingId) && (c.status === 'paid' || c.status === 'confirmed'))
      .sort((a, b) => b.issuedAt - a.issuedAt);

    const deposits = codes.reduce((sum, c) => sum + c.amount * DEPOSIT_RATE, 0);
    const completedTotal = state.bookings
      .filter((b) => b.salonId === salon.id && b.status === 'completed')
      .reduce((sum, b) => sum + b.priceCharged * (1 - DEPOSIT_RATE), 0);
    const commission = deposits * COMMISSION;
    const payout = deposits - commission;

    const now = new Date();
    const thisMonth = codes
      .filter((c) => { const d = new Date(c.issuedAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((sum, c) => sum + c.amount * DEPOSIT_RATE * (1 - COMMISSION), 0);

    // 8 weekly buckets (oldest → newest)
    const weeks: { label: string; total: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = Date.now() - (w + 1) * 7 * 86400000;
      const end = Date.now() - w * 7 * 86400000;
      const total = codes
        .filter((c) => c.issuedAt > start && c.issuedAt <= end)
        .reduce((sum, c) => sum + c.amount * DEPOSIT_RATE, 0);
      const d = new Date(end);
      weeks.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, total });
    }

    return { codes, deposits, completedTotal, commission, payout, thisMonth, weeks, bookingIds };
  }, [state, salon.id]);

  const animMonth = useCountUp(data.thisMonth);
  const maxWeek = Math.max(1, ...data.weeks.map((w) => w.total));

  return (
    <div>
      <TabHeader
        title="Earnings"
        note="Students pay a 50% deposit via Youna Venture Vault; the balance is collected at your chair. YSL commission: 15% of deposits."
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* hero number card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="deep-section overflow-hidden rounded-[var(--radius-l)] p-8"
          style={{ borderRadius: 'var(--radius-l)' }}
        >
          <p className="eyebrow eyebrow-gold">This month · payout estimate</p>
          <p className="mt-4 font-serif text-5xl font-bold leading-none" style={{ color: 'var(--ysl-gold-light)' }}>
            {formatZAR(Math.round(animMonth))}
          </p>
          <div className="mt-8 space-y-4 text-sm">
            {[
              { icon: <Wallet size={15} />, label: 'Deposits received via Vault', value: data.deposits },
              { icon: <HandCoins size={15} />, label: 'Balances collected at salon', value: data.completedTotal },
              { icon: <Landmark size={15} />, label: 'YSL commission (15%)', value: -data.commission },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'rgba(240,230,255,.12)' }}>
                <span className="flex items-center gap-2.5" style={{ color: 'rgba(242,236,250,.8)' }}>
                  {row.icon} {row.label}
                </span>
                <span className="font-serif text-lg font-semibold" style={{ color: row.value < 0 ? 'var(--ysl-danger)' : 'var(--ysl-gold-light)' }}>
                  {row.value < 0 ? `−${formatZAR(Math.abs(row.value))}` : formatZAR(row.value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="flex items-center gap-2.5 font-medium" style={{ color: 'var(--ysl-gold-light)' }}>
                <PiggyBank size={15} /> Estimated payout
              </span>
              <span className="font-serif text-2xl font-bold" style={{ color: 'var(--ysl-gold-light)' }}>
                {formatZAR(data.payout)}
              </span>
            </div>
          </div>
          <p className="mt-6 text-xs leading-relaxed" style={{ color: 'rgba(242,236,250,.6)' }}>
            Payouts land weekly via the Vault. Demo figures — 50% deposit model.
          </p>
        </motion.div>

        {/* bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="card-surface flex flex-col p-7"
        >
          <h3 className="font-serif text-xl font-semibold">Deposits — last 8 weeks</h3>
          <div className="mt-6 flex flex-1 items-end gap-3" style={{ minHeight: 220 }}>
            {data.weeks.map((w, i) => (
              <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-2 self-stretch">
                <div className="pointer-events-none absolute -top-1 rounded-md px-2 py-1 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }}>
                  {formatZAR(w.total)}
                </div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(3, (w.total / maxWeek) * 100)}%` }}
                  transition={{ duration: 0.6, delay: 0.15 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full rounded-t-md"
                  style={{
                    background: i === data.weeks.length - 1
                      ? 'linear-gradient(180deg, var(--ysl-gold-light), var(--ysl-gold))'
                      : 'var(--ysl-lilac)',
                    border: i === data.weeks.length - 1 ? 'none' : '1px solid var(--ysl-line)',
                  }}
                />
                <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ysl-muted)' }}>{w.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* recent payments */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        className="card-surface mt-6 overflow-hidden"
      >
        <h3 className="border-b px-6 py-4 font-serif text-xl font-semibold hairline">Recent Vault payments</h3>
        {data.codes.length === 0 ? (
          <EmptyState title="No payments yet" note="When a student pays a deposit with their YSL code, it appears here instantly." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-[.15em] hairline" style={{ color: 'var(--ysl-muted)' }}>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Service</th>
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 text-right font-medium">Deposit</th>
                  <th className="px-6 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.codes.slice(0, 8).map((c) => {
                  const b = data.bookingIds.get(c.bookingId);
                  const customer = b ? getUserById(b.userId) : undefined;
                  return (
                    <tr key={c.id} className="border-b transition-colors last:border-0 hover:bg-ysl-lilac/40 hairline">
                      <td className="px-6 py-3.5">{b ? formatDateShort(b.date) : '—'}</td>
                      <td className="px-3 py-3.5">{customer?.name ?? 'Customer'}</td>
                      <td className="px-3 py-3.5" style={{ color: 'var(--ysl-muted)' }}>{b ? getService(b.serviceId)?.name : '—'}</td>
                      <td className="px-3 py-3.5 font-mono text-xs">{c.code}</td>
                      <td className="px-3 py-3.5 text-right font-serif text-base font-semibold">
                        {formatZARShort(c.amount * DEPOSIT_RATE)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`chip ${c.status === 'confirmed' ? 'chip-success' : 'chip-amber'}`}>
                          {c.status === 'confirmed' ? '✓ confirmed' : 'paid'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
