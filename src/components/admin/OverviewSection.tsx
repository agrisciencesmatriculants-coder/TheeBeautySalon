/** T1 · Overview — KPI cards, 14-day bookings bar chart, category donut,
 *  latest bookings / pending special requests / recent audit (admin.md T1). */
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BadgePercent, Banknote, CalendarCheck, Store, Ticket } from 'lucide-react';
import { CATEGORIES, getActiveSpecials, getSalon, getService, getUserById, todayIso, useStoreState } from '@/lib/store';
import type { AdminTab } from '@/pages/Admin';
import { formatDateShort, formatTime, formatZAR, timeAgo } from '@/lib/format';
import { useCountUp } from './shared';

function Kpi({
  label, display, icon, accent, sub, onClick, delay,
}: {
  label: string; display: string; icon: ReactNode; accent: string; sub?: string;
  onClick?: () => void; delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="card-surface p-5 text-left transition-transform hover:-translate-y-1"
    >
      <span className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </span>
      <span className="mt-3 block font-serif text-3xl font-bold leading-none" style={{ color: accent }}>{display}</span>
      {sub && <span className="mt-2 block text-xs" style={{ color: 'var(--ysl-muted)' }}>{sub}</span>}
    </motion.button>
  );
}

export default function OverviewSection({ goTab }: { goTab: (t: AdminTab) => void }) {
  const s = useStoreState();

  const data = useMemo(() => {
    const now = new Date();
    const today = todayIso();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const bookingsToday = s.bookings.filter((b) => b.date === today && b.status !== 'cancelled' && b.status !== 'expired');
    const gmv = s.bookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status) && b.createdAt >= monthStart)
      .reduce((a, b) => a + b.priceCharged, 0);
    const activeSpecials = getActiveSpecials();
    const pendingSalons = s.salons.filter((x) => !x.approved);
    const pendingCodes = s.paymentCodes.filter((c) => c.status === 'issued' || c.status === 'paid');

    // 14-day bookings-per-day series
    const days: { label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        label: formatDateShort(iso),
        count: s.bookings.filter((b) => {
          const c = new Date(b.createdAt);
          return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() && c.getDate() === d.getDate();
        }).length,
      });
    }

    // category donut (bookings by service category)
    const catCounts = CATEGORIES.map((c) => ({ ...c, n: 0 }));
    for (const b of s.bookings) {
      const sv = getService(b.serviceId);
      const cat = catCounts.find((c) => c.key === sv?.category);
      if (cat) cat.n += 1;
    }
    const catTotal = Math.max(1, catCounts.reduce((a, c) => a + c.n, 0));

    const latestBookings = [...s.bookings].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const pendingOwnerSpecials = s.specials.filter((sp) => sp.status === 'pending');
    const audit = s.audit.slice(0, 5);
    return { bookingsToday, gmv, activeSpecials, pendingSalons, pendingCodes, days, catCounts, catTotal, latestBookings, pendingOwnerSpecials, audit };
  }, [s]);

  const nToday = useCountUp(data.bookingsToday.length);
  const nGmv = useCountUp(data.gmv, 1100);
  const nSpecials = useCountUp(data.activeSpecials.length);
  const nPendingSalons = useCountUp(data.pendingSalons.length);
  const nPendingCodes = useCountUp(data.pendingCodes.length);

  const maxDay = Math.max(1, ...data.days.map((d) => d.count));

  const statusColor = (st: string) =>
    st === 'confirmed' || st === 'completed' ? 'var(--ysl-success)'
      : st === 'held' || st === 'code-issued' || st === 'confirming' ? 'var(--ysl-amber)'
        : 'var(--ysl-danger)';

  // donut geometry
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  let acc = 0;
  const donutColors = ['var(--ysl-purple)', 'var(--ysl-special)', 'var(--ysl-gold)', 'var(--ysl-violet-soft)', 'var(--ysl-success)', 'var(--ysl-amber)'];

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Bookings today" display={String(Math.round(nToday))} icon={<CalendarCheck size={18} />} accent="var(--ysl-purple)" sub={`${data.bookingsToday.filter((b) => b.status === 'confirmed').length} confirmed`} onClick={() => goTab('payments')} delay={0} />
        <Kpi label="GMV this month" display={formatZAR(Math.round(nGmv))} icon={<Banknote size={18} />} accent="var(--ysl-gold)" sub="confirmed + completed" delay={0.08} />
        <Kpi label="Active specials" display={String(Math.round(nSpecials))} icon={<BadgePercent size={18} />} accent="var(--ysl-special)" sub="live right now" onClick={() => goTab('specials')} delay={0.16} />
        <Kpi label="Pending salons" display={String(Math.round(nPendingSalons))} icon={<Store size={18} />} accent="var(--ysl-amber)" sub="awaiting vetting" onClick={() => goTab('salons')} delay={0.24} />
        <Kpi label="Pending codes" display={String(Math.round(nPendingCodes))} icon={<Ticket size={18} />} accent="var(--ysl-amber)" sub="awaiting confirmation" onClick={() => goTab('payments')} delay={0.32} />
      </div>

      {/* charts row */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card-surface p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold">Bookings per day</h3>
            <span className="text-xs uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>last 14 days</span>
          </div>
          <div className="flex h-44 items-end gap-[6px]">
            {data.days.map((d, i) => (
              <div key={i} className="group relative flex flex-1 flex-col items-center justify-end self-stretch">
                <span className="pointer-events-none absolute -top-1 rounded px-1.5 py-0.5 text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }}>
                  {d.count}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                  transition={{ delay: 0.15 + i * 0.04, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                  style={{
                    borderRadius: '4px 4px 2px 2px',
                    background: i === data.days.length - 1 ? 'linear-gradient(180deg, var(--ysl-purple), var(--ysl-purple-deep))' : 'var(--ysl-lilac)',
                    border: '1px solid var(--ysl-line)',
                  }}
                />
                {i % 2 === 0 && (
                  <span className="mt-1.5 whitespace-nowrap text-[9px]" style={{ color: 'var(--ysl-muted)' }}>{d.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-6">
          <h3 className="mb-4 font-serif text-xl font-semibold">Bookings by category</h3>
          <div className="flex items-center gap-6">
            <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0 -rotate-90">
              <circle cx="66" cy="66" r={R} fill="none" stroke="var(--ysl-lilac)" strokeWidth="16" />
              {data.catCounts.map((c, i) => {
                const frac = c.n / data.catTotal;
                const dash = frac * CIRC;
                const offset = -acc * CIRC;
                acc += frac;
                if (!c.n) return null;
                return (
                  <motion.circle
                    key={c.key}
                    cx="66" cy="66" r={R} fill="none"
                    stroke={donutColors[i % donutColors.length]}
                    strokeWidth="16"
                    strokeDasharray={`${dash} ${CIRC - dash}`}
                    initial={{ strokeDashoffset: offset + dash }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                );
              })}
            </svg>
            <ul className="min-w-0 flex-1 space-y-2 text-sm">
              {data.catCounts.filter((c) => c.n > 0).map((c, i) => (
                <li key={c.key} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: donutColors[CATEGORIES.findIndex((x) => x.key === c.key) % donutColors.length] ?? donutColors[i] }} />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="font-mono text-xs" style={{ color: 'var(--ysl-muted)' }}>{c.n}</span>
                </li>
              ))}
              {data.catCounts.every((c) => !c.n) && (
                <li className="text-sm" style={{ color: 'var(--ysl-muted)' }}>No bookings yet — the donut fills as bookings arrive.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* lists row */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* latest bookings */}
        <div className="card-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold">Latest bookings</h3>
            <button onClick={() => goTab('payments')} className="flex items-center gap-1 text-xs font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-purple)' }}>
              Codes <ArrowRight size={12} />
            </button>
          </div>
          <ul className="space-y-3">
            {data.latestBookings.map((b, i) => {
              const salon = getSalon(b.salonId);
              const svc = getService(b.serviceId);
              const u = getUserById(b.userId);
              return (
                <motion.li key={b.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between gap-3 pb-3 text-sm" style={{ borderBottom: '1px solid var(--ysl-line)' }}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u?.name ?? 'Customer'} · {salon?.name}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--ysl-muted)' }}>
                      {svc?.name} · {formatDateShort(b.date)} {formatTime(b.time)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-serif font-bold">{formatZAR(b.priceCharged)}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: statusColor(b.status) }}>{b.status}</p>
                  </div>
                </motion.li>
              );
            })}
            {!data.latestBookings.length && <li className="text-sm" style={{ color: 'var(--ysl-muted)' }}>No bookings yet.</li>}
          </ul>
        </div>

        {/* pending owner special requests */}
        <div className="card-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold">Owner special requests</h3>
            <button onClick={() => goTab('specials')} className="flex items-center gap-1 text-xs font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-purple)' }}>
              Review <ArrowRight size={12} />
            </button>
          </div>
          <ul className="space-y-3">
            {data.pendingOwnerSpecials.map((sp, i) => (
              <motion.li key={sp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between gap-3 pb-3 text-sm" style={{ borderBottom: '1px solid var(--ysl-line)' }}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{getSalon(sp.salonId)?.name}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--ysl-muted)' }}>{getService(sp.serviceId)?.name}</p>
                </div>
                <button onClick={() => goTab('specials')} className="chip chip-special shrink-0">
                  {sp.kind === 'percent' ? `-${sp.value}%` : `-R${sp.value}`} · review
                </button>
              </motion.li>
            ))}
            {!data.pendingOwnerSpecials.length && (
              <li className="text-sm" style={{ color: 'var(--ysl-muted)' }}>Queue clear — no owner specials waiting.</li>
            )}
          </ul>
        </div>

        {/* recent audit */}
        <div className="card-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold">Recent activity</h3>
            <button onClick={() => goTab('audit')} className="flex items-center gap-1 text-xs font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-purple)' }}>
              Audit log <ArrowRight size={12} />
            </button>
          </div>
          <ul className="space-y-3">
            {data.audit.map((a, i) => (
              <motion.li key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="pb-3 text-sm" style={{ borderBottom: '1px solid var(--ysl-line)' }}>
                <p className="flex items-center justify-between gap-2">
                  <span className="chip chip-lilac !py-0.5 !text-[9px]">{a.action}</span>
                  <span className="text-[11px]" style={{ color: 'var(--ysl-muted)' }}>{timeAgo(a.createdAt)}</span>
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs" style={{ color: 'var(--ysl-muted)' }}>{a.detail}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
