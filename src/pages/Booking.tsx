/** Booking — `/book/:salonId/:serviceId` (booking.md Stages 1–4).
 *  Stage 5 lives on `/booking/:id/status`. Internal stage machine:
 *  slot → hold (details + 10-min countdown) → pay (payment code) → vault overlay. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Booking as BookingRec } from '@/lib/store';
import {
  cancelBooking, createBooking, getDiscountedPrice, holdRemaining,
  isGmail, issuePaymentCode, sweep, useStoreState,
} from '@/lib/store';
import CountdownTimer from '@/components/CountdownTimer';
import ProgressRail from '@/components/booking/ProgressRail';
import SummaryCard from '@/components/booking/SummaryCard';
import SlotPicker from '@/components/booking/SlotPicker';
import type { SlotSelection } from '@/components/booking/SlotPicker';
import PaymentCodePanel from '@/components/booking/PaymentCodePanel';
import VaultOverlay from '@/components/booking/VaultOverlay';
import Modal from '@/components/booking/Modal';

type Stage = 'slot' | 'hold' | 'pay' | 'vault';
const STEP_OF: Record<Stage, number> = { slot: 1, hold: 2, pay: 3, vault: 3 };

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function Booking() {
  const { salonId = '', serviceId = '' } = useParams();
  const navigate = useNavigate();
  const state = useStoreState();

  const salon = state.salons.find((s) => s.id === salonId);
  const service = state.services.find((s) => s.id === serviceId);
  const user = state.sessionUserId ? state.users.find((u) => u.id === state.sessionUserId) : null;

  const [stage, setStage] = useState<Stage>('slot');
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const booking: BookingRec | undefined = bookingId ? state.bookings.find((b) => b.id === bookingId) : undefined;
  const code = booking?.paymentCodeId ? state.paymentCodes.find((c) => c.id === booking.paymentCodeId) : undefined;

  const [holdExpired, setHoldExpired] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // details form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [policyOpen, setPolicyOpen] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (user && !prefilled.current) {
      prefilled.current = true;
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // 1s heartbeat: sweep expired holds while in hold/pay stages
  useEffect(() => {
    if (stage !== 'hold' && stage !== 'pay' && stage !== 'vault') return;
    const t = window.setInterval(() => {
      const b = bookingId ? state.bookings.find((x) => x.id === bookingId) : undefined;
      if (b && (b.status === 'held' || b.status === 'code-issued') && holdRemaining(b) <= 0) sweep();
    }, 1000);
    return () => window.clearInterval(t);
  }, [stage, bookingId, state.bookings]);

  // react to expiry/cancellation from the store
  useEffect(() => {
    if (!booking) return;
    if ((stage === 'hold' || stage === 'pay' || stage === 'vault') && (booking.status === 'expired' || booking.status === 'cancelled')) {
      setHoldExpired(true);
    }
    if (booking.status === 'confirming' || booking.status === 'confirmed') {
      navigate(`/booking/${booking.id}/status?paid=1`, { replace: true });
    }
  }, [booking, stage, navigate]);

  const live = useMemo(() => (service ? getDiscountedPrice(service.id) : null), [service]);

  if (!salon || !service) {
    return (
      <div className="container-ysl grid min-h-[50vh] place-items-center py-24 text-center">
        <div>
          <img src="/ysl-logo.svg" alt="" className="mx-auto h-14 w-14" />
          <p className="eyebrow center mt-6 justify-center">Not found</p>
          <h1 className="display-2 mt-4">That booking link is off</h1>
          <p className="lead mx-auto mt-4">The salon or service you're after doesn't exist (any more).</p>
          <Link to="/salons" className="btn btn-primary mt-8">Browse salons</Link>
        </div>
      </div>
    );
  }

  const total = booking ? booking.priceCharged : live?.price ?? service.price;
  const original = service.price;
  const specialPct = booking
    ? booking.specialId && original > 0 ? Math.round(((original - booking.priceCharged) / original) * 100) : null
    : live?.percentOff ?? null;

  // ── stage transitions ────────────────────────────────────────────────────

  const holdSlot = () => {
    if (busy) return;
    if (!slot?.date || !slot.time) return;
    if (!user) {
      toast('Sign in to hold your slot', { description: 'You\'ll come straight back to this slot afterwards.' });
      navigate(`/login?next=/book/${salonId}/${serviceId}`);
      return;
    }
    setBusy(true);
    const res = createBooking({ userId: user.id, salonId, serviceId, date: slot.date, time: slot.time });
    setBusy(false);
    if (!res.ok || !res.booking) {
      toast.error(res.error ?? 'Could not hold that slot.');
      return;
    }
    setBookingId(res.booking.id);
    setStage('hold');
    toast.success('Slot held for 10 minutes');
  };

  const submitDetails = () => {
    if (busy || !booking) return;
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Please enter your name.';
    if (!isGmail(email)) errs.email = 'Use your personal Gmail (e.g. example@gmail.com).';
    const digits = phone.replace(/[\s-]/g, '');
    if (!/^(\+27|0)\d{9}$/.test(digits)) errs.phone = 'Enter a valid SA number (e.g. 072 123 4567).';
    if (!ageOk) errs.age = 'Please confirm you are 18 or older.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (holdRemaining(booking) <= 0) {
      sweep();
      return;
    }
    setBusy(true);
    const issued = issuePaymentCode(booking.id);
    setBusy(false);
    if (!issued) {
      toast.error('Could not issue a payment code — the hold may have expired.');
      sweep();
      return;
    }
    setStage('pay');
  };

  const confirmCancel = () => {
    if (!booking) return;
    cancelBooking(booking.id);
    setCancelOpen(false);
    toast('Booking cancelled — the slot is free again.');
    navigate(`/salon/${salon.slug}`);
  };

  const resetToSlots = () => {
    setHoldExpired(false);
    setBookingId(null);
    setSlot(null);
    setStage('slot');
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--ysl-cream)', border: '1px solid var(--ysl-line)', color: 'var(--ysl-ink)',
  };

  return (
    <div className="container-ysl py-10 sm:py-14">
      <ProgressRail current={STEP_OF[stage]} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ── main panel ── */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {/* ─────────── Stage 1 · slot picker ─────────── */}
            {stage === 'slot' && (
              <motion.section
                key="slot"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: easeOut }}
              >
                <Link to={`/salon/${salon.slug}`} className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[.14em] transition-colors hover:underline" style={{ color: 'var(--ysl-muted)' }}>
                  <ArrowLeft size={14} /> Back to {salon.name}
                </Link>
                <div className="mt-4 flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: 'linear-gradient(135deg, var(--ysl-violet), var(--ysl-purple))' }}>
                    <img src={`/cat-${service.category}.svg`} alt="" className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">{service.name}</h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                      {salon.name} · {service.durationMin >= 60 ? `${Math.floor(service.durationMin / 60)}h${service.durationMin % 60 ? ` ${service.durationMin % 60}m` : ''}` : `${service.durationMin} min`}
                      {' · '}
                      {live && live.special ? (
                        <>
                          <span className="line-through">{`R${live.original}`}</span>{' '}
                          <span className="font-serif text-lg font-bold" style={{ color: 'var(--ysl-special)' }}>{`R${live.price}`}</span>{' '}
                          <span className="chip chip-special">-{live.percentOff}%</span>
                        </>
                      ) : (
                        <span className="font-serif text-lg font-bold">{`R${service.price}`}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <SlotPicker salon={salon} service={service} selected={slot} onSelect={(s) => setSlot(s.time ? s : { date: s.date, time: '' })} />
                </div>

                <button onClick={holdSlot} disabled={!slot?.time || busy} className="btn btn-primary mt-8 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  {busy ? 'Holding…' : 'Hold this slot'} <ArrowRight size={15} />
                </button>
              </motion.section>
            )}

            {/* ─────────── Stage 2 · details + hold countdown ─────────── */}
            {stage === 'hold' && booking && (
              <motion.section
                key="hold"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: easeOut }}
              >
                <motion.div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-ysl-m px-5 py-4"
                  style={{ background: 'rgba(232,161,58,.12)', border: '1px solid rgba(232,161,58,.4)' }}
                  initial={{ opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <div>
                    <p className="font-medium" style={{ color: 'var(--ysl-amber)' }}>Slot held</p>
                    <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
                      Your slot is held for 10 minutes. Complete payment before the timer ends.
                    </p>
                  </div>
                  {booking.holdExpiresAt && (
                    <span className="text-xl">
                      <CountdownTimer endsAt={booking.holdExpiresAt} variant="hold" compact />
                    </span>
                  )}
                </motion.div>

                <div className="mt-7 space-y-5">
                  {([
                    { key: 'name', label: 'Your name', el: (
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anelisa Khumalo"
                        className="w-full rounded-ysl-s px-4 py-3.5 text-[15px] outline-none focus:!border-ysl-purple" style={inputStyle} />
                    ) },
                    { key: 'email', label: 'Gmail address', el: (
                      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" type="email"
                        className="w-full rounded-ysl-s px-4 py-3.5 text-[15px] outline-none focus:!border-ysl-purple" style={inputStyle} />
                    ) },
                    { key: 'phone', label: 'Phone (SA)', el: (
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="072 123 4567" type="tel"
                        className="w-full rounded-ysl-s px-4 py-3.5 text-[15px] outline-none focus:!border-ysl-purple" style={inputStyle} />
                    ) },
                  ] as const).map((f, i) => (
                    <motion.div key={f.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.07, duration: 0.4 }}>
                      <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>
                        {f.label}
                      </label>
                      {f.el}
                      {errors[f.key] && <p className="mt-1 text-xs" style={{ color: 'var(--ysl-danger)' }}>{errors[f.key]}</p>}
                    </motion.div>
                  ))}

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29, duration: 0.4 }}>
                    <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>
                      Notes for the stylist <span style={{ color: 'var(--ysl-line)' }}>(optional)</span>
                    </label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                      placeholder="Hair length, style reference…"
                      className="w-full rounded-ysl-s px-4 py-3.5 text-[15px] outline-none focus:!border-ysl-purple" style={inputStyle} />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.4 }}>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: 'var(--ysl-purple)' }} />
                      <span>I confirm I am 18 or older.</span>
                    </label>
                    {errors.age && <p className="mt-1 text-xs" style={{ color: 'var(--ysl-danger)' }}>{errors.age}</p>}
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.4 }}
                    className="rounded-ysl-m" style={{ border: '1px solid var(--ysl-line)' }}>
                    <button onClick={() => setPolicyOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium">
                      Cancellation policy
                      <ChevronDown size={16} className={`transition-transform ${policyOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--ysl-muted)' }} />
                    </button>
                    <AnimatePresence initial={false}>
                      {policyOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }} className="overflow-hidden">
                          <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
                            Free cancellation ≥ 24h before your slot — your Vault payment is refunded (demo). Inside 24h the salon
                            may keep the payment to cover the reserved chair. No-shows are marked on your account.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button onClick={submitDetails} disabled={busy} className="btn btn-primary disabled:opacity-60">
                    {busy ? 'Issuing code…' : 'Get my payment code'} <ArrowRight size={15} />
                  </button>
                  <button onClick={() => setCancelOpen(true)} className="text-[12px] font-medium uppercase tracking-[.14em] underline-offset-4 hover:underline" style={{ color: 'var(--ysl-danger)' }}>
                    Cancel booking
                  </button>
                </div>
              </motion.section>
            )}

            {/* ─────────── Stage 3 · payment code ─────────── */}
            {(stage === 'pay' || stage === 'vault') && booking && code && (
              <motion.section
                key="pay"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: easeOut }}
              >
                <PaymentCodePanel
                  code={code}
                  holdEndsAt={booking.holdExpiresAt}
                  onPayVault={() => setStage('vault')}
                  onCancel={() => setCancelOpen(true)}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* ── sticky summary rail ── */}
        <SummaryCard
          salon={salon}
          service={service}
          dateIso={booking?.date ?? slot?.date ?? null}
          time={booking?.time ?? (slot?.time || null)}
          total={total}
          original={original}
          specialPct={specialPct}
          specialLocked={Boolean(booking?.specialId)}
          dimmed={holdExpired}
        />
      </div>

      {/* ── hold expired modal ── */}
      <Modal open={holdExpired} onClose={resetToSlots} title="Hold expired" locked>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
          Your 10-minute hold ran out and the slot was released. No charge was made — pick a new slot to try again.
        </p>
        <button onClick={resetToSlots} className="btn btn-primary mt-6 w-full">Pick a new slot</button>
      </Modal>

      {/* ── cancel confirm modal ── */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this booking?">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
          The held slot will be freed immediately and any issued payment code becomes void. You can book again anytime.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setCancelOpen(false)} className="btn btn-ghost flex-1">Keep booking</button>
          <button onClick={confirmCancel} className="btn flex-1" style={{ background: 'var(--ysl-danger)', color: '#fff' }}>
            Cancel booking
          </button>
        </div>
      </Modal>

      {/* ── Stage 4 · Vault overlay ── */}
      {booking && code && (
        <VaultOverlay
          open={stage === 'vault'}
          code={code}
          payerName={name || user?.name || 'YSL Customer'}
          payerEmail={email || user?.email || ''}
          onSuccess={() => navigate(`/booking/${booking.id}/status?paid=1`)}
          onFail={() => navigate(`/booking/${booking.id}/status?failed=1`)}
          onClose={() => setStage('pay')}
        />
      )}
    </div>
  );
}
