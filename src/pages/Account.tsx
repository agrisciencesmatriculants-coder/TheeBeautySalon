/** Account — `/account` (account.md). Customer hub: my bookings (status spines,
 *  ticket view, cancel), favourites, my reviews (+ add review for completed
 *  bookings), settings. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck, CalendarClock, Heart, LogIn, MapPin, Settings2, Sparkles,
  Star, Ticket, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Booking, Salon, User } from '@/lib/store';
import { cancelBooking, setTheme, sweep, todayIso, useStoreState } from '@/lib/store';
import { formatDate, formatZAR, timeAgo } from '@/lib/format';
import SalonCard from '@/components/SalonCard';
import RatingStars from '@/components/RatingStars';
import CountdownTimer from '@/components/CountdownTimer';
import Modal from '@/components/booking/Modal';
import TicketCard from '@/components/booking/TicketCard';
import ReviewModal from '@/components/booking/ReviewModal';

type Tab = 'bookings' | 'favourites' | 'reviews' | 'settings';
type BookingFilter = 'all' | 'upcoming' | 'awaiting' | 'completed' | 'cancelled';

const TABS: { key: Tab; label: string; icon: typeof CalendarClock }[] = [
  { key: 'bookings', label: 'Bookings', icon: CalendarClock },
  { key: 'favourites', label: 'Favourites', icon: Heart },
  { key: 'reviews', label: 'My reviews', icon: Star },
  { key: 'settings', label: 'Settings', icon: Settings2 },
];

const FILTERS: { key: BookingFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'awaiting', label: 'Awaiting payment' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

function groupOf(b: Booking): BookingFilter {
  if (b.status === 'confirmed') return 'upcoming';
  if (b.status === 'held' || b.status === 'code-issued' || b.status === 'confirming') return 'awaiting';
  if (b.status === 'completed') return 'completed';
  return 'cancelled'; // cancelled | expired | no-show
}

const SPINE: Record<BookingFilter, string> = {
  all: 'var(--ysl-line)',
  upcoming: 'var(--ysl-purple)',
  awaiting: 'var(--ysl-amber)',
  completed: 'var(--ysl-success)',
  cancelled: 'var(--ysl-muted)',
};

function useCountUp(target: number, duration = 1000): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export default function Account() {
  const navigate = useNavigate();
  const state = useStoreState();
  const user = state.sessionUserId ? state.users.find((u) => u.id === state.sessionUserId) : null;

  const [tab, setTab] = useState<Tab>('bookings');

  // 1s heartbeat for awaiting-payment countdowns / expiry
  useEffect(() => {
    sweep();
    const t = window.setInterval(() => sweep(), 1000);
    return () => window.clearInterval(t);
  }, []);

  const bookings = useMemo(
    () => (user ? state.bookings.filter((b) => b.userId === user.id).sort((a, b) => b.createdAt - a.createdAt) : []),
    [state.bookings, user],
  );

  // ── signed out ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="container-ysl grid min-h-[50vh] place-items-center py-24 text-center">
        <div className="card-surface max-w-md rounded-ysl-l p-10">
          <img src="/ysl-logo.svg" alt="" className="mx-auto h-14 w-14" />
          <h1 className="mt-5 font-serif text-3xl font-semibold">Sign in to your account</h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--ysl-muted)' }}>
            Your bookings, tickets, favourites and reviews live here.
          </p>
          <button onClick={() => navigate('/login?next=/account')} className="btn btn-primary mt-7 w-full">
            <LogIn size={15} /> Sign in
          </button>
          <Link to="/signup" className="mt-4 block text-[12px] font-medium uppercase tracking-[.14em] underline-offset-4 hover:underline" style={{ color: 'var(--ysl-purple)' }}>
            New here? Create an account
          </Link>
        </div>
      </div>
    );
  }

  const upcoming = bookings.filter((b) => b.status === 'confirmed' && b.date >= todayIso()).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const favCount = user.favourites.length;

  return (
    <div>
      {/* ── S1 header strip ── */}
      <section className="reveal" style={{ background: 'var(--ysl-lilac)' }}>
        <div className="container-ysl py-12">
          <p className="eyebrow">My account</p>
          <h1 className="display-2 mt-3">
            Hi, <em style={{ color: 'var(--ysl-purple)' }}>{user.name.split(' ')[0]}</em>{' '}
            <Sparkles className="inline h-8 w-8 -translate-y-1" style={{ color: 'var(--ysl-gold)' }} aria-hidden />
          </h1>
          <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
            <StatCard label="Upcoming bookings" value={upcoming} />
            <StatCard label="Visits completed" value={completedCount} delay={0.1} />
            <StatCard label="Favourites" value={favCount} delay={0.2} />
          </div>
        </div>
      </section>

      <div className="container-ysl py-10">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* ── sidebar (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="card-surface sticky top-24 rounded-ysl-l p-6">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-serif text-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--ysl-violet), var(--ysl-purple))' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg font-semibold leading-tight">{user.name}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--ysl-muted)' }}>{user.email}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[.14em]" style={{ color: 'var(--ysl-muted)' }}>
                Member since {new Date(user.createdAt).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}
              </p>
              <nav className="mt-5 space-y-1 border-t pt-4" style={{ borderColor: 'var(--ysl-line)' }}>
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="flex w-full items-center gap-3 rounded-ysl-s px-3.5 py-2.5 text-left text-[13px] font-medium uppercase tracking-[.12em] transition-colors"
                      style={{
                        background: active ? 'var(--ysl-lilac)' : 'transparent',
                        color: active ? 'var(--ysl-purple)' : 'var(--ysl-muted)',
                      }}
                    >
                      <Icon size={15} /> {t.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ── mobile tab bar ── */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-pill px-4 py-2.5 text-[12px] font-medium uppercase tracking-[.12em] transition-colors"
                  style={{
                    background: active ? 'var(--ysl-purple)' : 'var(--ysl-surface)',
                    color: active ? '#fff' : 'var(--ysl-muted)',
                    border: active ? 'none' : '1px solid var(--ysl-line)',
                  }}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* ── tab panels ── */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: easeOut }}
              >
                {tab === 'bookings' && <BookingsTab bookings={bookings} user={user} />}
                {tab === 'favourites' && <FavouritesTab user={user} />}
                {tab === 'reviews' && <ReviewsTab user={user} />}
                {tab === 'settings' && <SettingsTab user={user} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── stat card ──── */

function StatCard({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const n = useCountUp(value);
  return (
    <motion.div
      className="card-surface rounded-ysl-m px-4 py-4 sm:px-5"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + delay, duration: 0.5 }}
    >
      <p className="font-serif text-3xl font-bold sm:text-4xl" style={{ color: 'var(--ysl-purple)' }}>{n}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[.14em] sm:text-[11px]" style={{ color: 'var(--ysl-muted)' }}>
        {label}
      </p>
    </motion.div>
  );
}

/* ──────────────────────────────────────────── T1 · bookings ──── */

function BookingsTab({ bookings, user }: { bookings: Booking[]; user: User }) {
  const state = useStoreState();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [ticketFor, setTicketFor] = useState<Booking | null>(null);
  const [cancelFor, setCancelFor] = useState<Booking | null>(null);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);

  const filtered = bookings.filter((b) => filter === 'all' || groupOf(b) === filter);

  const reviewedSalons = useMemo(
    () => new Set(state.reviews.filter((r) => r.userId === user.id).map((r) => r.salonId)),
    [state.reviews, user.id],
  );

  const hoursUntil = (b: Booking) => (new Date(`${b.date}T${b.time}:00`).getTime() - Date.now()) / 3600000;

  const confirmCancel = () => {
    if (!cancelFor) return;
    cancelBooking(cancelFor.id);
    setCancelFor(null);
    toast('Booking cancelled — deposit refund initiated via Vault (demo)');
  };

  if (!bookings.length) {
    return (
      <div className="card-surface grid place-items-center rounded-ysl-l px-6 py-16 text-center">
        <img src="/empty-bookings.svg" alt="" className="h-36 w-auto opacity-90" />
        <h2 className="mt-5 font-serif text-2xl font-semibold">No bookings yet — your glow-up awaits</h2>
        <p className="mt-2 max-w-xs text-sm" style={{ color: 'var(--ysl-muted)' }}>
          Pick a salon, hold a slot and pay with a code. It all shows up here.
        </p>
        <Link to="/salons" className="btn btn-primary mt-6">Find a salon</Link>
      </div>
    );
  }

  return (
    <div>
      {/* filter pills */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'all' ? bookings.length : bookings.filter((b) => groupOf(b) === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="shrink-0 rounded-pill px-4 py-2 text-[12px] font-medium uppercase tracking-[.12em] transition-colors"
              style={{
                background: active ? 'var(--ysl-purple)' : 'var(--ysl-surface)',
                color: active ? '#fff' : 'var(--ysl-muted)',
                border: active ? 'none' : '1px solid var(--ysl-line)',
              }}
            >
              {f.label} · {count}
            </button>
          );
        })}
      </div>

      {!filtered.length ? (
        <p className="mt-6 rounded-ysl-m p-6 text-center text-sm" style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-muted)' }}>
          Nothing in this filter yet.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <AnimatePresence initial={false}>
            {filtered.map((b, i) => {
              const salon = state.salons.find((s) => s.id === b.salonId);
              const service = state.services.find((s) => s.id === b.serviceId);
              if (!salon || !service) return null;
              const group = groupOf(b);
              const awaiting = group === 'awaiting';
              const code = b.paymentCodeId ? state.paymentCodes.find((c) => c.id === b.paymentCodeId) : undefined;
              return (
                <motion.article
                  key={b.id}
                  layout="position"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ delay: i * 0.07, duration: 0.45, ease: easeOut }}
                  className="card-surface relative overflow-hidden rounded-ysl-l p-5 pl-6"
                >
                  {/* status spine */}
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: SPINE[group] }} />

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={salon.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" style={{ border: '2px solid var(--ysl-line)' }} />
                      <div className="min-w-0">
                        <p className="truncate font-serif text-lg font-semibold leading-tight">{salon.name}</p>
                        <p className="truncate text-xs uppercase tracking-[.14em]" style={{ color: 'var(--ysl-muted)' }}>{service.name}</p>
                        <p className="mt-1 font-serif text-base font-semibold">
                          {formatDate(b.date)} · {b.time}
                        </p>
                      </div>
                    </div>
                    <StatusChip booking={b} group={group} />
                  </div>

                  {/* price row */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    {(b.status === 'confirmed' || b.status === 'completed') && (
                      <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--ysl-success)' }}>
                        <BadgeCheck size={15} /> {formatZAR(code?.amount ?? b.priceCharged)} paid via Vault
                      </span>
                    )}
                    {awaiting && (
                      <span style={{ color: 'var(--ysl-muted)' }}>
                        {formatZAR(b.priceCharged)} due ·{' '}
                        {b.holdExpiresAt && (b.status === 'held' || b.status === 'code-issued') ? (
                          <CountdownTimer endsAt={b.holdExpiresAt} variant="hold" compact />
                        ) : (
                          'confirming…'
                        )}
                      </span>
                    )}
                    {group === 'cancelled' && (
                      <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>
                        {b.status === 'expired' ? 'Hold expired — slot released' : b.status === 'no-show' ? 'Marked as no-show by the salon' : 'Cancelled by you'}
                      </span>
                    )}
                  </div>

                  {/* actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {awaiting && (
                      <button onClick={() => navigate(`/booking/${b.id}/status`)} className="btn btn-gold !px-5 !py-2.5 text-[11px]">
                        Continue payment
                      </button>
                    )}
                    {group === 'upcoming' && (
                      <>
                        <button onClick={() => setTicketFor(b)} className="btn btn-primary !px-5 !py-2.5 text-[11px]">
                          <Ticket size={14} /> View ticket
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.name}, ${salon.area}, Makhanda`)}`}
                          target="_blank" rel="noreferrer"
                          className="btn btn-ghost !px-5 !py-2.5 text-[11px]"
                        >
                          <MapPin size={14} /> Get directions
                        </a>
                        <button
                          onClick={() => setCancelFor(b)}
                          className="btn btn-ghost !px-5 !py-2.5 text-[11px]"
                          style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)' }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {group === 'completed' && (
                      <>
                        {!reviewedSalons.has(b.salonId) && (
                          <button onClick={() => setReviewFor(b)} className="btn btn-gold !px-5 !py-2.5 text-[11px]">
                            <Star size={14} /> Leave a review
                          </button>
                        )}
                        <Link to={`/book/${b.salonId}/${b.serviceId}`} className="btn btn-ghost !px-5 !py-2.5 text-[11px]">
                          Book again
                        </Link>
                      </>
                    )}
                    {group === 'cancelled' && (
                      <Link to={`/book/${b.salonId}/${b.serviceId}`} className="btn btn-ghost !px-5 !py-2.5 text-[11px]">
                        Book again
                      </Link>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ticket modal */}
      <Modal open={ticketFor !== null} onClose={() => setTicketFor(null)} title="Your ticket">
        {ticketFor && (() => {
          const salon = state.salons.find((s) => s.id === ticketFor.salonId);
          const service = state.services.find((s) => s.id === ticketFor.serviceId);
          return salon && service ? <TicketCard booking={ticketFor} salon={salon} service={service} /> : null;
        })()}
      </Modal>

      {/* cancel modal */}
      <Modal open={cancelFor !== null} onClose={() => setCancelFor(null)} title="Cancel this booking?">
        {cancelFor && (
          <>
            {hoursUntil(cancelFor) >= 24 ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
                You're more than 24h before your slot — cancellation is free and your Vault payment is refunded (demo).
                The slot is freed immediately.
              </p>
            ) : (
              <div className="rounded-ysl-m p-4 text-sm leading-relaxed" style={{ background: 'rgba(214,69,69,.08)', border: '1px solid rgba(214,69,69,.35)', color: 'var(--ysl-danger)' }}>
                You're within 24h of your slot. Per the cancellation policy the salon may keep the payment to cover the
                reserved chair.
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setCancelFor(null)} className="btn btn-ghost flex-1">Keep booking</button>
              <button onClick={confirmCancel} className="btn flex-1" style={{ background: 'var(--ysl-danger)', color: '#fff' }}>
                Cancel booking
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* review modal */}
      {reviewFor && (
        <ReviewModal
          open={reviewFor !== null}
          onClose={() => setReviewFor(null)}
          salonId={reviewFor.salonId}
          salonName={state.salons.find((s) => s.id === reviewFor.salonId)?.name ?? 'the salon'}
          serviceName={state.services.find((s) => s.id === reviewFor.serviceId)?.name}
          userId={user.id}
        />
      )}
    </div>
  );
}

function StatusChip({ booking, group }: { booking: Booking; group: BookingFilter }) {
  const map: Record<string, { label: string; cls: string; style?: React.CSSProperties }> = {
    upcoming: { label: 'Upcoming', cls: 'chip-lilac' },
    awaiting: { label: booking.status === 'confirming' ? 'Confirming…' : 'Awaiting payment', cls: 'chip-amber' },
    completed: { label: 'Completed', cls: 'chip-success' },
    cancelled: {
      label: booking.status === 'expired' ? 'Expired' : booking.status === 'no-show' ? 'No-show' : 'Cancelled',
      cls: '',
      style: { background: 'var(--ysl-lilac)', color: 'var(--ysl-muted)' },
    },
  };
  const m = map[group];
  return <span className={`chip ${m.cls}`} style={m.style}>{m.label}</span>;
}

/* ──────────────────────────────────────────── T2 · favourites ──── */

function FavouritesTab({ user }: { user: User }) {
  const state = useStoreState();
  const favs = state.salons.filter((s) => user.favourites.includes(s.id));

  if (!favs.length) {
    return (
      <div className="card-surface grid place-items-center rounded-ysl-l px-6 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full" style={{ background: 'var(--ysl-lilac)' }}>
          <Heart size={26} style={{ color: 'var(--ysl-purple)' }} />
        </span>
        <h2 className="mt-5 font-serif text-2xl font-semibold">No favourites yet</h2>
        <p className="mt-2 max-w-xs text-sm" style={{ color: 'var(--ysl-muted)' }}>
          Tap the heart on any salon to keep it here for quick booking.
        </p>
        <Link to="/salons" className="btn btn-primary mt-6">Browse salons</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {favs.map((salon: Salon, i: number) => (
        <motion.div
          key={salon.id}
          layout="position"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ delay: i * 0.07, duration: 0.45, ease: easeOut }}
        >
          <SalonCard salon={salon} />
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────── T3 · my reviews ──── */

function ReviewsTab({ user }: { user: User }) {
  const state = useStoreState();
  const reviews = state.reviews.filter((r) => r.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);

  if (!reviews.length) {
    return (
      <div className="card-surface grid place-items-center rounded-ysl-l px-6 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full" style={{ background: 'var(--ysl-lilac)' }}>
          <Star size={26} style={{ color: 'var(--ysl-gold)' }} />
        </span>
        <h2 className="mt-5 font-serif text-2xl font-semibold">No reviews yet</h2>
        <p className="mt-2 max-w-xs text-sm" style={{ color: 'var(--ysl-muted)' }}>
          After a completed visit, leave a review from your bookings tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r, i) => {
        const salon = state.salons.find((s) => s.id === r.salonId);
        return (
          <motion.article
            key={r.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.45, ease: easeOut }}
            className="card-surface rounded-ysl-l p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to={salon ? `/salon/${salon.slug}` : '/salons'} className="font-serif text-xl font-semibold hover:underline">
                  {salon?.name ?? 'Salon'}
                </Link>
                {r.serviceName && (
                  <p className="text-xs uppercase tracking-[.14em]" style={{ color: 'var(--ysl-muted)' }}>{r.serviceName}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <RatingStars rating={r.rating} showScore={false} />
                <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{timeAgo(r.createdAt)}</span>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed">{r.text}</p>
            {r.verified && (
              <span className="chip chip-success mt-4">
                <BadgeCheck size={13} /> Verified visit
              </span>
            )}
          </motion.article>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────── T4 · settings ──── */

function SettingsTab({ user }: { user: User }) {
  const state = useStoreState();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState('');
  const [prefs, setPrefs] = useState({ digest: true, grad: true, reminders: true });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const theme = state.settings.theme;

  const inputStyle: React.CSSProperties = {
    background: 'var(--ysl-cream)', border: '1px solid var(--ysl-line)', color: 'var(--ysl-ink)',
  };

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="space-y-5">
      {/* profile */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: easeOut }}
        className="card-surface rounded-ysl-l p-6">
        <h2 className="font-serif text-2xl font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-ysl-s px-4 py-3 text-[15px] outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>Phone (SA)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="072 123 4567" className="w-full rounded-ysl-s px-4 py-3 text-[15px] outline-none" style={inputStyle} />
          </div>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--ysl-muted)' }}>
          Signed in as {user.email} · demo build — profile edits are session-only.
        </p>
        <button onClick={() => toast.success('Saved')} className="btn btn-primary mt-4 !px-6 !py-2.5 text-[11px]">Save profile</button>
      </motion.section>

      {/* email preferences */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45, ease: easeOut }}
        className="card-surface rounded-ysl-l p-6">
        <h2 className="font-serif text-2xl font-semibold">Email preferences</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--ysl-muted)' }}>Delivered via Brevo (demo).</p>
        <div className="mt-4 space-y-4">
          {([
            { key: 'digest' as const, label: 'Specials digest', hint: 'A weekly roundup of new salon specials.' },
            { key: 'grad' as const, label: 'Graduation alerts', hint: 'Bell rings, grad specials and ceremony news.' },
            { key: 'reminders' as const, label: 'Booking reminders', hint: 'A nudge the day before your slot.' },
          ]).map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{row.label}</p>
                <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{row.hint}</p>
              </div>
              <Toggle on={prefs[row.key]} onClick={() => toggle(row.key)} label={row.label} />
            </div>
          ))}
        </div>
      </motion.section>

      {/* appearance */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.45, ease: easeOut }}
        className="card-surface rounded-ysl-l p-6">
        <h2 className="font-serif text-2xl font-semibold">Appearance</h2>
        <div className="mt-4 inline-flex rounded-pill p-1" style={{ background: 'var(--ysl-lilac)' }} role="radiogroup" aria-label="Theme">
          {(['light', 'dark'] as const).map((t) => {
            const active = theme === t;
            return (
              <button
                key={t}
                onClick={() => { setTheme(t); toast.success(`${t === 'dark' ? 'Dark' : 'Light'} mode on`); }}
                className="rounded-pill px-5 py-2 text-[12px] font-medium uppercase tracking-[.12em] transition-all"
                style={{
                  background: active ? 'var(--ysl-purple)' : 'transparent',
                  color: active ? '#fff' : 'var(--ysl-muted)',
                }}
                role="radio"
                aria-checked={active}
              >
                {t}
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* danger zone */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.45, ease: easeOut }}
        className="rounded-ysl-l p-6" style={{ border: '1px dashed var(--ysl-danger)' }}>
        <h2 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ysl-danger)' }}>Danger zone</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ysl-muted)' }}>
          Deleting your account removes your bookings, favourites and reviews.
        </p>
        <button
          onClick={() => setDeleteOpen(true)}
          className="btn btn-ghost mt-4 !px-6 !py-2.5 text-[11px]"
          style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)' }}
        >
          <Trash2 size={14} /> Delete account
        </button>
      </motion.section>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
          This can't be undone. In this demo build account deletion is disabled — sign out instead, or ask the admin to
          remove your record.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setDeleteOpen(false)} className="btn btn-ghost flex-1">Keep my account</button>
          <button
            onClick={() => { setDeleteOpen(false); toast('Demo: account deletion is disabled in this build.'); }}
            className="btn flex-1" style={{ background: 'var(--ysl-danger)', color: '#fff' }}
          >
            Delete anyway
          </button>
        </div>
      </Modal>
    </div>
  );
}

/** Toggle switch (§6.10): pill track, purple when on, spring knob. */
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="relative h-7 w-12 shrink-0 rounded-pill transition-colors"
      style={{ background: on ? 'var(--ysl-purple)' : 'var(--ysl-line)' }}
    >
      <motion.span
        className="absolute left-1 top-1 block h-5 w-5 rounded-full bg-white shadow"
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      />
    </button>
  );
}
