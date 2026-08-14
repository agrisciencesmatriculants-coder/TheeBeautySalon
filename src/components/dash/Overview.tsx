import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Wallet, Star, Eye, Bell, GraduationCap, ArrowRight, TrendingUp } from 'lucide-react';
import type { Salon, User } from '@/lib/store';
import {
  useStoreState, getSalonRating, getLeaderboard, getService, getUserById,
  getNotificationsFor, markNotificationRead, getNextGraduation, daysUntil,
} from '@/lib/store';
import type { Booking } from '@/lib/store';
import { formatZAR, formatDateShort, timeAgo } from '@/lib/format';
import { KpiCard, useCountUp, EmptyState } from '@/components/dash/ui';
import type { DashTab } from '@/pages/Dashboard';

/** T0 · Overview — KPI cards, this week's bookings mini-table,
 *  notifications feed with graduation bell alert (dashboard.md). */

function isoInDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const STATUS_CHIP: Record<Booking['status'], { label: string; cls: string }> = {
  held: { label: 'Held', cls: 'chip-amber' },
  'code-issued': { label: 'Awaiting payment', cls: 'chip-amber' },
  confirming: { label: 'Confirming', cls: 'chip-amber' },
  confirmed: { label: 'Confirmed', cls: 'chip-success' },
  completed: { label: 'Completed', cls: 'chip-success' },
  cancelled: { label: 'Cancelled', cls: 'chip' },
  expired: { label: 'Expired', cls: 'chip' },
  'no-show': { label: 'No-show', cls: 'chip-special' },
};

export default function Overview({ user, salon, goTab }: { user: User; salon: Salon; goTab: (t: DashTab) => void }) {
  const state = useStoreState();

  const bookings = useMemo(
    () => state.bookings.filter((b) => b.salonId === salon.id),
    [state, salon.id],
  );
  const weekBookings = useMemo(() => {
    const today = isoInDays(0);
    const in7 = isoInDays(7);
    return bookings
      .filter((b) => b.date >= today && b.date <= in7 && ['held', 'code-issued', 'confirming', 'confirmed'].includes(b.status))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [bookings]);

  const monthEarnings = useMemo(() => {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    const ids = new Set(bookings.map((b) => b.id));
    return state.paymentCodes
      .filter((c) => ids.has(c.bookingId) && c.status === 'confirmed')
      .filter((c) => { const d = new Date(c.issuedAt); return d.getMonth() === m && d.getFullYear() === y; })
      .reduce((sum, c) => sum + c.amount, 0);
  }, [state, bookings]);

  const rating = getSalonRating(salon.id);
  const rank = getLeaderboard(8).find((e) => e.salon.id === salon.id)?.rank ?? null;
  const profileViews = 120 + salon.ratingCount * 6 + bookings.length * 13; // demo metric
  const notifications = getNotificationsFor(user.id);
  const grad = getNextGraduation();
  const gradDays = grad ? daysUntil(grad.date) : null;
  const bellAlert = grad && grad.bellRung && gradDays !== null && gradDays >= 0;

  const animWeek = useCountUp(weekBookings.length);
  const animEarn = useCountUp(monthEarnings);
  const animRating = useCountUp(rating.avg);
  const animViews = useCountUp(profileViews);

  return (
    <div>
      {/* greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h2 className="font-serif text-4xl font-semibold">
          Sawubona, <em className="italic" style={{ color: 'var(--ysl-purple)' }}>{user.name.split(' ')[0]}</em> 👋
        </h2>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--ysl-muted)' }}>
          Here's how {salon.name} is doing today.
        </p>
      </motion.div>

      {/* KPI cards */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<CalendarCheck size={19} />} label="Bookings this week" delay={0}
          sub={<span className="chip chip-success"><TrendingUp size={12} /> live</span>}>
          <span className="font-serif text-4xl font-semibold">{Math.round(animWeek)}</span>
        </KpiCard>
        <KpiCard icon={<Wallet size={19} />} label="Earnings this month" delay={0.08}
          sub={<span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>via Youna Venture Vault</span>}>
          <span className="font-serif text-4xl font-bold" style={{ color: 'var(--ysl-gold)' }}>
            {formatZAR(Math.round(animEarn))}
          </span>
        </KpiCard>
        <KpiCard icon={<Star size={19} />} label="Rating" delay={0.16}
          sub={rank ? <span className="chip chip-gold">#{rank} of {getLeaderboard(8).length} on Top-5 board</span>
            : <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{rating.count} reviews</span>}>
          <span className="font-serif text-4xl font-semibold">{animRating.toFixed(1)} <span style={{ color: 'var(--ysl-gold)' }}>★</span></span>
        </KpiCard>
        <KpiCard icon={<Eye size={19} />} label="Profile views" delay={0.24}
          sub={<span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>demo metric</span>}>
          <span className="font-serif text-4xl font-semibold">{Math.round(animViews)}</span>
        </KpiCard>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* this week's bookings */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="card-surface overflow-hidden"
        >
          <div className="flex items-center justify-between border-b px-6 py-4 hairline">
            <h3 className="font-serif text-xl font-semibold">This week's bookings</h3>
            <button onClick={() => goTab('bookings')} className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[.14em]"
              style={{ color: 'var(--ysl-purple)' }}>
              All bookings <ArrowRight size={13} />
            </button>
          </div>
          {weekBookings.length === 0 ? (
            <EmptyState title="No bookings this week" note="Share your store link on your status — slots fill fast around pay weekend." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-[.15em] hairline" style={{ color: 'var(--ysl-muted)' }}>
                  <th className="px-6 py-3 font-medium">Day</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell">Service</th>
                  <th className="px-6 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {weekBookings.slice(0, 6).map((b) => {
                  const chip = STATUS_CHIP[b.status];
                  return (
                    <tr key={b.id} className="border-b transition-colors last:border-0 hover:bg-ysl-lilac/40 hairline cursor-pointer"
                      onClick={() => goTab('bookings')}>
                      <td className="px-6 py-3.5 font-medium">{formatDateShort(b.date)}</td>
                      <td className="px-3 py-3.5 font-serif text-base font-semibold">{b.time}</td>
                      <td className="px-3 py-3.5">{getUserById(b.userId)?.name.split(' ')[0] ?? 'Customer'}</td>
                      <td className="hidden px-3 py-3.5 sm:table-cell" style={{ color: 'var(--ysl-muted)' }}>
                        {getService(b.serviceId)?.name ?? 'Service'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`chip ${chip.cls}`}>{chip.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </motion.section>

        {/* notifications feed */}
        <motion.section
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.28 }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Bell size={16} style={{ color: 'var(--ysl-purple)' }} />
            <h3 className="font-serif text-xl font-semibold">Notifications</h3>
          </div>

          {/* graduation bell alert */}
          {bellAlert && (
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(242,201,76,0)', '0 0 0 6px rgba(242,201,76,.22)', '0 0 0 0 rgba(242,201,76,0)'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="card-surface mb-4 border p-5"
              style={{ borderColor: 'var(--ysl-gold)', background: 'linear-gradient(135deg, var(--ysl-lilac), var(--ysl-surface))' }}
            >
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.18em]" style={{ color: 'var(--ysl-gold)' }}>
                <GraduationCap size={15} /> Graduation Bell
              </p>
              <p className="mt-2 font-serif text-lg font-semibold leading-snug">
                Graduation is in {gradDays} day{gradDays === 1 ? '' : 's'} — create a graduation special and get featured!
              </p>
              <button onClick={() => goTab('specials')} className="btn btn-gold mt-4 w-full !py-2.5 text-[11px]">
                Create grad special
              </button>
            </motion.div>
          )}

          <div className="space-y-3">
            {notifications.length === 0 && !bellAlert && (
              <div className="card-surface p-5 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                Nothing new — special approvals, reviews and bell rings will land here.
              </div>
            )}
            {notifications.slice(0, 6).map((n, i) => (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
                onClick={() => { markNotificationRead(n.id); goTab(n.kind === 'bell' ? 'specials' : n.kind === 'booking' ? 'bookings' : n.kind === 'special' ? 'specials' : 'overview'); }}
                className="card-surface block w-full p-4 text-left"
                style={!n.read ? { borderColor: 'var(--ysl-purple)' } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug">{n.title}</p>
                  {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--ysl-purple)' }} />}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>{n.body}</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>{timeAgo(n.createdAt)}</p>
              </motion.button>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
