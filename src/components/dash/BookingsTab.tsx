import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, ChevronDown, Clock, CircleCheck, CircleX, Hourglass } from 'lucide-react';
import type { Salon, Booking, BookingStatus } from '@/lib/store';
import {
  useStoreState, getUserById, getService, getPaymentCode,
  markBookingCompleted, markBookingNoShow, todayIso,
} from '@/lib/store';
import { formatZAR, formatDate, formatDateShort, formatDateTime } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';
import { TabHeader, EmptyState } from '@/components/dash/ui';

/** T4 · Bookings (dashboard.md): date-grouped list with status filters,
 *  mark complete / no-show, hold countdown chips, expandable row detail. */

type Filter = 'all' | 'upcoming' | 'past';

const ACTIVE: BookingStatus[] = ['held', 'code-issued', 'confirming', 'confirmed'];

function groupLabel(date: string): string {
  const today = todayIso();
  const tomorrow = new Date(Date.now() + 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  const tomorrowIso = `${tomorrow.getFullYear()}-${p(tomorrow.getMonth() + 1)}-${p(tomorrow.getDate())}`;
  if (date === today) return 'Today';
  if (date === tomorrowIso) return 'Tomorrow';
  if (date > today) return 'This week & later';
  return 'Past';
}

function StatusChip({ b }: { b: Booking }) {
  switch (b.status) {
    case 'held':
    case 'code-issued':
      return (
        <span className="chip chip-amber">
          <Hourglass size={11} />
          {b.holdExpiresAt
            ? <CountdownTimer endsAt={b.holdExpiresAt} variant="hold" compact className="!text-inherit" />
            : 'Awaiting payment'}
        </span>
      );
    case 'confirming':
      return <span className="chip chip-amber"><Clock size={11} /> Confirming</span>;
    case 'confirmed':
      return <span className="chip chip-success"><CircleCheck size={11} /> Confirmed</span>;
    case 'completed':
      return <span className="chip chip-success"><Check size={11} /> Completed</span>;
    case 'no-show':
      return <span className="chip chip-special"><CircleX size={11} /> No-show</span>;
    case 'cancelled':
      return <span className="chip" style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-muted)' }}>Cancelled</span>;
    case 'expired':
      return <span className="chip" style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-muted)' }}>Expired</span>;
  }
}

export default function BookingsTab({ salon }: { salon: Salon }) {
  const state = useStoreState();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [openId, setOpenId] = useState<string | null>(null);

  const all = useMemo(
    () => state.bookings.filter((b) => b.salonId === salon.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [state, salon.id],
  );

  const shown = useMemo(() => {
    const today = todayIso();
    if (filter === 'upcoming') return all.filter((b) => b.date >= today && ACTIVE.includes(b.status));
    if (filter === 'past') return [...all.filter((b) => b.date < today || !ACTIVE.includes(b.status))].reverse();
    return all;
  }, [all, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    const order = ['Today', 'Tomorrow', 'This week & later', 'Past'];
    for (const b of shown) {
      const g = groupLabel(b.date);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(b);
    }
    return order.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [shown]);

  const act = (b: Booking, action: 'complete' | 'noshow') => {
    if (action === 'complete') {
      markBookingCompleted(b.id);
      toast.success('Marked complete — payout updated ✓');
    } else {
      markBookingNoShow(b.id);
      toast.error('Marked as no-show.');
    }
  };

  return (
    <div>
      <TabHeader
        title="Bookings"
        note="Mark visits complete after the appointment — it keeps your payout and reviews flowing."
      />

      {/* status filter pills */}
      <div className="mb-7 flex gap-2">
        {(['upcoming', 'past', 'all'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="chip transition-all"
            style={filter === f
              ? { background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }
              : { background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)' }}>
            {f === 'upcoming' ? 'Upcoming' : f === 'past' ? 'Past & closed' : 'All'}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            title={filter === 'past' ? 'No past bookings yet' : 'No upcoming bookings'}
            note="When students book and pay via the Vault, their slots appear here in real time." />
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[.25em]" style={{ color: 'var(--ysl-muted)' }}>
                {g.label}
              </h3>
              <div className="space-y-3">
                {g.items.map((b) => {
                  const customer = getUserById(b.userId);
                  const service = getService(b.serviceId);
                  const code = b.paymentCodeId ? getPaymentCode(b.paymentCodeId) : undefined;
                  const open = openId === b.id;
                  return (
                    <motion.div key={b.id} layout="position" className="card-surface overflow-hidden">
                      <div
                        className="flex cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 p-4 sm:px-5"
                        onClick={() => setOpenId(open ? null : b.id)}
                      >
                        <span className="w-14 font-serif text-2xl font-semibold leading-none">{b.time}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {customer?.name ?? 'Customer'}
                            <span className="ml-2 font-normal" style={{ color: 'var(--ysl-muted)' }}>{customer?.email}</span>
                          </p>
                          <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>
                            {formatDateShort(b.date)} · {service?.name ?? 'Service'} · {formatZAR(b.priceCharged)}
                          </p>
                        </div>

                        {/* deposit status */}
                        {code && (
                          <span className="text-[11px] font-medium uppercase tracking-[.12em]"
                            style={{ color: code.status === 'confirmed' || code.status === 'paid' ? 'var(--ysl-gold)' : 'var(--ysl-amber)' }}>
                            {code.status === 'confirmed' || code.status === 'paid' ? '✓ paid' : '⏳ awaiting'}
                          </span>
                        )}

                        <StatusChip b={b} />

                        {b.status === 'confirmed' && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => act(b, 'complete')}
                              className="btn !px-4 !py-2 text-[10px] text-white" style={{ background: 'var(--ysl-success)' }}>
                              Mark complete
                            </button>
                            <button onClick={() => act(b, 'noshow')}
                              className="btn btn-ghost !px-4 !py-2 text-[10px]" style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)' }}>
                              No-show
                            </button>
                          </div>
                        )}

                        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--ysl-muted)' }} />
                      </div>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                            className="overflow-hidden"
                          >
                            <div className="grid gap-5 border-t px-5 py-5 hairline sm:grid-cols-2">
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Details</p>
                                <p className="mt-2 text-sm">{service?.name} — {formatZAR(b.priceCharged)}</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--ysl-muted)' }}>{formatDate(b.date)} at {b.time}</p>
                                {b.ticketCode && (
                                  <p className="mt-2 text-sm">
                                    Ticket: <span className="font-mono font-bold">{b.ticketCode}</span>
                                  </p>
                                )}
                                {code && (
                                  <p className="mt-1 text-sm">
                                    Payment code: <span className="font-mono">{code.code}</span>{' '}
                                    <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>({code.status})</span>
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Timeline</p>
                                <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                                  <li>· Booked {formatDateTime(b.createdAt)}</li>
                                  {code?.paidAt && <li>· Paid via Vault {formatDateTime(code.paidAt)}</li>}
                                  {b.ticketCode && <li>· Confirmed — ticket issued</li>}
                                  {b.status === 'completed' && <li style={{ color: 'var(--ysl-success)' }}>· Visit completed</li>}
                                  {b.status === 'no-show' && <li style={{ color: 'var(--ysl-danger)' }}>· Marked no-show</li>}
                                </ul>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
